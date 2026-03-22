import Router from "express";

import aiController from "../controllers/aiController.js";
const aiRouter = Router();

aiRouter.post("/generate-planning", aiController.generatePlanning);

export default aiRouter;
