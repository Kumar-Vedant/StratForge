import Router from "express";

import projectController from "../controllers/projectController.js";
const projectRouter = Router();

projectRouter.get("/:id", projectController.projectGet);
projectRouter.get("/user/:userId", projectController.projectUserGet);
projectRouter.post("/create", projectController.projectCreate);
projectRouter.put("/:id/update", projectController.projectUpdate);
projectRouter.delete("/:id/delete", projectController.projectDelete);

export default projectRouter;
