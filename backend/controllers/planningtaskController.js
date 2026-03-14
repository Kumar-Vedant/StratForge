import { prisma } from "../db/prisma.js";

const planningTaskByProjectGet = async (req, res) => {
  const { projectId } = req.params;

  try {
    const tasks = await prisma.planningTask.findMany({
      where: { projectId },
      orderBy: {
        createdAt: "asc",
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

const planningTaskCreate = async (req, res) => {
  const { projectId, title, description, source } = req.body;

  if (!projectId || !title || !source) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: projectId, title, source",
    });
  }

  try {
    const task = await prisma.planningTask.create({
      data: {
        projectId,
        title,
        description,
        source,
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

const planningTaskUpdate = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!title && !description) {
    return res.status(400).json({
      success: false,
      error: "No valid fields provided for update",
    });
  }

  const updateData = {};

  if (title) updateData.title = title;
  if (description) updateData.description = description;

  try {
    const updatedTask = await prisma.planningTask.update({
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

const planningTaskDelete = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.planningTask.delete({
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
  planningTaskCreate,
  planningTaskByProjectGet,
  planningTaskUpdate,
  planningTaskDelete,
};
