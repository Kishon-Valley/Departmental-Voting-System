import type { Request, Response } from "express";
import { storage } from "../storage.js";

/**
 * Get all candidates
 * GET /api/candidates
 */
export async function getCandidatesRoute(req: Request, res: Response) {
  try {
    const candidates = await storage.getCandidates();
    return res.json({ candidates });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return res.status(500).json({
      message: "Failed to fetch candidates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get candidate by ID
 * GET /api/candidates/:id
 */
export async function getCandidateByIdRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const candidate = await storage.getCandidate(id);
    
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    
    return res.json({ candidate });
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return res.status(500).json({
      message: "Failed to fetch candidate",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get candidates by position
 * GET /api/candidates/position/:positionId
 */
export async function getCandidatesByPositionRoute(req: Request, res: Response) {
  try {
    const { positionId } = req.params;
    const candidates = await storage.getCandidatesByPosition(positionId);
    return res.json({ candidates });
  } catch (error) {
    console.error("Error fetching candidates by position:", error);
    return res.status(500).json({
      message: "Failed to fetch candidates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

