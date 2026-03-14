import Router from "express";

import planningtaskController from "../controllers/planningtaskController.js";
const planningtaskRouter = Router();

planningtaskRouter.get("/:projectId", planningtaskController.planningTaskByProjectGet);
planningtaskRouter.post("/create", planningtaskController.planningTaskCreate);
planningtaskRouter.put("/:id/update", planningtaskController.planningTaskUpdate);
planningtaskRouter.delete("/:id/delete", planningtaskController.planningTaskDelete);

export default planningtaskRouter;
