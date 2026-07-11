/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();

export const userService = {
  async createUser(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName: name,
        settings: {
          create: {
            theme: "light",
            defaultVoices: "alloy,echo,fable,onyx,nova",
          },
        },
      },
      include: {
        settings: true,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        settings: true,
      },
    });
  },

  async findUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
      },
    });

    if (!user) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateUser(id: string, data: any) {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        settings: true,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateUserSettings(userId: string, settings: any) {
    return prisma.userSettings.update({
      where: { userId },
      data: settings,
    });
  },
};

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "7d" },
    );

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  },

  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret-key",
      );
      return decoded;
    } catch (error) {
      throw new Error("Invalid token");
    }
  },
};

export const transcriptService = {
  async createTranscript(
    userId: string,
    _title: string,
    content: string,
    fileName: string,
  ) {
    return prisma.transcript.create({
      data: {
        userId,
        filename: fileName,
        content,
        fileSize: 0,
        mimeType: "text/plain",
      },
    });
  },

  async getUserTranscripts(userId: string) {
    return prisma.transcript.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getTranscriptById(id: string) {
    return prisma.transcript.findUnique({
      where: { id },
    });
  },

  async updateTranscript(id: string, data: any) {
    return prisma.transcript.update({
      where: { id },
      data,
    });
  },

  async deleteTranscript(id: string) {
    return prisma.transcript.delete({
      where: { id },
    });
  },
};

export const podcastService = {
  async createPodcast(
    userId: string,
    title: string,
    content: string,
    transcriptId?: string,
    voiceConfig?: string,
  ) {
    const data: any = {
      userId,
      title,
      content,
    };

    if (transcriptId) {
      data.transcriptId = transcriptId;
    }

    if (voiceConfig) {
      data.voiceConfig = voiceConfig;
    }

    return prisma.podcast.create({
      data,
    });
  },

  async getUserPodcasts(userId: string) {
    return prisma.podcast.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getPodcastById(id: string) {
    return prisma.podcast.findUnique({
      where: { id },
      include: {
        mediaFiles: true,
      },
    });
  },

  async getPodcastByTranscriptId(transcriptId: string) {
    return prisma.podcast.findUnique({
      where: { transcriptId },
      include: {
        mediaFiles: true,
      },
    });
  },

  async updatePodcast(id: string, data: any) {
    return prisma.podcast.update({
      where: { id },
      data,
    });
  },

  async deletePodcast(id: string) {
    return prisma.podcast.delete({
      where: { id },
    });
  },

  async savePodcastMedia(
    podcastId: string,
    filename: string,
    fileSize: number,
    mimeType: string = "audio/mpeg",
    speakerId?: string,
    segmentText?: string,
    duration?: number,
    storageKey?: string,
  ) {
    return prisma.podcastMedia.create({
      data: {
        podcastId,
        filename,
        fileSize,
        mimeType,
        speakerId,
        segmentText,
        duration,
        storageKey,
      },
    });
  },

  async getPodcastMediaFiles(podcastId: string) {
    return prisma.podcastMedia.findMany({
      where: { podcastId },
      orderBy: { createdAt: "asc" },
    });
  },

  async getPodcastMediaById(id: string) {
    return prisma.podcastMedia.findUnique({
      where: { id },
    });
  },

  async deletePodcastMedia(id: string) {
    return prisma.podcastMedia.delete({
      where: { id },
    });
  },
};

export default prisma;
