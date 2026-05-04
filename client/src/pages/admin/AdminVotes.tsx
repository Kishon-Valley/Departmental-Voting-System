import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  electionId?: string;
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

interface ElectionListItem {
  id: string;
  name: string;
  status: string;
}

export default function AdminVotes() {
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");

  const { data: electionsData, isLoading: electionsLoading } = useQuery<{ elections: ElectionListItem[] }>({
    queryKey: ["/api/admin/elections"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const elections = electionsData?.elections ?? [];

  useEffect(() => {
    if (elections.length === 0) {
      setSelectedElectionId("");
      return;
    }
    setSelectedElectionId((prev) => {
      if (prev && elections.some((e) => e.id === prev)) return prev;
      return elections[0].id;
    });
  }, [elections]);

  const selectedElection = useMemo(
    () => elections.find((e) => e.id === selectedElectionId),
    [elections, selectedElectionId],
  );

  const { data: votesData, isLoading: votesLoading } = useQuery<{ votes: VoteRecord[] }>({
    queryKey: ["/api/admin/votes", selectedElectionId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/admin/votes?electionId=${encodeURIComponent(selectedElectionId)}`,
      );
      return res.json();
    },
    enabled: !!selectedElectionId,
  });

  const votes = votesData?.votes ?? [];

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

  const students = studentsData?.students ?? [];
  const positions = positionsData?.positions ?? [];
  const candidates = candidatesData?.candidates ?? [];

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

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-serif mb-2">Vote Management</h1>
            <p className="text-muted-foreground">View submitted votes by election</p>
          </div>

          {electionsLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : elections.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Elections</h3>
                <p className="text-muted-foreground">
                  Create an election under Admin → Elections before votes can be associated with a named election.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select election</CardTitle>
                  <CardDescription>
                    Choose an election to load its ballot lines. Counts include only votes stored for that election.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-w-md space-y-2">
                  <Label htmlFor="votes-election-select">Election</Label>
                  <Select value={selectedElectionId} onValueChange={setSelectedElectionId}>
                    <SelectTrigger id="votes-election-select">
                      <SelectValue placeholder="Select an election" />
                    </SelectTrigger>
                    <SelectContent>
                      {elections.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Votes</CardTitle>
                  <CardDescription>
                    {selectedElection ? (
                      <>
                        <span className="font-medium text-foreground">{selectedElection.name}</span>
                        {" · "}
                        Total votes submitted: {votesLoading ? "…" : votes.length}
                      </>
                    ) : (
                      "Select an election above."
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedElectionId || votesLoading ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : votes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No votes recorded for this election yet.
                    </p>
                  ) : (
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
                              <TableCell className="font-medium">{getStudentInfo(vote.studentId)}</TableCell>
                              <TableCell>{getPositionTitle(vote.positionId)}</TableCell>
                              <TableCell className="font-semibold">{getCandidateName(vote.candidateId)}</TableCell>
                              <TableCell>{new Date(vote.createdAt).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </AdminProtectedRoute>
  );
}
