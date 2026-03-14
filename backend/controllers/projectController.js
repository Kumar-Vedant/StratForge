import prisma from "../db/prisma.js";

const projectGet = async (req, res) => {
  const { id } = req.params;

  try {
    const projectRecord = await prisma.project.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        owner: true,
      },
    });

    const { owner, ...project } = projectRecord;
    project.username = owner.username;

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error,
    });
  }
};

const projectUserGet = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameter: userId",
    });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        owner: { select: { username: true } },
        _count: {
          select: {
            roadmapTasks: true,
            milestones: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedProjects = projects.map(({ owner, ...rest }) => ({
      ...rest,
      username: owner.username,
    }));

    res.status(200).json({
      success: true,
      data: formattedProjects,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });
  }
};

const projectCreate = async (req, res) => {
  const { title, ownerId, description } = req.body;

  if (!title || !ownerId) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: 'title' and 'ownerId' are required.",
    });
  }

  try {
    const projectRecord = await prisma.project.create({
      data: {
        title: title,
        description: description,
        ownerId: ownerId,
      },
      include: {
        owner: {
          select: {
            username: true,
          },
        },
      },
    });

    const { owner, ...project } = projectRecord;
    project.username = owner.username;

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error,
    });
  }
};

const projectUpdate = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  if (!title && !description && !status) {
    return res.status(400).json({
      success: false,
      error: "No valid fields provided for update. Editable fields: 'title', 'description', 'status'",
    });
  }

  const updateData = {};

  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (status) updateData.status = status;

  try {
    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            username: true,
          },
        },
      },
    });

    const { owner, ...project } = projectRecord;
    project.username = owner.username;

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error,
    });
  }
};

const projectDelete = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.project.delete({
      where: {
        id: id,
      },
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
  projectGet,
  projectUserGet,
  projectCreate,
  projectUpdate,
  projectDelete,
};
