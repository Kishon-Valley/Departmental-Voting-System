import { z } from "zod";

// Validation schemas
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertStudentSchema = z.object({
  indexNumber: z.string().min(1, "Index number is required"),
  password: z.string().min(1, "Password is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().nullable(),
  year: z.string().optional().nullable(),
  profilePicture: z.string().url().optional().nullable(),
});

export const loginStudentSchema = z.object({
  indexNumber: z.string().min(1, "Index number is required"),
  password: z.string().min(1, "Password is required"),
});

export const loginAdminSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const submitVoteSchema = z.object({
  positionId: z.string().min(1, "Position ID is required"),
  candidateId: z.string().min(1, "Candidate ID is required"),
});

export const submitVotesSchema = z.object({
  votes: z.record(z.string(), z.string()).refine(
    (votes) => Object.keys(votes).length > 0,
    "At least one vote is required"
  ),
});

// Type definitions matching database schema
export type User = {
  id: string;
  username: string;
  password: string;
  createdAt: Date | string;
};

export type Student = {
  id: string;
  indexNumber: string;
  password: string;
  fullName: string;
  email: string | null;
  year: string | null;
  profilePicture: string | null;
  hasVoted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Position = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Candidate = {
  id: string;
  positionId: string;
  name: string;
  photoUrl: string | null;
  manifesto: string | null;
  bio: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Vote = {
  id: string;
  studentId: string;
  positionId: string;
  candidateId: string;
  createdAt: Date | string;
};

export type Election = {
  id: string;
  status: "upcoming" | "active" | "closed";
  startDate: Date | string | null;
  endDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

// Insert types
export type InsertPosition = {
  title: string;
  description?: string | null;
  order: number;
};

export type InsertCandidate = {
  positionId: string;
  name: string;
  photoUrl?: string | null;
  manifesto?: string | null;
  bio?: string | null;
};

export type InsertVote = {
  studentId: string;
  positionId: string;
  candidateId: string;
};

export type InsertElection = {
  status: "upcoming" | "active" | "closed";
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type LoginStudent = z.infer<typeof loginStudentSchema>;
export type LoginAdmin = z.infer<typeof loginAdminSchema>;
export type SubmitVote = z.infer<typeof submitVoteSchema>;
export type SubmitVotes = z.infer<typeof submitVotesSchema>;
