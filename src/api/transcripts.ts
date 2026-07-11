import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { transcriptService } from "../services/database.js";
import { processTranscript } from "../services/openai.js";

const router = express.Router();

// Get all transcripts for the current user
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const transcripts = await transcriptService.getUserTranscripts(userId);

    res.json({ transcripts });
  } catch (error) {
    console.error("Get transcripts error:", error);
    res.status(500).json({ message: "Failed to get transcripts" });
  }
});

// Get a transcript by ID
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    const transcript = await transcriptService.getTranscriptById(id);

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    // ownership check
    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json({ transcript });
  } catch (error) {
    console.error("Get transcript error:", error);
    res.status(500).json({ message: "Failed to get transcript" });
  }
});

// Create a new transcript
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { title, content, fileName } = req.body;
    const userId = req.userId as string;

    // Validate input
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    const transcript = await transcriptService.createTranscript(
      userId,
      title,
      content,
      fileName || "manual-entry.txt",
    );

    res.status(201).json({ transcript });
  } catch (error) {
    console.error("Create transcript error:", error);
    res.status(500).json({ message: "Failed to create transcript" });
  }
});

// Process a transcript with OpenAI
router.post("/:id/process", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    const transcript = await transcriptService.getTranscriptById(id);

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    // ownership check
    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Process the transcript
    const processedContent = await processTranscript(transcript.content || "");

    // Update the transcript with the processed content
    const updatedTranscript = await transcriptService.updateTranscript(id, {
      processed: true,
      processedAt: new Date(),
    });

    res.json({
      transcript: updatedTranscript,
      processedContent,
    });
  } catch (error) {
    console.error("Process transcript error:", error);
    res.status(500).json({ message: "Failed to process transcript" });
  }
});

// Update a transcript
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;
    const userId = req.userId as string;

    const transcript = await transcriptService.getTranscriptById(id);

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    // ownership check
    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update the transcript
    const updatedTranscript = await transcriptService.updateTranscript(id, {
      title,
      content,
      status,
    });

    res.json({ transcript: updatedTranscript });
  } catch (error) {
    console.error("Update transcript error:", error);
    res.status(500).json({ message: "Failed to update transcript" });
  }
});

// Delete a transcript
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;

    const transcript = await transcriptService.getTranscriptById(id);

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    // ownership check
    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    await transcriptService.deleteTranscript(id);

    res.json({ message: "Transcript deleted successfully" });
  } catch (error) {
    console.error("Delete transcript error:", error);
    res.status(500).json({ message: "Failed to delete transcript" });
  }
});

export default router;
