import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ceoRouter from "./routes/ceoRoutes";
import hrRouter from "./routes/hrRoutes";
import adminRouter from "./routes/adminRoutes";
import employeeRouter from "./routes/employeeRoutes";
import managerRouter from "./routes/managerRoutes";
import workflowEngineRouter from "./routes/workflowEngineRoutes";
import indexRouter from "./routes/index";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/ceo", ceoRouter);
app.use("/api/hr", hrRouter);
app.use("/api/admin", adminRouter);
app.use("/api/employee", employeeRouter);
app.use("/api/manager", managerRouter);
app.use("/api/workflow", workflowEngineRouter);
app.use("/api", indexRouter);

const PORT = process.env.BACKEND_PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`CEO backend listening on port ${PORT}`);
});

