import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResultsChart from "@/components/ResultsChart";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export default function Results() {
  // Fetch election status
  const { data: electionData, isLoading: electionLoading } = useQuery<{ status: "upcoming" | "active" | "closed"; startDate?: string | null; endDate?: string | null }>({
    queryKey: ["/api/election/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch results
  const { data: resultsData, isLoading: resultsLoading, error: resultsError } = useQuery<{ results: Array<{ positionId: string; positionTitle: string; totalVotes: number; candidates: Array<{ id: string; name: string; photoUrl: string | null; manifesto: string | null; votes: number; percentage: number }> }> }>({
    queryKey: ["/api/results"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const electionStatus = electionData?.status || "upcoming";
  const isLoading = electionLoading || resultsLoading;
  const error = resultsError;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold font-serif" data-testid="text-page-title">
                Election Results
              </h1>
              <StatusBadge status={electionStatus} />
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
              {electionStatus === "active" 
                ? "Live results updating in real-time as votes are counted"
                : electionStatus === "upcoming"
                ? "Results will be available once voting begins"
                : "Final results from the completed election"}
            </p>
          </div>

          {electionStatus === "active" && (
            <Card className="mb-8 bg-accent/50 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 justify-center">
                  <Clock className="h-5 w-5 text-primary animate-pulse" />
                  <p className="text-sm font-medium" data-testid="text-live-update">
                    Live Updates: Results are being updated as votes are counted
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
                <div className="inline-flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <CardTitle>Error Loading Results</CardTitle>
                </div>
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
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Results Not Yet Available</h3>
                <p className="text-muted-foreground">
                  Results will be published once the voting period has ended and all votes have been counted.
                </p>
              </CardContent>
            </Card>
          ) : resultsData?.results && resultsData.results.length > 0 ? (
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
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Results Available</h3>
                <p className="text-muted-foreground">
                  There are no results to display at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
