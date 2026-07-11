import express from "express";
import authRoutes from "./auth.js";
import podcastRoutes from "./podcasts.js";
import transcriptRoutes from "./transcripts.js";

const router = express.Router();

// Health check endpoint
router.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

router.use("/auth", authRoutes);
router.use("/transcripts", transcriptRoutes);
router.use("/podcasts", podcastRoutes);

export default router;
