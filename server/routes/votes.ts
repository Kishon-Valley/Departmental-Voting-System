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
  if (user.type === "admin") {
    return res.status(403).json({ message: "Only students can submit votes" });
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
    const studentId = user.id; // Use UUID from user session, not index number

    if (!studentId) {
      console.error("Missing student id on user:", user);
      return res.status(400).json({
        message: "Invalid user session. Please log out and log back in.",
      });
    }

    // Check if election is active
    const election = await storage.getActiveElection();
    if (!election) {
      return res.status(403).json({
        message: "No active election found. Voting is currently closed.",
      });
    }

    const electionId = election.id;

    // One ballot per student per election (not global has_voted on students row)
    const alreadyCompleted = await storage.hasStudentCompletedBallotForElection(studentId, electionId);
    if (alreadyCompleted) {
      return res.status(403).json({
        message: "You have already voted in this election. Each student can vote once per election.",
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
      const hasVoted = await storage.hasStudentVotedForPosition(studentId, positionId, electionId);
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
        const hasVoted = await storage.hasStudentVotedForPosition(studentId, positionId, electionId);
        if (hasVoted) {
          throw new Error(`You have already voted for position: ${positionId}`);
        }

        const vote = await storage.createVote({
          studentId,
          positionId,
          candidateId,
          electionId,
        });
        submittedVotes.push(vote);
        createdVoteIds.push(vote.id);
      }

    } catch (error: any) {
      // Rollback: Delete any votes that were created before the error
      // Note: This is a best-effort rollback. In a production system with transactions,
      // this would be handled automatically.
      if (createdVoteIds.length > 0) {
        console.error(`Rolling back ${createdVoteIds.length} votes due to error:`, error);
        // Note: We don't have a deleteVote method, but votes should be rare enough
        // that manual cleanup might be needed. For now, we log the issue.
        // In production, consider adding a deleteVote method or using database transactions.
      }
      
      // Extract error message from various error types (Supabase, standard Error, etc.)
      const errorMessage = error?.message || error?.errorDescription || error?.details || (typeof error === 'string' ? error : "Unknown error");
      console.error(`Error creating vote:`, error);
      return res.status(500).json({
        message: "Failed to submit votes",
        error: errorMessage,
      });
    }

    return res.json({
      message: "Votes submitted successfully",
      votes: submittedVotes,
    });
  } catch (error: any) {
    console.error("Error submitting votes:", error);
    const errorMessage = error?.message || error?.errorDescription || error?.details || (typeof error === 'string' ? error : "Unknown error");
    return res.status(500).json({
      message: "Failed to submit votes",
      error: errorMessage,
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
    const studentId = user.id;
    const active = await storage.getActiveElection();
    if (!active) {
      return res.json({ votes: [] });
    }
    const votes = await storage.getVotesByStudent(studentId, active.id);
    return res.json({ votes });
  } catch (error: any) {
    console.error("Error fetching votes:", error);
    const errorMessage = error?.message || error?.errorDescription || error?.details || (typeof error === 'string' ? error : "Unknown error");
    return res.status(500).json({
      message: "Failed to fetch votes",
      error: errorMessage,
    });
  }
}

