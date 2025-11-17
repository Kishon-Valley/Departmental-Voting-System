import "../env";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "./routes/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  // Note: In Vercel, /api prefix is handled by the platform
  // For local dev, we need /api prefix, but Vercel strips it
  const apiPrefix = process.env.VERCEL ? "" : "/api";
  
  app.post(`${apiPrefix}/auth/login`, loginRoute);
  app.post(`${apiPrefix}/auth/logout`, logoutRoute);
  app.get(`${apiPrefix}/auth/me`, meRoute);
  app.put(`${apiPrefix}/auth/profile`, updateProfileRoute);

  // Add more routes here as needed

  const httpServer = createServer(app);

  return httpServer;
}
