// pnpm run simple-server
import { PrismaClient } from "@prisma/client";
import axios from 'axios';
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import fsPromises from "fs/promises";
import jwt from "jsonwebtoken";
import multer from 'multer';
import path from "path";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Constants for ElevenLabs API
const ELEVENLABS_API_ENDPOINT = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Default ElevenLabs voice
const MAX_CHARS_STARTER_TIER = 39932; // Character limit for starter tier

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create a temp directory if it doesn't exist
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const verifyElevenLabsApiKey = async () => {
  try {
    console.log('Verifying ElevenLabs API key...');
    const apiKey = process.env.VITE_ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      console.error('ElevenLabs API key is missing!');
      return false;
    }
    
    const response = await axios.get(`${ELEVENLABS_API_ENDPOINT}/user`, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (response.status === 200) {
      console.log('ElevenLabs API key is valid. User:', response.data.subscription?.tier || 'Free');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('ElevenLabs API key verification failed:', error.message);
    return false;
  }
};

// Verify API key on startup
verifyElevenLabsApiKey();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Add static file serving for podcast media
const mediaDir = path.join(__dirname, "media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
app.use("/media", express.static(mediaDir));

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret-key",
    );

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { settings: true },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { passwordHash, ...userWithoutPassword } = user;

    req.user = userWithoutPassword;
    req.userId = user.id;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("Registration request received:", req.body);
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      console.log("Validation failed: Email or password missing");
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("User already exists:", email);
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash password
    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log("Creating user...");
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        settings: {
          create: {
            defaultVoices: "alloy,echo,fable,onyx,nova",
            theme: "dark",
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // Generate token
    console.log("Generating token...");
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "7d" },
    );

    const { passwordHash, ...userWithoutPassword } = user;

    console.log("Registration successful:", userWithoutPassword.id);
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "7d" },
    );

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
});

app.get("/api/auth/me", authenticate, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to get user" });
  }
});

// Transcript routes
app.post("/api/transcripts", authenticate, async (req, res) => {
  try {
    const { title, content, fileName } = req.body;
    const userId = req.userId;

    // Validate input
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    // Create transcript
    const transcript = await prisma.transcript.create({
      data: {
        userId,
        filename: fileName || "manual-entry.txt",
        fileSize: content.length,
        mimeType: "text/plain",
        content,
        status: "UPLOADED",
      },
    });

    res.status(201).json({ transcript });
  } catch (error) {
    console.error("Create transcript error:", error);
    res.status(500).json({ message: "Failed to create transcript" });
  }
});

app.get("/api/transcripts", authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const transcripts = await prisma.transcript.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ transcripts });
  } catch (error) {
    console.error("Get transcripts error:", error);
    res.status(500).json({ message: "Failed to get transcripts" });
  }
});

app.get("/api/transcripts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('Fetching transcript by ID:', id);

    const transcript = await prisma.transcript.findUnique({
      where: { id },
      include: {
        podcast: {
          include: {
            mediaFiles: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        }
      }
    });

    if (!transcript) {
      console.log('Transcript not found:', id);
      return res.status(404).json({ message: "Transcript not found" });
    }

    console.log('Transcript found:', {
      id: transcript.id,
      hasContent: !!transcript.content,
      hasPodcast: !!transcript.podcast
    });

    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // If there's a podcast, parse its voiceConfig
    if (transcript.podcast?.voiceConfig) {
      try {
        transcript.podcast.voiceConfig = JSON.parse(transcript.podcast.voiceConfig);
      } catch (e) {
        console.error("Error parsing voiceConfig:", e);
      }
    }

    res.json({ 
      transcript: {
        ...transcript,
        content: transcript.content || ''
      }
    });
  } catch (error) {
    console.error("Get transcript error:", error);
    res.status(500).json({ message: "Failed to get transcript", error: error.message });
  }
});

// Update a transcript
app.put("/api/transcripts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;
    const userId = req.userId;

    const transcript = await prisma.transcript.findUnique({
      where: { id },
    });

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update the transcript
    const updatedTranscript = await prisma.transcript.update({
      where: { id },
      data: {
        title: title || transcript.title,
        content: content || transcript.content,
        status: status || transcript.status,
      },
    });

    res.json({ transcript: updatedTranscript });
  } catch (error) {
    console.error("Update transcript error:", error);
    res.status(500).json({ message: "Failed to update transcript" });
  }
});

// Delete a transcript
app.delete("/api/transcripts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const transcript = await prisma.transcript.findUnique({
      where: { id },
    });

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the transcript
    await prisma.transcript.delete({
      where: { id },
    });

    res.json({ message: "Transcript deleted successfully" });
  } catch (error) {
    console.error("Delete transcript error:", error);
    res.status(500).json({ message: "Failed to delete transcript" });
  }
});

// Podcast routes
app.post("/api/podcasts", authenticate, async (req, res) => {
  try {
    const { title, content, transcriptId, voiceConfig } = req.body;
    const userId = req.userId;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    // If transcriptId is provided, verify it exists and belongs to the user
    if (transcriptId) {
      const transcript = await prisma.transcript.findUnique({
        where: { id: transcriptId }
      });

      if (!transcript || transcript.userId !== userId) {
        return res.status(400).json({ message: "Invalid transcript ID" });
      }
    }

    // Create podcast
    const podcast = await prisma.podcast.create({
      data: {
        userId,
        title,
        content,
        transcriptId: transcriptId || undefined,
        voiceConfig: voiceConfig ? JSON.stringify(voiceConfig) : null,
      },
      include: {
        transcript: true,
        mediaFiles: true
      }
    });

    res.status(201).json({ podcast });
  } catch (error) {
    console.error("Create podcast error:", error);
    res.status(500).json({ message: "Failed to create podcast" });
  }
});

app.get("/api/podcasts", authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const podcasts = await prisma.podcast.findMany({
      where: { userId },
      include: {
        transcript: true,
        mediaFiles: true
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ podcasts });
  } catch (error) {
    console.error("Get podcasts error:", error);
    res.status(500).json({ message: "Failed to get podcasts" });
  }
});

app.get("/api/podcasts/transcript/:transcriptId", authenticate, async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const userId = req.userId;

    console.log('Fetching transcript:', transcriptId);

    // First fetch the transcript to ensure it exists and belongs to the user
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
      include: {
        podcast: {
          include: {
            mediaFiles: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        }
      }
    });

    if (!transcript) {
      console.log('Transcript not found:', transcriptId);
      return res.status(404).json({ message: "Transcript not found" });
    }

    console.log('Transcript found:', {
      id: transcript.id,
      hasContent: !!transcript.content,
      hasPodcast: !!transcript.podcast
    });

    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // If there's no podcast yet, return just the transcript
    if (!transcript.podcast) {
      return res.json({ 
        transcript,
        message: "No podcast found for this transcript"
      });
    }

    // Parse voiceConfig if it exists
    if (transcript.podcast.voiceConfig) {
      try {
        transcript.podcast.voiceConfig = JSON.parse(transcript.podcast.voiceConfig);
      } catch (e) {
        console.error("Error parsing voiceConfig:", e);
      }
    }

    res.json({ 
      transcript: {
        ...transcript,
        content: transcript.content || ''
      },
      podcast: transcript.podcast 
    });
  } catch (error) {
    console.error("Get podcast by transcript ID error:", error);
    res.status(500).json({ message: "Failed to get podcast", error: error.message });
  }
});

app.get("/api/podcasts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const podcast = await prisma.podcast.findUnique({
      where: { id },
      include: {
        transcript: {
          select: {
            id: true,
            content: true,
            status: true,
            filename: true,
            fileSize: true,
            createdAt: true,
            updatedAt: true
          }
        },
        mediaFiles: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Parse the voiceConfig if it exists
    if (podcast.voiceConfig) {
      try {
        podcast.voiceConfig = JSON.parse(podcast.voiceConfig);
      } catch (e) {
        console.error("Error parsing voiceConfig:", e);
      }
    }

    res.json({ 
      podcast,
      transcript: podcast.transcript 
    });
  } catch (error) {
    console.error("Get podcast error:", error);
    res.status(500).json({ message: "Failed to get podcast" });
  }
});

app.put("/api/podcasts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, voiceConfig } = req.body;
    const userId = req.userId;

    console.log(`Updating podcast ${id} with new content`);

    const podcast = await prisma.podcast.findUnique({
      where: { id },
      include: {
        transcript: true,
      },
    });

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Validate the content format
    if (content) {
      const contentLines = content.split("\n\n");
      const isValidFormat = contentLines.every((line) => {
        return line.includes(": ") && line.split(": ").length >= 2;
      });

      if (!isValidFormat) {
        return res.status(400).json({
          message:
            'Invalid content format. Each line must be in the format "Speaker: Text"',
        });
      }
    }

    // Update the podcast
    const updatedPodcast = await prisma.podcast.update({
      where: { id },
      data: {
        title: title || podcast.title,
        content: content || podcast.content,
        voiceConfig: voiceConfig
          ? JSON.stringify(voiceConfig)
          : podcast.voiceConfig,
      },
    });
    if (podcast.transcript && podcast.transcript.status !== "PROCESSED") {
      await prisma.transcript.update({
        where: { id: podcast.transcriptId },
        data: {
          status: "PROCESSED",
        },
      });
    }

    console.log(`Podcast ${id} updated successfully`);

    res.json({
      podcast: updatedPodcast,
      message: "Podcast updated successfully",
    });
  } catch (error) {
    console.error("Update podcast error:", error);
    res.status(500).json({ message: "Failed to update podcast" });
  }
});

app.delete("/api/podcasts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const podcast = await prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the podcast
    await prisma.podcast.delete({
      where: { id },
    });

    res.json({ message: "Podcast deleted successfully" });
  } catch (error) {
    console.error("Delete podcast error:", error);
    res.status(500).json({ message: "Failed to delete podcast" });
  }
});

// Update transcript content
app.put("/api/transcripts/:id/content", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const transcript = await prisma.transcript.findUnique({
      where: { id }
    });

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updatedTranscript = await prisma.transcript.update({
      where: { id },
      data: { 
        content,
        status: 'PROCESSED'
      },
      include: {
        podcast: {
          include: {
            mediaFiles: true
          }
        }
      }
    });

    res.json({ transcript: updatedTranscript });
  } catch (error) {
    console.error("Update transcript content error:", error);
    res.status(500).json({ message: "Failed to update transcript content" });
  }
});

// Get available voices
app.get("/api/voices", async (req, res) => {
  try {
    console.log('Fetching ElevenLabs voices with axios...');
    
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY
      }
    });
    
    if (!response.data || !response.data.voices) {
      throw new Error('Invalid response format from ElevenLabs API');
    }
    
    console.log(`Fetched ${response.data.voices.length} voices`);
    
    // Format the response to ensure consistent structure
    const voices = response.data.voices.map(voice => ({
      voice_id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url,
      // Add any additional fields you need
    }));
    
    res.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch voices',
      error: error.message,
      voices: [] // Return empty array instead of undefined
    });
  }
});

// Add this endpoint before the TTS endpoint
app.get("/api/elevenlabs/user-info", async (req, res) => {
  try {
    console.log('Fetching ElevenLabs user info with axios...');
    
    const response = await axios.get('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY
      }
    });
    
    // Format the response to match what the client expects
    const userInfo = {
      subscription: {
        tier: response.data.subscription?.tier || 'free',
        character_count: response.data.subscription?.character_count || 0,
        character_limit: response.data.subscription?.character_limit || 10000,
        status: 'active'
      }
    };
    
    console.log('User info formatted:', userInfo);
    res.json({ userInfo });
  } catch (error) {
    console.error('Error fetching user info:', error.message);
    
    // Return a fallback user info object with the same structure
    res.status(500).json({
      userInfo: {
        subscription: {
          tier: 'free',
          character_count: 0,
          character_limit: 10000,
          status: 'error'
        }
      }
    });
  }
});

// Add a function to get the user's character limit
const getUserCharacterLimit = async () => {
  try {
    const response = await axios.get(`${ELEVENLABS_API_ENDPOINT}/user`, {
      headers: {
        'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY
      }
    });
    
    if (response.data && response.data.subscription && response.data.subscription.character_limit) {
      return response.data.subscription.character_limit;
    }
    
    // Default to starter tier if we can't get the actual limit
    return MAX_CHARS_STARTER_TIER;
  } catch (error) {
    console.error('Error getting character limit:', error.message);
    return MAX_CHARS_STARTER_TIER; // Default fallback
  }
};

// Text-to-Speech endpoint
app.post("/api/tts", async (req, res) => {
  try {
    console.log("TTS endpoint called");
    const { text, voiceId = DEFAULT_VOICE_ID } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    // Get the user's character limit
    const characterLimit = await getUserCharacterLimit();
    
    // Enforce character limit
    if (text.length > characterLimit) {
      console.log(`Text length ${text.length} exceeds character limit of ${characterLimit}`);
      return res.status(400).json({
        message: `Text length exceeds limit of ${characterLimit} characters`,
        error: "Character limit exceeded"
      });
    }

    // Create temp directory if it doesn't exist
    const tempDir = './temp_audio';
    await fsPromises.mkdir(tempDir, { recursive: true });
    
    // Generate unique filename
    const fileName = `${uuidv4()}.mp3`;
    const filePath = `${tempDir}/${fileName}`;

    try {
      console.log(`Generating TTS for voice ${voiceId} with text length: ${text.length}`);
      
      const response = await axios({
        method: 'post',
        url: `${ELEVENLABS_API_ENDPOINT}/text-to-speech/${voiceId}`,
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.VITE_ELEVENLABS_API_KEY
        },
        data: {
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
            speed: 1.0
          }
        },
        responseType: 'arraybuffer'
      });

      // Write audio file
      await fsPromises.writeFile(filePath, response.data);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Failed to create audio file');
      }

      // Read and send the audio
      const audioBuffer = await fsPromises.readFile(filePath);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      
      // Send the buffer directly
      res.send(audioBuffer);

      // Cleanup
      await fsPromises.unlink(filePath);
      console.log(`Generated and sent audio file (${audioBuffer.length} bytes)`);

    } catch (apiError) {
      console.error("ElevenLabs API error:", apiError.message);
      
      let statusCode = 500;
      let errorMessage = "Failed to generate speech";

      if (apiError.response) {
        const { status, data } = apiError.response;
        
        switch (status) {
          case 401:
            statusCode = 401;
            errorMessage = "Invalid API key";
            break;
          case 429:
            statusCode = 429;
            errorMessage = "Rate limit exceeded";
            break;
          case 403:
            statusCode = 403;
            errorMessage = "Access denied or unusual activity detected";
            break;
          default:
            if (data && typeof data === 'string') {
              try {
                const parsedData = JSON.parse(data.toString());
                errorMessage = parsedData.detail?.message || parsedData.message || errorMessage;
              } catch (e) {
                console.error("Error parsing API error response:", e);
              }
            }
        }
      }

      return res.status(statusCode).json({
        message: errorMessage,
        error: apiError.message
      });
    }

  } catch (error) {
    console.error("Text-to-speech error:", error);
    res.status(500).json({
      message: "Failed to generate speech",
      error: error.message
    });
  }
});

// Clone voice endpoint
app.post("/api/voices/clone", authenticate, async (req, res) => {
  try {
    const { name, description, files } = req.body;

    if (!name || !files || files.length === 0) {
      return res.status(400).json({ message: "Name and audio files are required" });
    }

    const voiceData = await elevenLabs.addVoice({
      name,
      description: description || `Cloned voice: ${name}`,
      files
    });

    res.status(201).json({ voice: voiceData });
  } catch (error) {
    console.error("Voice cloning error:", error);
    res.status(500).json({ message: "Failed to clone voice" });
  }
});

// Delete voice endpoint
app.delete("/api/voices/:voiceId", authenticate, async (req, res) => {
  try {
    const { voiceId } = req.params;
    await elevenLabs.deleteVoice(voiceId);
    res.json({ message: "Voice deleted successfully" });
  } catch (error) {
    console.error("Delete voice error:", error);
    res.status(500).json({ message: "Failed to delete voice" });
  }
});

// Podcast media routes
app.post("/api/podcasts/:id/media", authenticate, upload.single("audioFile"), async (req, res) => {
  try {
    const { id } = req.params;
    const { speakerId, segmentText, duration } = req.body;
    const userId = req.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const podcast = await prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Create directory for podcast media if it doesn't exist
    const podcastDir = path.join(mediaDir, "podcasts", id);
    if (!fs.existsSync(podcastDir)) {
      fs.mkdirSync(podcastDir, { recursive: true });
    }

    // Save the file
    const filename = file.originalname || `segment_${Date.now()}.mp3`;
    const filePath = path.join(podcastDir, filename);
    
    // If file was saved by multer to a temp location, move it
    if (file.path) {
      fs.renameSync(file.path, filePath);
    }
    
    // Create relative path for storage key
    const storageKey = path.join("podcasts", id, filename).replace(/\\/g, "/");

    // Save media file record in database
    const mediaFile = await prisma.podcastMedia.create({
      data: {
        podcastId: id,
        filename,
        fileSize: file.size,
        mimeType: file.mimetype || "audio/mpeg",
        speakerId: speakerId || null,
        segmentText: segmentText || null,
        duration: duration ? parseInt(duration) : null,
        storageKey,
      },
    });

    res.status(201).json({ mediaFile });
  } catch (error) {
    console.error("Save podcast media error:", error);
    res.status(500).json({ message: "Failed to save podcast media" });
  }
});

// Save podcast media from blob data
app.post("/api/podcasts/:id/media/blob", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      audioBlob, 
      filename, 
      fileSize, 
      mimeType = "audio/mpeg", 
      speakerId, 
      segmentText, 
      duration 
    } = req.body;
    const userId = req.userId;

    if (!audioBlob) {
      return res.status(400).json({ message: "No audio data provided" });
    }

    const podcast = await prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Create directory for podcast media if it doesn't exist
    const podcastDir = path.join(mediaDir, "podcasts", id);
    if (!fs.existsSync(podcastDir)) {
      fs.mkdirSync(podcastDir, { recursive: true });
    }

    // Convert base64 to buffer
    const audioData = audioBlob.split(';base64,').pop();
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Save the file
    const safeFilename = filename || `segment_${Date.now()}.mp3`;
    const filePath = path.join(podcastDir, safeFilename);
    fs.writeFileSync(filePath, audioBuffer);
    
    // Create relative path for storage key
    const storageKey = path.join("podcasts", id, safeFilename).replace(/\\/g, "/");

    // Save media file record in database
    const mediaFile = await prisma.podcastMedia.create({
      data: {
        podcastId: id,
        filename: safeFilename,
        fileSize: fileSize || audioBuffer.length,
        mimeType,
        speakerId: speakerId || null,
        segmentText: segmentText || null,
        duration: duration ? parseInt(duration) : null,
        storageKey,
      },
    });

    res.status(201).json({ 
      mediaFile,
      url: `/media/${storageKey}`
    });
  } catch (error) {
    console.error("Save podcast media blob error:", error);
    res.status(500).json({ message: "Failed to save podcast media" });
  }
});

// Get all media files for a podcast
app.get("/api/podcasts/:id/media", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const podcast = await prisma.podcast.findUnique({
      where: { id },
    });

    if (!podcast) {
      return res.status(404).json({ message: "Podcast not found" });
    }

    if (podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Get all media files for the podcast
    const mediaFiles = await prisma.podcastMedia.findMany({
      where: { podcastId: id },
      orderBy: { createdAt: "asc" },
    });

    // Add URLs to the media files
    const mediaFilesWithUrls = mediaFiles.map(file => ({
      ...file,
      url: file.storageKey ? `/media/${file.storageKey}` : null
    }));

    res.json({ mediaFiles: mediaFilesWithUrls });
  } catch (error) {
    console.error("Get podcast media error:", error);
    res.status(500).json({ message: "Failed to get podcast media" });
  }
});

// Get a specific media file
app.get("/api/podcasts/media/:mediaId", authenticate, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.userId;

    // Get the media file
    const mediaFile = await prisma.podcastMedia.findUnique({
      where: { id: mediaId },
      include: { podcast: true },
    });

    if (!mediaFile) {
      return res.status(404).json({ message: "Media file not found" });
    }

    if (mediaFile.podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Add URL to the media file
    const mediaFileWithUrl = {
      ...mediaFile,
      url: mediaFile.storageKey ? `/media/${mediaFile.storageKey}` : null
    };

    res.json({ mediaFile: mediaFileWithUrl });
  } catch (error) {
    console.error("Get podcast media file error:", error);
    res.status(500).json({ message: "Failed to get podcast media file" });
  }
});

// Delete a media file
app.delete("/api/podcasts/media/:mediaId", authenticate, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.userId;

    // Get the media file
    const mediaFile = await prisma.podcastMedia.findUnique({
      where: { id: mediaId },
      include: { podcast: true },
    });

    if (!mediaFile) {
      return res.status(404).json({ message: "Media file not found" });
    }

    if (mediaFile.podcast.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete the file from the filesystem if it exists
    if (mediaFile.storageKey) {
      const filePath = path.join(mediaDir, mediaFile.storageKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete the media file record from the database
    await prisma.podcastMedia.delete({
      where: { id: mediaId },
    });

    res.json({ message: "Media file deleted successfully" });
  } catch (error) {
    console.error("Delete podcast media error:", error);
    res.status(500).json({ message: "Failed to delete podcast media" });
  }
});

// Agent API endpoints
app.post("/api/agent/query", authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    // Get user information
    const user = req.user;
    
    // Log the agent query
    console.log(`Agent query from user ${user.id}: ${query}`);
    
    const response = {
      message: "Agent support is handled on the client.",
      suggestedActions: []
    };
    
    return res.json(response);
  } catch (error) {
    console.error("Error in agent query:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/agent/action", authenticate, async (req, res) => {
  try {
    const { actionType, params } = req.body;
    
    if (!actionType) {
      return res.status(400).json({ error: "Action type is required" });
    }
    
    // Get user information
    const user = req.user;
    
    // Log the agent action
    console.log(`Agent action from user ${user.id}: ${actionType}`, params);
    
    let result;
    
    switch (actionType) {
      case "navigate":
        // Navigation is handled client-side
        result = { success: true, message: "Navigation request received" };
        break;
        
      case "upload":
        if (!params.fileContent) {
          return res.status(400).json({ error: "File content is required for upload" });
        }
        
        result = { 
          success: true, 
          message: "File uploaded successfully", 
          data: { 
            transcriptId: "agent-generated-" + Date.now(),
            name: params.fileName || "Agent uploaded file"
          }
        };
        break;
        
      case "process":
        if (!params.transcriptId) {
          return res.status(400).json({ error: "Transcript ID is required for processing" });
        }
        
        result = { 
          success: true, 
          message: "Podcast processing initiated", 
          data: { 
            podcastId: "agent-generated-" + Date.now(),
            status: "processing"
          }
        };
        break;
        
      case "download":
        if (!params.podcastId) {
          return res.status(400).json({ error: "Podcast ID is required for download" });
        }
        
        result = { 
          success: true, 
          message: "Download link generated", 
          data: { 
            downloadUrl: `/media/podcasts/${params.podcastId}.mp3`
          }
        };
        break;
        
      case "delete":
        if (!params.itemId || !params.itemType) {
          return res.status(400).json({ 
            error: "Item ID and type are required for deletion" 
          });
        }
        
        result = { 
          success: true, 
          message: `${params.itemType} deleted successfully`, 
          data: { itemId: params.itemId }
        };
        break;
        
      default:
        return res.status(400).json({ error: `Unknown action type: ${actionType}` });
    }
    
    return res.json(result);
  } catch (error) {
    console.error("Error in agent action:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
