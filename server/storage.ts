import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  type User,
  type InsertUser,
  type Student,
  type InsertStudent,
  students,
  users,
} from "@shared/schema";
import { hashPassword } from "./utils/password";

// Storage interface for database operations
export interface IStorage {
  // User operations (for admin)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Student operations
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByIndexNumber(indexNumber: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudentHasVoted(indexNumber: string, hasVoted: boolean): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    const result = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return result[0];
  }

  // Student operations
  async getStudent(id: string): Promise<Student | undefined> {
    const result = await db
      .select()
      .from(students)
      .where(eq(students.id, id))
      .limit(1);
    return result[0];
  }

  async getStudentByIndexNumber(indexNumber: string): Promise<Student | undefined> {
    const result = await db
      .select()
      .from(students)
      .where(eq(students.indexNumber, indexNumber))
      .limit(1);
    return result[0];
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    const hashedPassword = await hashPassword(studentData.password);
    const result = await db
      .insert(students)
      .values({
        ...studentData,
        password: hashedPassword,
      })
      .returning();
    return result[0];
  }

  async updateStudentHasVoted(indexNumber: string, hasVoted: boolean): Promise<void> {
    await db
      .update(students)
      .set({ hasVoted, updatedAt: new Date() })
      .where(eq(students.indexNumber, indexNumber));
  }
}

export const storage = new DatabaseStorage();
