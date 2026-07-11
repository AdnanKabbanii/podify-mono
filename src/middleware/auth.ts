/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { authService, userService } from "../services/database.js";
import "express";
declare module "express" {
  interface Request {
    user?: { id: string };
    userId?: string;
  }
}
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = authService.verifyToken(token) as { userId: string };
    const user = await userService.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const optionalAuthenticate = async (
  req: Request,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = authService.verifyToken(token) as { userId: string };
    const user = await userService.findUserById(decoded.userId);

    if (user) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    next();
  }
};
