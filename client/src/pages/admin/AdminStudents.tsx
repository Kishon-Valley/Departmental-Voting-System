import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  indexNumber: string;
  fullName: string;
  email: string | null;
  year: string | null;
  profilePicture: string | null;
  hasVoted: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminStudents() {
  const { data: studentsData, isLoading } = useQuery<{ students: Student[] }>({
    queryKey: ["/api/admin/students"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const students = studentsData?.students || [];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-serif mb-2">Student Management</h1>
            <p className="text-muted-foreground">View and manage all student accounts</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Students Found</h3>
                <p className="text-muted-foreground">
                  There are no registered students in the system.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Students</CardTitle>
                <CardDescription>
                  Total registered students: {students.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile</TableHead>
                      <TableHead>Index Number</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Voting Status</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Avatar>
                            <AvatarImage src={student.profilePicture || undefined} alt={student.fullName} />
                            <AvatarFallback>
                              {student.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono font-medium">{student.indexNumber}</TableCell>
                        <TableCell className="font-semibold">{student.fullName}</TableCell>
                        <TableCell>{student.email || <span className="text-muted-foreground">No email</span>}</TableCell>
                        <TableCell>{student.year || <span className="text-muted-foreground">Not specified</span>}</TableCell>
                        <TableCell>
                          {student.hasVoted ? (
                            <Badge variant="default" className="bg-green-600">Voted</Badge>
                          ) : (
                            <Badge variant="secondary">Not Voted</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(student.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

