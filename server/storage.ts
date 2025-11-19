import { supabase } from "./db.js";
import type {
  User,
  InsertUser,
  Student,
  InsertStudent,
  Position,
  Candidate,
  Vote,
  Election,
  InsertPosition,
  InsertCandidate,
  InsertVote,
  InsertElection,
} from "@shared/schema";
import { hashPassword } from "./utils/password.js";

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

function mapPositionRow(row: any): Position {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCandidateRow(row: any): Candidate {
  return {
    id: row.id,
    positionId: row.position_id,
    name: row.name,
    photoUrl: row.photo_url,
    manifesto: row.manifesto,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVoteRow(row: any): Vote {
  return {
    id: row.id,
    studentId: row.student_id,
    positionId: row.position_id,
    candidateId: row.candidate_id,
    createdAt: row.created_at,
  };
}

function mapElectionRow(row: any): Election {
  return {
    id: row.id,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  // Position operations
  getPositions(): Promise<Position[]>;
  getPosition(id: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: { title?: string; description?: string | null; order?: number }): Promise<Position>;
  deletePosition(id: string): Promise<void>;

  // Candidate operations
  getCandidates(): Promise<Candidate[]>;
  getCandidatesByPosition(positionId: string): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, updates: { positionId?: string; name?: string; photoUrl?: string | null; manifesto?: string | null; bio?: string | null }): Promise<Candidate>;
  deleteCandidate(id: string): Promise<void>;

  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByStudent(studentId: string): Promise<Vote[]>;
  getVotesByPosition(positionId: string): Promise<Vote[]>;
  getAllVotes(): Promise<Vote[]>;
  hasStudentVotedForPosition(studentId: string, positionId: string): Promise<boolean>;
  getVoteCountsByPosition(positionId: string): Promise<Array<{ candidateId: string; count: number }>>;
  
  // Student operations (admin)
  getAllStudents(): Promise<Student[]>;

  // Election operations
  getElection(): Promise<Election | undefined>;
  getActiveElection(): Promise<Election | undefined>;
  createElection(election: InsertElection): Promise<Election>;
  updateElectionStatus(id: string, status: "upcoming" | "active" | "closed"): Promise<Election>;
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

  async getAllStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapStudentRow);
  }

  // Position operations
  async getPositions(): Promise<Position[]> {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("order", { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapPositionRow);
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapPositionRow(data);
  }

  async createPosition(positionData: InsertPosition): Promise<Position> {
    const { data, error } = await supabase
      .from("positions")
      .insert({
        title: positionData.title,
        description: positionData.description,
        order: positionData.order,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapPositionRow(data);
  }

  async updatePosition(id: string, updates: { title?: string; description?: string | null; order?: number }): Promise<Position> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.order !== undefined) {
      updateData.order = updates.order;
    }

    const { data, error } = await supabase
      .from("positions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapPositionRow(data);
  }

  async deletePosition(id: string): Promise<void> {
    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  }

  // Candidate operations
  async getCandidates(): Promise<Candidate[]> {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapCandidateRow);
  }

  async getCandidatesByPosition(positionId: string): Promise<Candidate[]> {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("position_id", positionId)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapCandidateRow);
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", id)
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapCandidateRow(data);
  }

  async createCandidate(candidateData: InsertCandidate): Promise<Candidate> {
    const { data, error } = await supabase
      .from("candidates")
      .insert({
        position_id: candidateData.positionId,
        name: candidateData.name,
        photo_url: candidateData.photoUrl,
        manifesto: candidateData.manifesto,
        bio: candidateData.bio,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapCandidateRow(data);
  }

  async updateCandidate(id: string, updates: { positionId?: string; name?: string; photoUrl?: string | null; manifesto?: string | null; bio?: string | null }): Promise<Candidate> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.positionId !== undefined) {
      updateData.position_id = updates.positionId;
    }
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.photoUrl !== undefined) {
      updateData.photo_url = updates.photoUrl;
    }
    if (updates.manifesto !== undefined) {
      updateData.manifesto = updates.manifesto;
    }
    if (updates.bio !== undefined) {
      updateData.bio = updates.bio;
    }

    const { data, error } = await supabase
      .from("candidates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapCandidateRow(data);
  }

  async deleteCandidate(id: string): Promise<void> {
    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  }

  // Vote operations
  async createVote(voteData: InsertVote): Promise<Vote> {
    const { data, error } = await supabase
      .from("votes")
      .insert({
        student_id: voteData.studentId,
        position_id: voteData.positionId,
        candidate_id: voteData.candidateId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapVoteRow(data);
  }

  async getVotesByStudent(studentId: string): Promise<Vote[]> {
    const { data, error } = await supabase
      .from("votes")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapVoteRow);
  }

  async getVotesByPosition(positionId: string): Promise<Vote[]> {
    const { data, error } = await supabase
      .from("votes")
      .select("*")
      .eq("position_id", positionId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapVoteRow);
  }

  async getAllVotes(): Promise<Vote[]> {
    const { data, error } = await supabase
      .from("votes")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapVoteRow);
  }

  async hasStudentVotedForPosition(studentId: string, positionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("votes")
      .select("id")
      .eq("student_id", studentId)
      .eq("position_id", positionId)
      .limit(1);
    
    if (error) {
      throw error;
    }
    return (data && data.length > 0);
  }

  async getVoteCountsByPosition(positionId: string): Promise<Array<{ candidateId: string; count: number }>> {
    const { data, error } = await supabase
      .from("votes")
      .select("candidate_id")
      .eq("position_id", positionId);
    
    if (error) throw error;
    
    // Count votes per candidate
    const counts: Record<string, number> = {};
    (data || []).forEach((vote: any) => {
      const candidateId = vote.candidate_id;
      counts[candidateId] = (counts[candidateId] || 0) + 1;
    });
    
    return Object.entries(counts).map(([candidateId, count]) => ({
      candidateId,
      count,
    }));
  }

  // Election operations
  async getElection(): Promise<Election | undefined> {
    // Get the most recent election (assuming single active election)
    const { data, error } = await supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapElectionRow(data);
  }

  async getActiveElection(): Promise<Election | undefined> {
    const { data, error } = await supabase
      .from("elections")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return mapElectionRow(data);
  }

  async createElection(electionData: InsertElection): Promise<Election> {
    const { data, error } = await supabase
      .from("elections")
      .insert({
        status: electionData.status,
        start_date: electionData.startDate,
        end_date: electionData.endDate,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapElectionRow(data);
  }

  async updateElectionStatus(id: string, status: "upcoming" | "active" | "closed"): Promise<Election> {
    const { data, error } = await supabase
      .from("elections")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return mapElectionRow(data);
  }
}

export const storage = new DatabaseStorage();
