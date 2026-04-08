import Router from "express";

import aiController from "../controllers/aiController.js";
const aiRouter = Router();

aiRouter.post("/research-online", aiController.researchOnline);
aiRouter.post("/generate-roadmap", aiController.generateRoadmap);

export default aiRouter;
