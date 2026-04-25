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
  const { projectId, title, description, status, dueDate, durationDays, orderIndex } = req.body;

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
        durationDays: durationDays ?? 1,
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
  const { title, description, status, dueDate, durationDays, orderIndex } = req.body;

  if (!title && !description && !status && !dueDate && durationDays === undefined && orderIndex === undefined) {
    return res.status(400).json({
      success: false,
      error: "No valid fields provided for update",
    });
  }

  const updateData = {};

  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (dueDate) updateData.dueDate = dueDate;
  if (durationDays !== undefined) updateData.durationDays = durationDays;
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

const taskDependencyCreate = async (req, res) => {
  const { taskId } = req.params;
  const { dependsOnTaskId } = req.body;

  if (!dependsOnTaskId) return res.status(400).json({ success: false, error: "Missing dependsOnTaskId" });
  if (taskId === dependsOnTaskId) return res.status(400).json({ success: false, error: "Self-dependency not allowed" });

  try {
    const existing = await prisma.taskDependency.findFirst({ where: { taskId, dependsOnTaskId } });
    if (existing) return res.status(409).json({ success: false, error: "Dependency already exists" });

    const dep = await prisma.taskDependency.create({ data: { taskId, dependsOnTaskId } });
    res.status(201).json({ success: true, data: dep });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const taskDependencyDelete = async (req, res) => {
  const { depId } = req.params;
  try {
    await prisma.taskDependency.delete({ where: { id: depId } });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const ganttDataGet = async (req, res) => {
  const { projectId } = req.params;
  try {
    const tasks = await prisma.roadmapTask.findMany({
      where: { projectId },
      include: { dependencies: true },
    });

    const inDegree = {};
    const adj = {};
    const tasksMap = {};
    
    tasks.forEach(t => {
      inDegree[t.id] = 0;
      adj[t.id] = [];
      tasksMap[t.id] = { ...t, startDay: 0, endDay: t.durationDays || 1 };
    });

    tasks.forEach(t => {
      (t.dependencies || []).forEach(dep => {
        inDegree[t.id] = (inDegree[t.id] || 0) + 1;
        adj[dep.dependsOnTaskId] = adj[dep.dependsOnTaskId] || [];
        adj[dep.dependsOnTaskId].push(t.id);
      });
    });

    const queue = [];
    tasks.forEach(t => {
      if (inDegree[t.id] === 0) queue.push(t.id);
    });

    while (queue.length > 0) {
      const u = queue.shift();
      const uTask = tasksMap[u];
      
      (adj[u] || []).forEach(v => {
        const vTask = tasksMap[v];
        if (vTask.startDay < uTask.endDay) {
          vTask.startDay = uTask.endDay;
          vTask.endDay = vTask.startDay + (vTask.durationDays || 1);
        }
        
        inDegree[v]--;
        if (inDegree[v] === 0) queue.push(v);
      });
    }

    const result = Object.values(tasksMap).sort((a, b) => a.startDay - b.startDay || a.orderIndex - b.orderIndex);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  roadmapTaskCreate,
  roadmapTaskByProjectGet,
  roadmapTaskUpdate,
  roadmapTaskDelete,
  taskDependencyCreate,
  taskDependencyDelete,
  ganttDataGet,
};
