import Router from "express";

import roadmaptaskController from "../controllers/roadmaptaskController.js";
const roadmaptaskRouter = Router();

roadmaptaskRouter.get("/:projectId/gantt", roadmaptaskController.ganttDataGet);
roadmaptaskRouter.get("/:projectId", roadmaptaskController.roadmapTaskByProjectGet);
roadmaptaskRouter.post("/create", roadmaptaskController.roadmapTaskCreate);
roadmaptaskRouter.put("/:id/update", roadmaptaskController.roadmapTaskUpdate);
roadmaptaskRouter.delete("/:id/delete", roadmaptaskController.roadmapTaskDelete);
roadmaptaskRouter.post("/:taskId/dependency", roadmaptaskController.taskDependencyCreate);
roadmaptaskRouter.delete("/dependency/:depId", roadmaptaskController.taskDependencyDelete);

export default roadmaptaskRouter;
