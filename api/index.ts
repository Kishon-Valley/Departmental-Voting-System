// Vercel serverless function for API routes
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cookieSession from "cookie-session";
import passport from "../server/auth/passport.js";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "../server/routes/auth.js";
import { uploadAvatarRoute, uploadMiddleware } from "../server/routes/upload.js";

// Initialize Express app (lazy initialization)
let app: express.Application | null = null;

async function getApp(): Promise<express.Application> {
  if (app) return app;

  app = express();

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Cookie-session configuration
  app.use(
    cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "change-me"],
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    }),
  );

  // Initialize Passport
  // Patch cookie-session so Passport can call req.session.regenerate/destroy
  app.use((req, _res, next) => {
    if (req.session && typeof (req.session as any).regenerate !== 'function') {
      (req.session as any).regenerate = (cb?: (err?: any) => void) => cb?.();
    }
    if (req.session && typeof (req.session as any).destroy !== 'function') {
      (req.session as any).destroy = (cb?: (err?: any) => void) => {
        req.session = null as any;
        cb?.();
      };
    }
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware to strip /api prefix if present (for Vercel compatibility)
  app.use((req, res, next) => {
    if (req.url?.startsWith('/api/')) {
      req.url = req.url.replace('/api', '');
    }
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.url} ${res.statusCode} in ${Date.now() - start}ms`);
    });
    next();
  });

  // Register routes (without /api prefix - Vercel handles it)
  // Also register with /api prefix as fallback
  app.post("/auth/login", loginRoute);
  app.post("/api/auth/login", loginRoute);
  app.post("/auth/logout", logoutRoute);
  app.post("/api/auth/logout", logoutRoute);
  app.get("/auth/me", meRoute);
  app.get("/api/auth/me", meRoute);
  app.put("/auth/profile", updateProfileRoute);
  app.put("/api/auth/profile", updateProfileRoute);
  app.post("/auth/upload-avatar", uploadMiddleware, uploadAvatarRoute);
  app.post("/api/auth/upload-avatar", uploadMiddleware, uploadAvatarRoute);

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
}

// Export as Vercel serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getApp();
  
  // Log the incoming request for debugging
  console.log('Vercel request:', {
    method: req.method,
    url: req.url,
    path: (req as any).path,
    query: req.query,
  });
  
  // Extract the path from Vercel's request
  // When using rewrites, req.url contains the full path including /api
  let path = req.url || '';
  
  // Vercel rewrite pattern: /api/(.*) -> /api/index.js
  // The original path should be in req.url
  // If it starts with /api, we can keep it or strip it (routes handle both)
  
  // Create a proper Express-compatible request object
  const expressReq = {
    ...req,
    method: req.method,
    url: path,
    originalUrl: path,
    path: path.split('?')[0], // Remove query string
    query: req.query || {},
    body: req.body,
    headers: req.headers,
    cookies: req.cookies,
    ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
    protocol: req.headers['x-forwarded-proto'] || 'https',
    hostname: req.headers.host,
    get: (name: string) => req.headers[name.toLowerCase()],
    header: (name: string) => req.headers[name.toLowerCase()],
    isAuthenticated: () => {
      return !!(req as any).user;
    },
    user: (req as any).user,
    logIn: (req as any).logIn,
    logOut: (req as any).logOut,
    login: (req as any).login,
    logout: (req as any).logout,
  } as any;
  
  // Convert Vercel request/response to Express-compatible format
  return new Promise<void>((resolve, reject) => {
    expressApp(expressReq, res as any, (err?: any) => {
      if (err) {
        console.error('Express error:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

