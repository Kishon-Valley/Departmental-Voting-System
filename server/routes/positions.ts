import type { Request, Response } from "express";
import { storage } from "../storage.js";

/**
 * Get all positions
 * GET /api/positions
 */
export async function getPositionsRoute(req: Request, res: Response) {
  try {
    const positions = await storage.getPositions();
    return res.json({ positions });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return res.status(500).json({
      message: "Failed to fetch positions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get position by ID
 * GET /api/positions/:id
 */
export async function getPositionByIdRoute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const position = await storage.getPosition(id);
    
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }
    
    return res.json({ position });
  } catch (error) {
    console.error("Error fetching position:", error);
    return res.status(500).json({
      message: "Failed to fetch position",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

