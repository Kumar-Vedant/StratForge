import Router from "express";

import roadmaptaskController from "../controllers/roadmaptaskController.js";
const roadmaptaskRouter = Router();

roadmaptaskRouter.get("/:projectId", roadmaptaskController.roadmapTaskByProjectGet);
roadmaptaskRouter.post("/create", roadmaptaskController.roadmapTaskCreate);
roadmaptaskRouter.put("/:id/update", roadmaptaskController.roadmapTaskUpdate);
roadmaptaskRouter.delete("/:id/delete", roadmaptaskController.roadmapTaskDelete);

export default roadmaptaskRouter;
