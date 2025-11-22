import type { Express, Request, Response } from "express";
import passport from "../auth/passport.js";
import { loginStudentSchema } from "../../shared/schema.js";
import { storage } from "../storage.js";
import { signToken } from "../utils/jwt.js";
import { z } from "zod";

// Type augmentation for Express Request with user
declare global {
  namespace Express {
    interface User {
      id: string;
      indexNumber: string | undefined;
      fullName: string | undefined;
      username?: string;
      email?: string | null;
      year?: string | null;
      profilePicture?: string | null;
      hasVoted?: boolean;
      type?: "admin" | "student";
    }
  }
}

/**
 * Login endpoint - Authenticate student with index number and password
 * POST /api/auth/login
 */
export function loginRoute(req: Request, res: Response, next: any) {
  // Validate request body
  const validation = loginStudentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: "Validation error",
      errors: validation.error.errors,
    });
  }

  // Use Passport to authenticate
  passport.authenticate("local-student", async (err: any, user: Express.User, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        message: info?.message || "Authentication failed",
      });
    }

    // Generate JWT token
    const token = signToken({
      id: user.id,
      type: "student",
    });

    // Set token in HTTP-only cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });

    // Return user data and token
    return res.json({
      message: "Login successful",
      token, // Also return token in response for client-side storage if needed
      user: {
        id: user.id,
        indexNumber: user.indexNumber,
        fullName: user.fullName,
        email: user.email,
        year: user.year,
        profilePicture: user.profilePicture,
        hasVoted: user.hasVoted,
      },
    });
  })(req, res, next);
}

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export function logoutRoute(req: Request, res: Response) {
  // Clear token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  
  res.json({ message: "Logout successful" });
}

/**
 * Get current user endpoint
 * GET /api/auth/me
 * Requires JWT authentication middleware
 */
export function meRoute(req: Request, res: Response) {
  const user = (req as any).user;
  if (user) {
    return res.json({
      user: {
        id: user.id,
        indexNumber: user.indexNumber,
        fullName: user.fullName,
        email: user.email,
        year: user.year,
        profilePicture: user.profilePicture,
        hasVoted: user.hasVoted,
      },
    });
  }
  return res.status(401).json({ message: "Not authenticated" });
}

/**
 * Update student profile endpoint
 * PUT /api/auth/profile
 */
export async function updateProfileRoute(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Validate request body
  const updateSchema = z.object({
    fullName: z.string().min(1, "Full name is required").optional(),
    email: z.string().email().nullable().optional(),
    year: z.string().nullable().optional(),
    profilePicture: z.string().url().nullable().optional(),
  });

  const validation = updateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: "Validation error",
      errors: validation.error.errors,
    });
  }

  try {
    const updatedStudent = await storage.updateStudent(user.id, validation.data);

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedStudent.id,
        indexNumber: updatedStudent.indexNumber,
        fullName: updatedStudent.fullName,
        email: updatedStudent.email,
        year: updatedStudent.year,
        profilePicture: updatedStudent.profilePicture,
        hasVoted: updatedStudent.hasVoted,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Middleware to check if user is authenticated
 * Note: Use jwtAuth middleware from server/middleware/jwtAuth.ts instead
 */
export function requireAuth(req: Request, res: Response, next: any) {
  const user = (req as any).user;
  if (user && (req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}

