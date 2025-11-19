import "../env.js";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "./routes/auth.js";
import { uploadAvatarRoute, uploadMiddleware } from "./routes/upload.js";
import { getCandidatesRoute, getCandidateByIdRoute, getCandidatesByPositionRoute } from "./routes/candidates.js";
import { getPositionsRoute, getPositionByIdRoute } from "./routes/positions.js";
import { submitVotesRoute, getMyVotesRoute } from "./routes/votes.js";
import { getResultsRoute, getResultsByPositionRoute } from "./routes/results.js";
import { getElectionStatusRoute } from "./routes/election.js";
import { adminLoginRoute, adminMeRoute, requireAdmin, createElectionRoute, updateElectionStatusRoute, createPositionRoute, updatePositionRoute, deletePositionRoute, createCandidateRoute, updateCandidateRoute, deleteCandidateRoute, getAllVotesRoute, getStudentsRoute } from "./routes/admin.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  // Note: In Vercel, /api prefix is handled by the platform
  // For local dev, we need /api prefix, but Vercel strips it
  const apiPrefix = process.env.VERCEL ? "" : "/api";
  
  // Auth routes
  app.post(`${apiPrefix}/auth/login`, loginRoute);
  app.post(`${apiPrefix}/auth/logout`, logoutRoute);
  app.get(`${apiPrefix}/auth/me`, meRoute);
  app.put(`${apiPrefix}/auth/profile`, updateProfileRoute);
  app.post(`${apiPrefix}/auth/upload-avatar`, uploadMiddleware, uploadAvatarRoute);
  
  // Note: upload-avatar-base64 is handled in api/index.ts for Vercel compatibility

  // Candidate routes
  app.get(`${apiPrefix}/candidates`, getCandidatesRoute);
  app.get(`${apiPrefix}/candidates/position/:positionId`, getCandidatesByPositionRoute);
  app.get(`${apiPrefix}/candidates/:id`, getCandidateByIdRoute);

  // Position routes
  app.get(`${apiPrefix}/positions`, getPositionsRoute);
  app.get(`${apiPrefix}/positions/:id`, getPositionByIdRoute);

  // Vote routes
  app.post(`${apiPrefix}/votes`, submitVotesRoute);
  app.get(`${apiPrefix}/votes/my-votes`, getMyVotesRoute);

  // Results routes
  app.get(`${apiPrefix}/results`, getResultsRoute);
  app.get(`${apiPrefix}/results/position/:positionId`, getResultsByPositionRoute);

  // Election routes
  app.get(`${apiPrefix}/election/status`, getElectionStatusRoute);

  // Admin routes
  app.post(`${apiPrefix}/admin/login`, adminLoginRoute);
  app.get(`${apiPrefix}/admin/me`, adminMeRoute);
  
  // Protected admin routes
  app.post(`${apiPrefix}/admin/elections`, requireAdmin, createElectionRoute);
  app.put(`${apiPrefix}/admin/elections/:id/status`, requireAdmin, updateElectionStatusRoute);
  app.post(`${apiPrefix}/admin/positions`, requireAdmin, createPositionRoute);
  app.put(`${apiPrefix}/admin/positions/:id`, requireAdmin, updatePositionRoute);
  app.delete(`${apiPrefix}/admin/positions/:id`, requireAdmin, deletePositionRoute);
  app.post(`${apiPrefix}/admin/candidates`, requireAdmin, createCandidateRoute);
  app.put(`${apiPrefix}/admin/candidates/:id`, requireAdmin, updateCandidateRoute);
  app.delete(`${apiPrefix}/admin/candidates/:id`, requireAdmin, deleteCandidateRoute);
  app.get(`${apiPrefix}/admin/votes`, requireAdmin, getAllVotesRoute);
  app.get(`${apiPrefix}/admin/students`, requireAdmin, getStudentsRoute);

  const httpServer = createServer(app);

  return httpServer;
}
