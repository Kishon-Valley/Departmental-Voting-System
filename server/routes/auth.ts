import type { Express, Request, Response } from "express";
import passport from "../auth/passport.js";
import { loginStudentSchema } from "@shared/schema";
import { storage } from "../storage.js";
import { z } from "zod";

// Type augmentation for Express Request with user
declare global {
  namespace Express {
    interface User {
      id: string;
      indexNumber: string;
      fullName: string;
      email?: string | null;
      year?: string | null;
      profilePicture?: string | null;
      hasVoted: boolean;
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
  passport.authenticate("local-student", (err: any, user: Express.User, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        message: info?.message || "Authentication failed",
      });
    }

    // Log the user in
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      // Return user data (without password)
      return res.json({
        message: "Login successful",
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
    });
  })(req, res, next);
}

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export function logoutRoute(req: Request, res: Response) {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logout successful" });
  });
}

/**
 * Get current user endpoint
 * GET /api/auth/me
 */
export function meRoute(req: Request, res: Response) {
  if (req.isAuthenticated() && req.user) {
    const user = req.user;
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
  if (!req.isAuthenticated() || !req.user) {
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
    const updatedStudent = await storage.updateStudent(req.user.id, validation.data);
    
    // Update session user data
    req.user.fullName = updatedStudent.fullName;
    req.user.email = updatedStudent.email;
    req.user.year = updatedStudent.year;
    req.user.profilePicture = updatedStudent.profilePicture;

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
 */
export function requireAuth(req: Request, res: Response, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}

