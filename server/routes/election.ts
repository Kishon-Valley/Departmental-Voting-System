import type { Request, Response } from "express";
import { storage } from "../storage.js";

/**
 * Get election status
 * GET /api/election/status
 */
export async function getElectionStatusRoute(req: Request, res: Response) {
  try {
    const election = await storage.getElection();
    
    if (!election) {
      return res.json({
        status: "upcoming",
        message: "No election found",
      });
    }
    
    return res.json({
      status: election.status,
      startDate: election.startDate,
      endDate: election.endDate,
      election,
    });
  } catch (error) {
    console.error("Error fetching election status:", error);
    return res.status(500).json({
      message: "Failed to fetch election status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

