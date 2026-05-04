import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Loader2, AlertCircle, CheckCircle2, Clock, Megaphone, History } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ElectionRow {
  id: string;
  name: string;
  status: "upcoming" | "active" | "closed";
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ElectionRecordResponse {
  election: ElectionRow;
  participation: {
    ballotRowCount: number;
    distinctVoterCount: number;
  };
}

export default function AdminElections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDatesDialogOpen, setIsEditDatesDialogOpen] = useState(false);
  const [detailElectionId, setDetailElectionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    status: "upcoming" as "upcoming" | "active" | "closed",
    startDate: "",
    endDate: "",
  });
  const [editDatesData, setEditDatesData] = useState({
    startDate: "",
    endDate: "",
  });

  // Fetch current election (public status endpoint; used for operational controls)
  const { data: electionData, isLoading: isElectionStatusLoading } = useQuery<{
    status: string;
    name?: string;
    startDate?: string | null;
    endDate?: string | null;
    id?: string;
    election?: { name?: string };
  }>({
    queryKey: ["/api/election/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: electionsListData, isLoading: isElectionsListLoading } = useQuery<{ elections: ElectionRow[] }>({
    queryKey: ["/api/admin/elections"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: electionRecordData, isLoading: isElectionRecordLoading } = useQuery<ElectionRecordResponse>({
    queryKey: ["/api/admin/elections", detailElectionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/elections/${detailElectionId}`);
      return res.json();
    },
    enabled: !!detailElectionId,
  });

  // Create election mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      status: string;
      startDate?: string | null;
      endDate?: string | null;
    }) => {
      const res = await apiRequest("POST", "/api/admin/elections", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/election/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/elections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/votes"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", status: "upcoming", startDate: "", endDate: "" });
      toast({
        title: "Election Created",
        description: "Election has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create election",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "upcoming" | "active" | "closed" }) => {
      const res = await apiRequest("PUT", `/api/admin/elections/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/election/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/elections"] });
      toast({
        title: "Status Updated",
        description: "Election status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Update dates mutation
  const updateDatesMutation = useMutation({
    mutationFn: async ({ id, startDate, endDate }: { id: string; startDate: string | null; endDate: string | null }) => {
      const res = await apiRequest("PUT", `/api/admin/elections/${id}/dates`, { startDate, endDate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/election/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/elections"] });
      setIsEditDatesDialogOpen(false);
      toast({
        title: "Dates Updated",
        description: "Election dates have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dates",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    // Convert datetime-local format to ISO string
    const convertToISO = (dateTimeLocal: string | null | undefined): string | null => {
      if (!dateTimeLocal) return null;
      const date = new Date(dateTimeLocal);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    };
    
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast({
        title: "Name required",
        description: "Please enter an election name.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: trimmedName,
      status: formData.status,
      startDate: convertToISO(formData.startDate),
      endDate: convertToISO(formData.endDate),
    });
  };

  const handleStatusChange = (newStatus: "upcoming" | "active" | "closed") => {
    if (electionData?.id) {
      updateStatusMutation.mutate({ id: electionData.id, status: newStatus });
    }
  };

  const handleEditDates = () => {
    if (electionData) {
      // Convert ISO dates to datetime-local format
      const formatForInput = (dateStr: string | null | undefined) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        // Check if date is valid
        if (isNaN(date.getTime())) return "";
        // Get local datetime in format YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      setEditDatesData({
        startDate: formatForInput(electionData.startDate),
        endDate: formatForInput(electionData.endDate),
      });
      setIsEditDatesDialogOpen(true);
    }
  };

  const handleSaveDates = () => {
    if (electionData?.id) {
      // Convert datetime-local format to ISO string
      const convertToISO = (dateTimeLocal: string | null | undefined): string | null => {
        if (!dateTimeLocal) return null;
        // datetime-local format is already in local time, so we create a Date object
        // and convert it to ISO string
        const date = new Date(dateTimeLocal);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      };
      
      updateDatesMutation.mutate({
        id: electionData.id,
        startDate: convertToISO(editDatesData.startDate),
        endDate: convertToISO(editDatesData.endDate),
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "closed":
        return <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100";
      case "closed":
        return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100";
      default:
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100";
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold font-serif mb-2">Election Management</h1>
              <p className="text-muted-foreground">Manage election settings and status</p>
            </div>
            <Button
              onClick={() => {
                setFormData({ name: "", status: "upcoming", startDate: "", endDate: "" });
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Election
            </Button>
          </div>

          {isElectionStatusLoading ? (
            <div className="flex items-center justify-center min-h-[240px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : electionData ? (
            <div className="space-y-6">
              {/* Current Election Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Election</CardTitle>
                  <CardDescription>Manage the current election status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={`p-4 rounded-lg border ${getStatusColor(electionData.status)}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(electionData.status)}
                      <span className="font-semibold capitalize">{electionData.status}</span>
                    </div>
                    {(electionData.name ?? electionData.election?.name) && (
                      <p className="text-sm font-medium mt-1">
                        {electionData.name ?? electionData.election?.name}
                      </p>
                    )}
                    {electionData.startDate && (
                      <p className="text-sm mt-2">
                        Start: {new Date(electionData.startDate).toLocaleString()}
                      </p>
                    )}
                    {electionData.endDate && (
                      <p className="text-sm">
                        End: {new Date(electionData.endDate).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Change Status</Label>
                      <Select
                        value={electionData.status}
                        onValueChange={(value) => handleStatusChange(value as "upcoming" | "active" | "closed")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {electionData.status === "active" && (
                      <div>
                        <Button
                          variant="default"
                          className="w-full"
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            handleStatusChange("closed")
                          }
                        >
                          {updateStatusMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <Megaphone className="h-4 w-4 mr-2" />
                              Publish Results (Close Election)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    <div>
                      <Button
                        variant="outline"
                        onClick={handleEditDates}
                        className="w-full"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Edit Election Dates & Times
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">Upcoming</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Election is scheduled but voting has not started yet.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Election is currently active and students can vote.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Closed</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Election has ended and results are final.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Election Created</h3>
                <p className="text-muted-foreground mb-6">
                  Create an election to start managing the voting process.
                </p>
                <Button
                  onClick={() => {
                    setFormData({ name: "", status: "upcoming", startDate: "", endDate: "" });
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Election
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Election records</CardTitle>
                  <CardDescription>
                    Every election held in the system. Open a row to view stored fields and turnout for that election.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isElectionsListLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead className="text-right w-[100px]">Record</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(electionsListData?.elections ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                            No elections in the database yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (electionsListData?.elections ?? []).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium max-w-[220px] truncate" title={row.name}>
                              {row.name}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="capitalize">{row.status}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {row.startDate ? new Date(row.startDate).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {row.endDate ? new Date(row.endDate).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => setDetailElectionId(row.id)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={!!detailElectionId}
            onOpenChange={(open) => {
              if (!open) setDetailElectionId(null);
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Election record</DialogTitle>
                <DialogDescription>
                  Read-only snapshot from the database for this election. Vote counts include only ballots stored for
                  this election id.
                </DialogDescription>
              </DialogHeader>
              {detailElectionId && (
                <div className="space-y-4 py-2">
                  {isElectionRecordLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : electionRecordData ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{electionRecordData.election.name}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Election id</Label>
                        <p className="font-mono text-xs break-all">{electionRecordData.election.id}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <p className="font-medium capitalize">{electionRecordData.election.status}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Ballot lines recorded</Label>
                          <p className="font-medium tabular-nums">{electionRecordData.participation.ballotRowCount}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Distinct voters</Label>
                          <p className="font-medium tabular-nums">{electionRecordData.participation.distinctVoterCount}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Start</Label>
                        <p className="text-sm">
                          {electionRecordData.election.startDate
                            ? new Date(electionRecordData.election.startDate).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">End</Label>
                        <p className="text-sm">
                          {electionRecordData.election.endDate
                            ? new Date(electionRecordData.election.endDate).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Created at</Label>
                          <p>
                            {electionRecordData.election.createdAt
                              ? new Date(electionRecordData.election.createdAt).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Last updated</Label>
                          <p>
                            {electionRecordData.election.updatedAt
                              ? new Date(electionRecordData.election.updatedAt).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">Could not load this record.</p>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDetailElectionId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Election Dialog */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (open) {
                setFormData({ name: "", status: "upcoming", startDate: "", endDate: "" });
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Election</DialogTitle>
                <DialogDescription>
                  Give the election a clear name (shown in admin history and vote reports), then set status and
                  schedule.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="election-name">Election name</Label>
                  <Input
                    id="election-name"
                    placeholder="e.g. 2025/2026 Department SRC Elections"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={200}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date & Time (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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

          {/* Edit Dates Dialog */}
          <Dialog open={isEditDatesDialogOpen} onOpenChange={setIsEditDatesDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Election Dates & Times</DialogTitle>
                <DialogDescription>
                  Set the start and end dates and times for the election. These will be displayed on the home page.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={editDatesData.startDate}
                    onChange={(e) => setEditDatesData({ ...editDatesData, startDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    When the election voting period begins
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={editDatesData.endDate}
                    onChange={(e) => setEditDatesData({ ...editDatesData, endDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    When the election voting period ends
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDatesDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDates} disabled={updateDatesMutation.isPending}>
                  {updateDatesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Dates"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

