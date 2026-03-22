import prisma from "../db/prisma.js";
import { TaskStatus } from "../generated/prisma/client/index.js";

const roadmapTaskByProjectGet = async (req, res) => {
  const { projectId } = req.params;

  try {
    const tasks = await prisma.roadmapTask.findMany({
      where: { projectId },
      orderBy: {
        orderIndex: "asc",
      },
      include: {
        dependencies: true,
        dependedOnBy: true,
      },
    });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });
  }
};

const roadmapTaskCreate = async (req, res) => {
  const { projectId, title, description, status, dueDate, orderIndex } = req.body;

  if (!projectId || !title || !status || orderIndex === undefined) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: projectId, title, status, orderIndex",
    });
  }

  if (!Object.values(TaskStatus).includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${Object.values(TaskStatus).join(", ")}`,
    });
  }

  try {
    const task = await prisma.roadmapTask.create({
      data: {
        projectId,
        title,
        description,
        status: TaskStatus[status],
        dueDate,
        orderIndex,
      },
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });
  }
};

const roadmapTaskUpdate = async (req, res) => {
  const { id } = req.params;
  const { title, description, status, dueDate, orderIndex } = req.body;

  if (!title && !description && !status && !dueDate && orderIndex === undefined) {
    return res.status(400).json({
      success: false,
      error: "No valid fields provided for update",
    });
  }

  const updateData = {};

  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (dueDate) updateData.dueDate = dueDate;
  if (orderIndex !== undefined) updateData.orderIndex = orderIndex;

  if (status) {
    if (!Object.values(TaskStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(TaskStatus).join(", ")}`,
      });
    }
    updateData.status = TaskStatus[status];
  }

  try {
    const updatedTask = await prisma.roadmapTask.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });
  }
};

const roadmapTaskDelete = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.roadmapTask.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });
  }
};

export default {
  roadmapTaskCreate,
  roadmapTaskByProjectGet,
  roadmapTaskUpdate,
  roadmapTaskDelete,
};
