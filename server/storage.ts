import { supabase } from "./db";
import {
  type User,
  type InsertUser,
  type Student,
  type InsertStudent,
} from "@shared/schema";
import { hashPassword } from "./utils/password";

// Helper to map database row (snake_case) to TypeScript type (camelCase)
function mapStudentRow(row: any): Student {
  return {
    id: row.id,
    indexNumber: row.index_number,
    password: row.password,
    fullName: row.full_name,
    email: row.email,
    year: row.year,
    profilePicture: row.profile_picture,
    hasVoted: row.has_voted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserRow(row: any): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    createdAt: row.created_at,
  };
}

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
  updateStudent(id: string, updates: { fullName?: string; email?: string | null; year?: string | null; profilePicture?: string | null }): Promise<Student>;
  updateStudentHasVoted(indexNumber: string, hasVoted: boolean): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapUserRow(data);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapUserRow(data);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: userData.username,
        password: hashedPassword,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapUserRow(data);
  }

  // Student operations
  async getStudent(id: string): Promise<Student | undefined> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapStudentRow(data);
  }

  async getStudentByIndexNumber(indexNumber: string): Promise<Student | undefined> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("index_number", indexNumber)
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapStudentRow(data);
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    const hashedPassword = await hashPassword(studentData.password);
    const { data, error } = await supabase
      .from("students")
      .insert({
        index_number: studentData.indexNumber,
        password: hashedPassword,
        full_name: studentData.fullName,
        email: studentData.email,
        year: studentData.year,
        profile_picture: studentData.profilePicture,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapStudentRow(data);
  }

  async updateStudent(id: string, updates: { fullName?: string; email?: string | null; year?: string | null; profilePicture?: string | null }): Promise<Student> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.fullName !== undefined) {
      updateData.full_name = updates.fullName;
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email;
    }
    if (updates.year !== undefined) {
      updateData.year = updates.year;
    }
    if (updates.profilePicture !== undefined) {
      updateData.profile_picture = updates.profilePicture;
    }

    const { data, error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapStudentRow(data);
  }

  async updateStudentHasVoted(indexNumber: string, hasVoted: boolean): Promise<void> {
    const { error } = await supabase
      .from("students")
      .update({ 
        has_voted: hasVoted, 
        updated_at: new Date().toISOString() 
      })
      .eq("index_number", indexNumber);
    
    if (error) throw error;
  }
}

export const storage = new DatabaseStorage();
