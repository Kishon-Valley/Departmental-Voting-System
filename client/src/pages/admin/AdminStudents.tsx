import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Upload, FileSpreadsheet } from "lucide-react";
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [defaultPassword, setDefaultPassword] = useState("Student@123");

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

  const uploadExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("excelFile", file);
      formData.append("defaultPassword", defaultPassword);

      const res = await fetch("/api/admin/students/upload-excel", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload Excel file");
      }

      return res.json();
    },
    onSuccess: (data) => {
      const { created, skipped, errors } = data.summary || {};
      const message = `Successfully created ${created || 0} students. ${skipped || 0} skipped. ${errors || 0} errors.`;
      
      toast({
        title: "Excel upload completed",
        description: message,
        variant: errors > 0 ? "default" : "default",
      });

      // Show detailed results if there are errors or skipped items
      if (errors > 0 || skipped > 0) {
        console.log("Upload details:", data);
      }

      setExcelFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to upload Excel file";
      toast({
        title: "Upload failed",
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
              <CardTitle>Bulk Upload Students from Excel</CardTitle>
              <CardDescription>
                Upload an Excel file with student details. Expected columns: NAME, INDEX NO, PHONE NO, EMAIL, PASSPORT SIZED PICTURE
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="excelFile">Excel File</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="excelFile"
                      type="file"
                      accept=".xlsx,.xls,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setExcelFile(file || null);
                      }}
                      disabled={uploadExcelMutation.isPending}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (excelFile) {
                          uploadExcelMutation.mutate(excelFile);
                        } else {
                          toast({
                            title: "No file selected",
                            description: "Please select an Excel file to upload",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!excelFile || uploadExcelMutation.isPending}
                    >
                      {uploadExcelMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Excel
                        </>
                      )}
                    </Button>
                  </div>
                  {excelFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {excelFile.name} ({(excelFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultPassword">Default Password</Label>
                  <Input
                    id="defaultPassword"
                    type="text"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    placeholder="Student@123"
                    disabled={uploadExcelMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    This password will be set for all students. They should change it after first login.
                  </p>
                </div>
                <div className="rounded-lg border border-dashed p-4 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel file format:</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1 ml-6">
                    <p>Column 1: NAME (required)</p>
                    <p>Column 2: INDEX NO (required)</p>
                    <p>Column 3: PHONE NO (optional)</p>
                    <p>Column 4: EMAIL (optional)</p>
                    <p>Column 5: PASSPORT SIZED PICTURE (optional - base64 or URL)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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

