import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminNavbar from "@/components/admin/AdminNavbar";
import ResultsChart from "@/components/ResultsChart";
import StatusBadge from "@/components/StatusBadge";

export default function AdminResults() {
  // Fetch election status
  const { data: electionData, isLoading: electionLoading } = useQuery<{
    status: "upcoming" | "active" | "closed";
    startDate?: string | null;
    endDate?: string | null;
  }>({
    queryKey: ["/api/election/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch results
  const {
    data: resultsData,
    isLoading: resultsLoading,
    error: resultsError,
  } = useQuery<{
    results: Array<{
      positionId: string;
      positionTitle: string;
      totalVotes: number;
      candidates: Array<{
        id: string;
        name: string;
        photoUrl: string | null;
        manifesto: string | null;
        votes: number;
        percentage: number;
      }>;
    }>;
  }>({
    queryKey: ["/api/results"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const electionStatus = electionData?.status || "upcoming";
  const isLoading = electionLoading || resultsLoading;
  const error = resultsError;

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold font-serif">Election Results</h1>
              <StatusBadge status={electionStatus} />
            </div>
            <p className="text-muted-foreground">
              View detailed election results and statistics
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading results...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {error instanceof Error ? error.message : "Failed to load results. Please try again later."}
                </p>
              </CardContent>
            </Card>
          ) : electionStatus === "upcoming" ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Results Not Yet Available</h3>
                <p className="text-muted-foreground">
                  Results will be published once the voting period has ended and all votes have been counted.
                </p>
              </CardContent>
            </Card>
          ) : resultsData?.results && resultsData.results.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>
                    Total positions: {resultsData.results.length} | Total votes across all positions:{" "}
                    {resultsData.results.reduce((sum, r) => sum + r.totalVotes, 0)}
                  </CardDescription>
                </CardHeader>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {resultsData.results.map((result, index) => (
                  <ResultsChart
                    key={result.positionId || index}
                    positionTitle={result.positionTitle}
                    candidates={result.candidates.map((c) => ({
                      id: c.id,
                      name: c.name,
                      votes: c.votes,
                      percentage: c.percentage,
                    }))}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Results Available</h3>
                <p className="text-muted-foreground">
                  There are no results to display at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

