import type { Express } from "express";
import { createServer, type Server } from "http";
import { loginRoute, logoutRoute, meRoute } from "./routes/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", loginRoute);
  app.post("/api/auth/logout", logoutRoute);
  app.get("/api/auth/me", meRoute);

  // Add more routes here as needed
  // All routes should be prefixed with /api

  const httpServer = createServer(app);

  return httpServer;
}
