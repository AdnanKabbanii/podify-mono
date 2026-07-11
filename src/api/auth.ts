import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { authService, userService } from "../services/database.js";

// Extend the Express Request interface
declare module "express" {
  interface Request {
    user?: { id: string };
    userId?: string;
  }
}

const router = express.Router();

// Register a new user
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "Email, password, and name are required" });
    }

    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Create user
    const user = await userService.createUser(email, password, name);

    // Generate token
    const token = authService.login(email, password);

    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
});

// Login user
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Login user
    const { user, token } = await authService.login(email, password);

    res.json({ user, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ message: "Invalid email or password" });
  }
});

// Get current user
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to get user" });
  }
});

// Update user
router.put("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    const userId = req.userId as string;

    // Update user
    const user = await userService.updateUser(userId, { name, email });

    res.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Update user settings
router.put("/me/settings", authenticate, async (req: Request, res: Response) => {
  try {
    const { theme, defaultVoices } = req.body;
    const userId = req.userId as string;

    // Update user settings
    const settings = await userService.updateUserSettings(userId, {
      theme,
      defaultVoices,
    });

    res.json({ settings });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

export default router;
