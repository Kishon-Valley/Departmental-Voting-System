import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    indexNumber: "",
    fullName: "",
    email: "",
    year: "",
    password: "",
  });

  const { data: studentsData, isLoading } = useQuery<{ students: Student[] }>({
    queryKey: ["/api/admin/students"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const createStudentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        indexNumber: formData.indexNumber,
        fullName: formData.fullName,
        password: formData.password,
        email: formData.email || null,
        year: formData.year || null,
      };
      const res = await apiRequest("POST", "/api/admin/students", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Student created",
        description: `${formData.fullName} has been added successfully.`,
      });
      setFormData({
        indexNumber: "",
        fullName: "",
        email: "",
        year: "",
        password: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({
        title: "Failed to create student",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createStudentMutation.mutate();
  };

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

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Student</CardTitle>
              <CardDescription>Manually register a student account</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="indexNumber">Index Number</Label>
                  <Input
                    id="indexNumber"
                    value={formData.indexNumber}
                    onChange={(e) => setFormData({ ...formData, indexNumber: e.target.value })}
                    required
                    disabled={createStudentMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    disabled={createStudentMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={createStudentMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year (optional)</Label>
                  <Input
                    id="year"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    disabled={createStudentMutation.isPending}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={createStudentMutation.isPending}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={createStudentMutation.isPending}>
                    {createStudentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Add Student"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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

