import type { Request, Response } from "express";
import { storage } from "../storage.js";

/**
 * Get election results
 * GET /api/results
 */
export async function getResultsRoute(req: Request, res: Response) {
  try {
    // Get all positions
    const positions = await storage.getPositions();
    
    // Get all candidates
    const candidates = await storage.getCandidates();
    
    // Build results for each position
    const results = await Promise.all(
      positions.map(async (position) => {
        // Get vote counts for this position
        const voteCounts = await storage.getVoteCountsByPosition(position.id);
        
        // Get candidates for this position
        const positionCandidates = candidates.filter(
          (c) => c.positionId === position.id
        );
        
        // Calculate total votes for this position
        const totalVotes = voteCounts.reduce((sum, vc) => sum + vc.count, 0);
        
        // Build candidate results with vote counts and percentages
        const candidateResults = positionCandidates.map((candidate) => {
          const voteCount = voteCounts.find((vc) => vc.candidateId === candidate.id);
          const votes = voteCount?.count || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          
          return {
            id: candidate.id,
            name: candidate.name,
            photoUrl: candidate.photoUrl,
            manifesto: candidate.manifesto,
            votes,
            percentage,
          };
        });
        
        // Sort by votes (descending)
        candidateResults.sort((a, b) => b.votes - a.votes);
        
        return {
          positionId: position.id,
          positionTitle: position.title,
          totalVotes,
          candidates: candidateResults,
        };
      })
    );
    
    return res.json({ results });
  } catch (error) {
    console.error("Error fetching results:", error);
    return res.status(500).json({
      message: "Failed to fetch results",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get results for a specific position
 * GET /api/results/position/:positionId
 */
export async function getResultsByPositionRoute(req: Request, res: Response) {
  try {
    const { positionId } = req.params;
    
    // Verify position exists
    const position = await storage.getPosition(positionId);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }
    
    // Get vote counts for this position
    const voteCounts = await storage.getVoteCountsByPosition(positionId);
    
    // Get candidates for this position
    const candidates = await storage.getCandidatesByPosition(positionId);
    
    // Calculate total votes
    const totalVotes = voteCounts.reduce((sum, vc) => sum + vc.count, 0);
    
    // Build candidate results
    const candidateResults = candidates.map((candidate) => {
      const voteCount = voteCounts.find((vc) => vc.candidateId === candidate.id);
      const votes = voteCount?.count || 0;
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      
      return {
        id: candidate.id,
        name: candidate.name,
        photoUrl: candidate.photoUrl,
        manifesto: candidate.manifesto,
        votes,
        percentage,
      };
    });
    
    // Sort by votes (descending)
    candidateResults.sort((a, b) => b.votes - a.votes);
    
    return res.json({
      positionId: position.id,
      positionTitle: position.title,
      totalVotes,
      candidates: candidateResults,
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return res.status(500).json({
      message: "Failed to fetch results",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

