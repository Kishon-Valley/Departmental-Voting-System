import type { Request, Response } from "express";
import { storage } from "../storage.js";

/**
 * Public election overview counts for the home page.
 * GET /api/stats/public
 */
export async function getPublicStatsRoute(_req: Request, res: Response) {
  try {
    const stats = await storage.getPublicStats();
    return res.json(stats);
  } catch (error) {
    console.error("Error fetching public stats:", error);
    return res.status(500).json({
      message: "Failed to fetch stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
