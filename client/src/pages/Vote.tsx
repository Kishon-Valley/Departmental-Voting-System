import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import VotingForm from "@/components/VotingForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, Loader2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  photoUrl: string | null;
  manifesto: string | null;
}

interface Position {
  id: string;
  title: string;
  candidates: Candidate[];
}

export default function Vote() {
  const [votingComplete, setVotingComplete] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch positions
  const { data: positionsData, isLoading: positionsLoading, error: positionsError } = useQuery<{ positions: Array<{ id: string; title: string; description: string | null; order: number }> }>({
    queryKey: ["/api/positions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch candidates
  const { data: candidatesData, isLoading: candidatesLoading, error: candidatesError } = useQuery<{ candidates: Array<{ id: string; positionId: string; name: string; photoUrl: string | null; manifesto: string | null; bio: string | null }> }>({
    queryKey: ["/api/candidates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Check if user has already voted
  const { data: myVotesData } = useQuery<{ votes: Array<{ id: string; studentId: string; positionId: string; candidateId: string }> }>({
    queryKey: ["/api/votes/my-votes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  // Combine positions and candidates
  const positions: Position[] = positionsData?.positions
    ?.map((position) => ({
      id: position.id,
      title: position.title,
      candidates:
        candidatesData?.candidates
          ?.filter((c) => c.positionId === position.id)
          .map((c): Candidate => ({
            id: c.id,
            name: c.name,
            photoUrl: c.photoUrl || "/placeholder-avatar.png",
            manifesto: c.manifesto || "No manifesto available.",
          })) || [],
    }))
    .filter((p) => p.candidates.length > 0) // Only show positions with candidates
    .sort((a, b) => {
      // Sort by order from positions data
      const aOrder = positionsData?.positions?.find((p) => p.id === a.id)?.order || 0;
      const bOrder = positionsData?.positions?.find((p) => p.id === b.id)?.order || 0;
      return aOrder - bOrder;
    }) || [];

  const isLoading = positionsLoading || candidatesLoading;
  const error = positionsError || candidatesError;

  // Check if user has already voted
  const hasVoted = user?.hasVoted || (myVotesData?.votes && myVotesData.votes.length > 0);

  const handleVoteSubmit = async (votes: Record<string, string>) => {
    // This will be handled by VotingForm component
    setVotingComplete(true);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {hasVoted && !votingComplete ? (
            <div className="max-w-2xl mx-auto text-center">
              <Card>
                <CardHeader>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 mx-auto mb-4">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-2xl font-serif" data-testid="text-already-voted-title">
                    You Have Already Voted
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-already-voted-message">
                    You have already submitted your vote for this election. Each student can only vote once.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/results">
                      <Button variant="outline" data-testid="button-view-results">
                        View Results
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button data-testid="button-back-home">
                        Back to Home
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading voting information...</p>
              </div>
            </div>
          ) : error ? (
            <div className="max-w-2xl mx-auto">
              <Card className="border-destructive">
                <CardHeader>
                  <div className="inline-flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <CardTitle>Error Loading Voting Data</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {error instanceof Error ? error.message : "Failed to load voting information. Please try again later."}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : positions.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center">
              <Card>
                <CardContent className="p-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Positions Available</h3>
                  <p className="text-muted-foreground">
                    There are currently no positions available for voting. Please check back later.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : !votingComplete ? (
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                  <h1 className="text-4xl md:text-5xl font-bold font-serif" data-testid="text-page-title">
                    Cast Your Vote
                  </h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
                  Review each candidate carefully and select your preferred choice for each position
                </p>
              </div>

              <div className="mb-8">
                <Card className="bg-accent/50 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">Secure Voting</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Your vote is encrypted and anonymous. Once submitted, votes cannot be changed. Please review carefully before confirming.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <VotingForm positions={positions as Parameters<typeof VotingForm>[0]['positions']} onSubmit={handleVoteSubmit} />
            </>
          ) : (
            <div className="max-w-2xl mx-auto text-center">
              <Card>
                <CardHeader>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10 text-chart-2 mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-2xl font-serif" data-testid="text-success-title">
                    Vote Submitted Successfully!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-success-message">
                    Thank you for participating in the Laboratory Technology department elections. Your vote has been recorded securely and anonymously.
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Confirmation ID</p>
                    <code className="text-xs bg-background px-3 py-1 rounded border" data-testid="text-confirmation-id">
                      VOTE-{Math.random().toString(36).substring(2, 10).toUpperCase()}
                    </code>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/results">
                      <Button variant="outline" data-testid="button-view-results">
                        View Results
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button data-testid="button-back-home">
                        Back to Home
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
    </ProtectedRoute>
  );
}
