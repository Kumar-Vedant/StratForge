import prisma from "../db/prisma.js";
import { TaskStatus } from "../generated/prisma/client/index.js";

const researchOnline = async (req, res) => {
  const { projectDescription } = req.body;

  if (!projectDescription) {
    return res.status(400).json({
      success: false,
      error: "Missing projectDescription",
    });
  }

  try {
    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
    const aiResponse = await fetch(`${aiUrl}/research-online`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectDescription }),
    });

    if (!aiResponse.ok) {
        throw new Error(`AI service responded with status ${aiResponse.status}`);
    }

    const data = await aiResponse.json();

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || error,
    });
  }
};

const generateRoadmap = async (req, res) => {
  const { projectId, projectDescription, suggestedTasks } = req.body;

  if (!projectDescription || !projectId) {
    return res.status(400).json({
      success: false,
      error: "Missing projectDescription or projectId",
    });
  }

  try {
    // 1. Call AI service to get DAG tasks
    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
    const aiResponse = await fetch(`${aiUrl}/generate-roadmap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectDescription, suggestedTasks: suggestedTasks || [] }),
    });

    if (!aiResponse.ok) {
        throw new Error(`AI service responded with status ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedTasks = aiData.tasks || [];

    // 2. Persist tasks and dependency edges in a single transaction
    const currentCount = await prisma.roadmapTask.count({ where: { projectId } });

    const savedTasks = await prisma.$transaction(async (tx) => {
      // Map from LLM index → DB record
      const indexToRecord = {};

      // Create all RoadmapTask rows first
      for (const task of generatedTasks) {
        const record = await tx.roadmapTask.create({
          data: {
            projectId,
            title: task.title || "Untitled Task",
            description: task.description || "",
            status: TaskStatus.TODO,
            orderIndex: currentCount + task.index,
            durationDays: task.estimated_duration_days || 1,
          },
        });
        indexToRecord[task.index] = record;
      }

      // Create TaskDependency edges
      for (const task of generatedTasks) {
        if (!task.depends_on || task.depends_on.length === 0) continue;
        for (const depIdx of task.depends_on) {
          const depRecord = indexToRecord[depIdx];
          if (!depRecord) continue;
          await tx.taskDependency.create({
            data: {
              taskId: indexToRecord[task.index].id,
              dependsOnTaskId: depRecord.id,
            },
          });
        }
      }

      // Return tasks with their dependency relations
      return tx.roadmapTask.findMany({
        where: { projectId },
        orderBy: { orderIndex: "asc" },
        include: {
          dependencies: true,
          dependedOnBy: true,
        },
      });
    });

    res.status(201).json({
      success: true,
      data: { tasks: savedTasks },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || error,
    });
  }
};

export default {
  researchOnline,
  generateRoadmap,
};
