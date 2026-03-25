import express from "express";
import cors from "cors";
import helmet from "helmet";

import { PORT } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import authRouter from "./modules/auth/auth.router.js";
import detectionRouter from "./modules/detection/detection.router.js";
import timelineLogRouter from "./modules/timeline-log/timeline-log.router.js";
import zonaRouter from "./modules/zona/zona.router.js";
import cctvRouter from "./modules/cctv/cctv.router.js";
import { startFlushIntervals } from "./modules/detection/detection.service.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/detection", detectionRouter);
app.use("/api/timeline-log", timelineLogRouter);
app.use("/api/zona", zonaRouter);
app.use("/api/cctv", cctvRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startFlushIntervals();
});

export default app;
