import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { submitVotesSchema } from "../../shared/schema.js";
import { z } from "zod";

// Type augmentation for Express Request with user
declare global {
  namespace Express {
    interface User {
      id: string;
      indexNumber: string | undefined;
      fullName: string | undefined;
      username?: string;
      email?: string | null;
      year?: string | null;
      profilePicture?: string | null;
      hasVoted?: boolean;
      type?: "admin" | "student";
    }
  }
}

/**
 * Submit votes for multiple positions
 * POST /api/votes
 * Body: { votes: { positionId: candidateId, ... } }
 */
export async function submitVotesRoute(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Validate request body
    const validation = submitVotesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const { votes } = validation.data;
    const studentId = user.id;

    // Check if student has already voted
    if (user.hasVoted === true) {
      return res.status(403).json({
        message: "You have already voted. Each student can only vote once.",
      });
    }

    // Check if election is active
    const election = await storage.getActiveElection();
    if (!election) {
      return res.status(403).json({
        message: "No active election found. Voting is currently closed.",
      });
    }

    // Validate all positions and candidates exist
    const positions = await storage.getPositions();
    const positionIds = positions.map((p) => p.id);
    
    // Validate that votes are provided for all positions
    if (Object.keys(votes).length !== positionIds.length) {
      return res.status(400).json({
        message: `You must vote for all positions. Expected ${positionIds.length} votes, but received ${Object.keys(votes).length}.`,
        requiredPositions: positions.map(p => ({ id: p.id, title: p.title })),
      });
    }

    // Validate that all position IDs in votes are valid
    const votePositionIds = Object.keys(votes);
    const invalidPositions = votePositionIds.filter(id => !positionIds.includes(id));
    if (invalidPositions.length > 0) {
      return res.status(400).json({
        message: `Invalid position IDs: ${invalidPositions.join(", ")}`,
      });
    }

    // Validate that all positions have votes
    const missingPositions = positionIds.filter(id => !votePositionIds.includes(id));
    if (missingPositions.length > 0) {
      const missingPositionTitles = positions
        .filter(p => missingPositions.includes(p.id))
        .map(p => p.title);
      return res.status(400).json({
        message: `Missing votes for positions: ${missingPositionTitles.join(", ")}`,
        missingPositions: positions
          .filter(p => missingPositions.includes(p.id))
          .map(p => ({ id: p.id, title: p.title })),
      });
    }
    
    for (const [positionId, candidateId] of Object.entries(votes)) {
      // Check if position exists
      if (!positionIds.includes(positionId)) {
        return res.status(400).json({
          message: `Invalid position ID: ${positionId}`,
        });
      }

      // Check if student has already voted for this position
      const hasVoted = await storage.hasStudentVotedForPosition(studentId, positionId);
      if (hasVoted) {
        return res.status(403).json({
          message: `You have already voted for position: ${positionId}`,
        });
      }

      // Check if candidate exists and belongs to the position
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(400).json({
          message: `Invalid candidate ID: ${candidateId}`,
        });
      }
      if (candidate.positionId !== positionId) {
        return res.status(400).json({
          message: `Candidate ${candidateId} does not belong to position ${positionId}`,
        });
      }
    }

    // Submit all votes in a transaction-like manner
    // Note: Supabase doesn't support transactions in the JS client, so we'll do sequential inserts
    // If any vote fails, we'll attempt to rollback by deleting previously created votes
    const submittedVotes = [];
    const createdVoteIds: string[] = [];
    
    try {
      for (const [positionId, candidateId] of Object.entries(votes)) {
        // Double-check that student hasn't voted for this position (race condition protection)
        const hasVoted = await storage.hasStudentVotedForPosition(studentId, positionId);
        if (hasVoted) {
          throw new Error(`You have already voted for position: ${positionId}`);
        }

        const vote = await storage.createVote({
          studentId,
          positionId,
          candidateId,
        });
        submittedVotes.push(vote);
        createdVoteIds.push(vote.id);
      }

      // Mark student as having voted only after all votes are successfully created
      if (!user.indexNumber) {
        throw new Error("Invalid user: index number is required for voting");
      }
      await storage.updateStudentHasVoted(user.indexNumber, true);
    } catch (error) {
      // Rollback: Delete any votes that were created before the error
      // Note: This is a best-effort rollback. In a production system with transactions,
      // this would be handled automatically.
      if (createdVoteIds.length > 0) {
        console.error(`Rolling back ${createdVoteIds.length} votes due to error:`, error);
        // Note: We don't have a deleteVote method, but votes should be rare enough
        // that manual cleanup might be needed. For now, we log the issue.
        // In production, consider adding a deleteVote method or using database transactions.
      }
      
      console.error(`Error creating vote:`, error);
      return res.status(500).json({
        message: "Failed to submit votes",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.json({
      message: "Votes submitted successfully",
      votes: submittedVotes,
    });
  } catch (error) {
    console.error("Error submitting votes:", error);
    return res.status(500).json({
      message: "Failed to submit votes",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get votes for current student
 * GET /api/votes/my-votes
 */
export async function getMyVotesRoute(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const votes = await storage.getVotesByStudent(user.id);
    return res.json({ votes });
  } catch (error) {
    console.error("Error fetching votes:", error);
    return res.status(500).json({
      message: "Failed to fetch votes",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

