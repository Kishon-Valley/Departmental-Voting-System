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
});

export const loginStudentSchema = z.object({
  indexNumber: z.string().min(1, "Index number is required"),
  password: z.string().min(1, "Password is required"),
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
  hasVoted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type LoginStudent = z.infer<typeof loginStudentSchema>;
