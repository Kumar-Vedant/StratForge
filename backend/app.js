import "dotenv/config";
import cors from "cors";

import path from "node:path";
import express from "express";

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const app = express();
app.use(cors());

import userRouter from "./routes/userRouter.js";
import authRouter from "./routes/authRouter.js";
import projectRouter from "./routes/projectRouter.js";
import roadmaptaskRouter from "./routes/roadmaptaskRouter.js";
import planningtaskRouter from "./routes/planningtaskRouter.js";
import aiRouter from "./routes/aiRouter.js";
// import indexRouter from "./routes/indexRouter.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(express.static(path.join(__dirname, "public")));

// app.use("/", indexRouter);
app.use("/user", userRouter);
app.use("/auth", authRouter);
app.use("/project", projectRouter);
app.use("/roadmaptask", roadmaptaskRouter);
app.use("/planningtask", planningtaskRouter);
app.use("/ai", aiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Express app listening on port ${PORT}!`));
