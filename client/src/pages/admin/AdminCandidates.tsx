import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Edit, Trash2, UserCheck, Image as ImageIcon } from "lucide-react";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminNavbar from "@/components/admin/AdminNavbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Candidate {
  id: string;
  positionId: string;
  name: string;
  photoUrl: string | null;
  manifesto: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Position {
  id: string;
  title: string;
  order: number;
}

export default function AdminCandidates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [formData, setFormData] = useState({
    positionId: "",
    name: "",
    photoUrl: "",
    manifesto: "",
    bio: "",
  });

  // Fetch positions
  const { data: positionsData } = useQuery<{ positions: Position[] }>({
    queryKey: ["/api/positions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch candidates
  const { data: candidatesData, isLoading } = useQuery<{ candidates: Candidate[] }>({
    queryKey: ["/api/candidates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const positions = positionsData?.positions || [];
  const candidates = candidatesData?.candidates || [];

  // Create candidate mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      positionId: string;
      name: string;
      photoUrl?: string | null;
      manifesto?: string | null;
      bio?: string | null;
    }) => {
      const res = await apiRequest("POST", "/api/admin/candidates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsCreateDialogOpen(false);
      setFormData({ positionId: "", name: "", photoUrl: "", manifesto: "", bio: "" });
      toast({
        title: "Candidate Created",
        description: "Candidate has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create candidate",
        variant: "destructive",
      });
    },
  });

  // Update candidate mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        positionId?: string;
        name?: string;
        photoUrl?: string | null;
        manifesto?: string | null;
        bio?: string | null;
      };
    }) => {
      const res = await apiRequest("PUT", `/api/admin/candidates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsEditDialogOpen(false);
      setSelectedCandidate(null);
      setFormData({ positionId: "", name: "", photoUrl: "", manifesto: "", bio: "" });
      toast({
        title: "Candidate Updated",
        description: "Candidate has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update candidate",
        variant: "destructive",
      });
    },
  });

  // Delete candidate mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/candidates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsDeleteDialogOpen(false);
      setSelectedCandidate(null);
      toast({
        title: "Candidate Deleted",
        description: "Candidate has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete candidate",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!formData.positionId || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Position and name are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      positionId: formData.positionId,
      name: formData.name,
      photoUrl: formData.photoUrl || null,
      manifesto: formData.manifesto || null,
      bio: formData.bio || null,
    });
  };

  const handleEdit = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setFormData({
      positionId: candidate.positionId,
      name: candidate.name,
      photoUrl: candidate.photoUrl || "",
      manifesto: candidate.manifesto || "",
      bio: candidate.bio || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.positionId || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Position and name are required",
        variant: "destructive",
      });
      return;
    }
    if (selectedCandidate) {
      updateMutation.mutate({
        id: selectedCandidate.id,
        data: {
          positionId: formData.positionId,
          name: formData.name,
          photoUrl: formData.photoUrl || null,
          manifesto: formData.manifesto || null,
          bio: formData.bio || null,
        },
      });
    }
  };

  const handleDelete = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCandidate) {
      deleteMutation.mutate(selectedCandidate.id);
    }
  };

  const getPositionTitle = (positionId: string) => {
    return positions.find((p) => p.id === positionId)?.title || "Unknown Position";
  };

  // Sort positions by order for dropdown
  const sortedPositions = [...positions].sort((a, b) => a.order - b.order);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold font-serif mb-2">Candidate Management</h1>
              <p className="text-muted-foreground">Create, edit, and manage election candidates</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={positions.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Create Candidate
            </Button>
          </div>

          {positions.length === 0 && (
            <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You need to create positions before adding candidates. Go to{" "}
                  <a href="/admin/positions" className="underline font-medium">
                    Position Management
                  </a>{" "}
                  to create positions first.
                </p>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : candidates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Candidates Created</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first candidate to start managing the election.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} disabled={positions.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Candidate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Candidates</CardTitle>
                <CardDescription>
                  Manage all election candidates. Each candidate must be assigned to a position.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Bio</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <Avatar>
                            <AvatarImage src={candidate.photoUrl || undefined} alt={candidate.name} />
                            <AvatarFallback>
                              {candidate.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-semibold">{candidate.name}</TableCell>
                        <TableCell>{getPositionTitle(candidate.positionId)}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {candidate.bio || <span className="text-muted-foreground">No bio</span>}
                        </TableCell>
                        <TableCell>
                          {new Date(candidate.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(candidate)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(candidate)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Create Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Candidate</DialogTitle>
                <DialogDescription>
                  Add a new candidate to the election. All fields except photo URL are optional.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-position">Position *</Label>
                  <Select
                    value={formData.positionId}
                    onValueChange={(value) => setFormData({ ...formData, positionId: value })}
                  >
                    <SelectTrigger id="create-position">
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedPositions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-name">Name *</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Candidate full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-photo">Photo URL</Label>
                  <Input
                    id="create-photo"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a valid image URL for the candidate's photo
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-bio">Bio</Label>
                  <Textarea
                    id="create-bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief biography of the candidate"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-manifesto">Manifesto</Label>
                  <Textarea
                    id="create-manifesto"
                    value={formData.manifesto}
                    onChange={(e) => setFormData({ ...formData, manifesto: e.target.value })}
                    placeholder="Candidate's manifesto or platform"
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Candidate</DialogTitle>
                <DialogDescription>
                  Update the candidate details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-position">Position *</Label>
                  <Select
                    value={formData.positionId}
                    onValueChange={(value) => setFormData({ ...formData, positionId: value })}
                  >
                    <SelectTrigger id="edit-position">
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedPositions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Candidate full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-photo">Photo URL</Label>
                  <Input
                    id="edit-photo"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bio">Bio</Label>
                  <Textarea
                    id="edit-bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief biography of the candidate"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-manifesto">Manifesto</Label>
                  <Textarea
                    id="edit-manifesto"
                    value={formData.manifesto}
                    onChange={(e) => setFormData({ ...formData, manifesto: e.target.value })}
                    placeholder="Candidate's manifesto or platform"
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the candidate "{selectedCandidate?.name}". 
                  This action cannot be undone. All votes for this candidate will also be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

