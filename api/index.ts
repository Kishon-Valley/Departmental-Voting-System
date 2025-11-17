// Vercel serverless function for API routes
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import session from "express-session";
import passport from "../server/auth/passport.js";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "../server/routes/auth.js";

// Initialize Express app (lazy initialization)
let app: express.Application | null = null;

async function getApp(): Promise<express.Application> {
  if (app) return app;

  app = express();

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    }),
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    });
    next();
  });

  // Register routes (without /api prefix - Vercel handles it)
  app.post("/auth/login", loginRoute);
  app.post("/auth/logout", logoutRoute);
  app.get("/auth/me", meRoute);
  app.put("/auth/profile", updateProfileRoute);

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
  
  // Convert Vercel request/response to Express-compatible format
  return new Promise<void>((resolve, reject) => {
    expressApp(req as any, res as any, (err?: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

