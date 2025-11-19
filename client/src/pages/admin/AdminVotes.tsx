import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Vote } from "lucide-react";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminNavbar from "@/components/admin/AdminNavbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VoteRecord {
  id: string;
  studentId: string;
  positionId: string;
  candidateId: string;
  createdAt: string;
}

interface Student {
  id: string;
  indexNumber: string;
  fullName: string;
}

interface Position {
  id: string;
  title: string;
}

interface Candidate {
  id: string;
  name: string;
}

export default function AdminVotes() {
  const { data: votesData, isLoading: votesLoading } = useQuery<{ votes: VoteRecord[] }>({
    queryKey: ["/api/admin/votes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: studentsData } = useQuery<{ students: Student[] }>({
    queryKey: ["/api/admin/students"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: positionsData } = useQuery<{ positions: Position[] }>({
    queryKey: ["/api/positions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: candidatesData } = useQuery<{ candidates: Candidate[] }>({
    queryKey: ["/api/candidates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const votes = votesData?.votes || [];
  const students = studentsData?.students || [];
  const positions = positionsData?.positions || [];
  const candidates = candidatesData?.candidates || [];

  const getStudentInfo = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    return student ? `${student.fullName} (${student.indexNumber})` : "Unknown Student";
  };

  const getPositionTitle = (positionId: string) => {
    return positions.find((p) => p.id === positionId)?.title || "Unknown Position";
  };

  const getCandidateName = (candidateId: string) => {
    return candidates.find((c) => c.id === candidateId)?.name || "Unknown Candidate";
  };

  const isLoading = votesLoading;

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-serif mb-2">Vote Management</h1>
            <p className="text-muted-foreground">View all submitted votes</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : votes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Votes Recorded</h3>
                <p className="text-muted-foreground">
                  There are no votes in the system yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Votes</CardTitle>
                <CardDescription>
                  Total votes submitted: {votes.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Voted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {votes.map((vote) => (
                        <TableRow key={vote.id}>
                          <TableCell className="font-medium">
                            {getStudentInfo(vote.studentId)}
                          </TableCell>
                          <TableCell>{getPositionTitle(vote.positionId)}</TableCell>
                          <TableCell className="font-semibold">
                            {getCandidateName(vote.candidateId)}
                          </TableCell>
                          <TableCell>
                            {new Date(vote.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

