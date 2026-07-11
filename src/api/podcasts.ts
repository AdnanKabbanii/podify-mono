import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { podcastService } from "../services/database.js";

const router = express.Router();

// Get all podcasts for the current user
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const podcasts = await podcastService.getUserPodcasts(userId);

    res.json({ podcasts });
  } catch (error) {
    console.error("Get podcasts error:", error);
    res.status(500).json({ message: "Failed to get podcasts" });
  }
});

// Get a podcast by transcript ID
router.get("/transcript/:transcriptId", authenticate, async (req: Request, res: Response) => {
  try {
    const { transcriptId } = req.params;
    const userId = req.userId as string;

    const podcast = await podcastService.getPodcastByTranscriptId(transcriptId);

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    // ownership check
    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({ podcast });
  } catch (error) {
    console.error("Get podcast by transcript ID error:", error);
    res.status(500).json({ message: "Failed to get podcast" });
  }
});

// Get a podcast by ID
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    const podcast = await podcastService.getPodcastById(id);

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    // ownership check
    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({ podcast });
  } catch (error) {
    console.error("Get podcast error:", error);
    res.status(500).json({ message: "Failed to get podcast" });
  }
});

// Create a new podcast
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { title, content, transcriptId, voiceConfig } = req.body;
    const userId = req.userId as string;

    // Validate input
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    // Create podcast
    const podcast = await podcastService.createPodcast(
      userId,
      title,
      content,
      transcriptId || undefined,
      voiceConfig ? JSON.stringify(voiceConfig) : undefined,
    );

    res.status(201).json({ podcast });
  } catch (error) {
    console.error("Create podcast error:", error);
    res.status(500).json({ message: "Failed to create podcast" });
  }
});

// Update a podcast
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, voiceConfig } = req.body;
    const userId = req.userId as string;

    const podcast = await podcastService.getPodcastById(id);

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    // ownership check
    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update the podcast
    const updatedPodcast = await podcastService.updatePodcast(id, {
      title,
      content,
      voiceConfig: voiceConfig
        ? JSON.stringify(voiceConfig)
        : podcast.voiceConfig,
    });

    res.json({ podcast: updatedPodcast });
  } catch (error) {
    console.error("Update podcast error:", error);
    res.status(500).json({ message: "Failed to update podcast" });
  }
});

// Delete a podcast
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    const podcast = await podcastService.getPodcastById(id);

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    // ownership check
    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the podcast
    await podcastService.deletePodcast(id);

    res.json({ message: "Podcast deleted successfully" });
  } catch (error) {
    console.error("Delete podcast error:", error);
    res.status(500).json({ message: "Failed to delete podcast" });
  }
});

export default router;
