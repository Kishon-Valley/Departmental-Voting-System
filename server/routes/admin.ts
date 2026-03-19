import type { Request, Response } from "express";
import passport from "../auth/passport.js";
import { insertStudentSchema, loginAdminSchema } from "../../shared/schema.js";
import { storage } from "../storage.js";
import { signToken } from "../utils/jwt.js";
import { z } from "zod";

// Type augmentation for Express Request with admin user
declare global {
  namespace Express {
    interface User {
      id: string;
      username?: string;
      indexNumber: string | undefined;
      fullName: string | undefined;
      type?: "admin" | "student";
      email?: string | null;
      year?: string | null;
      profilePicture?: string | null;
      hasVoted?: boolean;
    }
  }
}

/**
 * Admin login endpoint
 * POST /api/admin/login
 */
export function adminLoginRoute(req: Request, res: Response, next: any) {
  const validation = loginAdminSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: "Validation error",
      errors: validation.error.errors,
    });
  }

  passport.authenticate("local-admin", async (err: any, user: Express.User, info: any) => {
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
      type: "admin",
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
        username: user.username,
        type: "admin",
      },
    });
  })(req, res, next);
}

/**
 * Get current admin user
 * GET /api/admin/me
 */
export function adminMeRoute(req: Request, res: Response) {
  const user = (req as any).user;
  if (user && user.type === "admin") {
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        type: "admin",
      },
    });
  }
  return res.status(401).json({ message: "Not authenticated as admin" });
}

/**
 * Middleware to check if user is admin
 * Note: Use requireAdmin from server/middleware/jwtAuth.ts instead
 */
export function requireAdmin(req: Request, res: Response, next: any) {
  const user = (req as any).user;
  if (user && user.type === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * Get all students
 * GET /api/admin/students
 */
export async function getStudentsRoute(req: Request, res: Response) {
  try {
    const students = await storage.getAllStudents();
    // Remove passwords from response
    const studentsWithoutPasswords = students.map(({ password, ...student }) => student);
    return res.json({ students: studentsWithoutPasswords });
  } catch (error) {
    console.error("Error fetching students:", error);
    return res.status(500).json({
      message: "Failed to fetch students",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Create student
 * POST /api/admin/students
 */
export async function createStudentRoute(req: Request, res: Response) {
  try {
    const validation = insertStudentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const student = await storage.createStudent(validation.data);
    const { password, ...studentWithoutPassword } = student;
    return res.status(201).json({ student: studentWithoutPassword });
  } catch (error) {
    console.error("Error creating student:", error);
    return res.status(500).json({
      message: "Failed to create student",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Update election status
 * PUT /api/admin/elections/:id/status
 */
export async function updateElectionStatusRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["upcoming", "active", "closed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be 'upcoming', 'active', or 'closed'",
      });
    }

    const election = await storage.updateElectionStatus(id, status);
    return res.json({ election });
  } catch (error) {
    console.error("Error updating election status:", error);
    return res.status(500).json({
      message: "Failed to update election status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Update election dates
 * PUT /api/admin/elections/:id/dates
 */
export async function updateElectionDatesRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const schema = z.object({
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const election = await storage.updateElectionDates(
      id,
      validation.data.startDate ?? null,
      validation.data.endDate ?? null
    );
    return res.json({ election });
  } catch (error) {
    console.error("Error updating election dates:", error);
    return res.status(500).json({
      message: "Failed to update election dates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Create election
 * POST /api/admin/elections
 */
export async function createElectionRoute(req: Request, res: Response) {
  try {
    const schema = z.object({
      status: z.enum(["upcoming", "active", "closed"]),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const election = await storage.createElection(validation.data);
    return res.json({ election });
  } catch (error) {
    console.error("Error creating election:", error);
    return res.status(500).json({
      message: "Failed to create election",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Create position
 * POST /api/admin/positions
 */
export async function createPositionRoute(req: Request, res: Response) {
  try {
    const schema = z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().nullable().optional(),
      order: z.number().int().min(0),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const position = await storage.createPosition(validation.data);
    return res.json({ position });
  } catch (error) {
    console.error("Error creating position:", error);
    return res.status(500).json({
      message: "Failed to create position",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Update position
 * PUT /api/admin/positions/:id
 */
export async function updatePositionRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      order: z.number().int().min(0).optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const position = await storage.updatePosition(id, validation.data);
    return res.json({ position });
  } catch (error) {
    console.error("Error updating position:", error);
    return res.status(500).json({
      message: "Failed to update position",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Delete position
 * DELETE /api/admin/positions/:id
 */
export async function deletePositionRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await storage.deletePosition(id);
    return res.json({ message: "Position deleted successfully" });
  } catch (error) {
    console.error("Error deleting position:", error);
    return res.status(500).json({
      message: "Failed to delete position",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Create candidate
 * POST /api/admin/candidates
 */
export async function createCandidateRoute(req: Request, res: Response) {
  try {
    const schema = z.object({
      positionId: z.string().min(1, "Position ID is required"),
      name: z.string().min(1, "Name is required"),
      photoUrl: z.string().url().nullable().optional(),
      manifesto: z.string().nullable().optional(),
      bio: z.string().nullable().optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const candidate = await storage.createCandidate(validation.data);
    return res.json({ candidate });
  } catch (error) {
    console.error("Error creating candidate:", error);
    return res.status(500).json({
      message: "Failed to create candidate",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Update candidate
 * PUT /api/admin/candidates/:id
 */
export async function updateCandidateRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const schema = z.object({
      positionId: z.string().optional(),
      name: z.string().min(1).optional(),
      photoUrl: z.string().url().nullable().optional(),
      manifesto: z.string().nullable().optional(),
      bio: z.string().nullable().optional(),
    });

    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const candidate = await storage.updateCandidate(id, validation.data);
    return res.json({ candidate });
  } catch (error) {
    console.error("Error updating candidate:", error);
    return res.status(500).json({
      message: "Failed to update candidate",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Delete candidate
 * DELETE /api/admin/candidates/:id
 */
export async function deleteCandidateRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await storage.deleteCandidate(id);
    return res.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return res.status(500).json({
      message: "Failed to delete candidate",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get all votes (admin view)
 * GET /api/admin/votes
 */
export async function getAllVotesRoute(req: Request, res: Response) {
  try {
    const votes = await storage.getAllVotes();
    return res.json({ votes });
  } catch (error) {
    console.error("Error fetching votes:", error);
    return res.status(500).json({
      message: "Failed to fetch votes",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

