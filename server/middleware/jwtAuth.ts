import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { storage } from "../storage.js";

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export async function jwtAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // Check cookie as fallback
    if (!token && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies.token || cookies.session;
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Load user from database
    let user: any;
    if (payload.type === "student") {
      const student = await storage.getStudent(payload.id);
      if (!student) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...studentWithoutPassword } = student;
      user = studentWithoutPassword;
    } else if (payload.type === "admin") {
      const adminUser = await storage.getUser(payload.id);
      if (!adminUser) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = adminUser;
      user = { ...userWithoutPassword, type: "admin" };
    } else {
      return res.status(401).json({ message: "Invalid user type" });
    }

    // Attach user to request
    (req as any).user = user;
    (req as any).isAuthenticated = () => true;

    // Debug logging (remove in production if needed)
    if (process.env.NODE_ENV === "development") {
      console.log("JWT Auth successful:", { userId: user.id, userType: user.type || "unknown" });
    }

    next();
  } catch (error) {
    console.error("JWT auth error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Doesn't fail if token is missing, but attaches user if token is valid
 */
export async function optionalJwtAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // Check cookie as fallback
    if (!token && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies.token || cookies.session;
    }

    if (token) {
      // Verify token
      const payload = verifyToken(token);
      if (payload) {
        // Load user from database
        let user: any;
        if (payload.type === "student") {
          const student = await storage.getStudent(payload.id);
          if (student) {
            const { password: _, ...studentWithoutPassword } = student;
            user = studentWithoutPassword;
          }
        } else if (payload.type === "admin") {
          const adminUser = await storage.getUser(payload.id);
          if (adminUser) {
            const { password: _, ...userWithoutPassword } = adminUser;
            user = { ...userWithoutPassword, type: "admin" };
          }
        }

        if (user) {
          (req as any).user = user;
          (req as any).isAuthenticated = () => true;
        }
      }
    }

    next();
  } catch (error) {
    // Continue even if there's an error
    next();
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}

/**
 * Require admin authentication middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    const user = (req as any).user;
    if (user && user.type === "admin") {
      return next();
    }
    // Debug logging
    console.warn("Admin check failed:", { 
      hasUser: !!user, 
      userType: user?.type, 
      userId: user?.id 
    });
    return res.status(403).json({ message: "Admin access required" });
  }
  return res.status(401).json({ message: "Authentication required" });
}

/**
 * Parse cookies from cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.trim().split("=");
    if (parts.length === 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
    }
  });
  return cookies;
}


