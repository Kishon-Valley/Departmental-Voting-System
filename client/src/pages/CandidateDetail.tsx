import { useRoute, Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { Candidate, Position } from "@shared/schema.js";

export default function CandidateDetail() {
  const [, params] = useRoute("/candidate/:id");
  const candidateId = params?.id;

  const { data: candidateData, isLoading: candidateLoading, error: candidateError } = useQuery<{ candidate: Candidate }>({
    queryKey: [`/api/candidates/${candidateId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!candidateId,
  });

  const candidate = candidateData?.candidate;

  const { data: positionsData } = useQuery<{ positions: Position[] }>({
    queryKey: ["/api/positions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const positionTitle = candidate?.positionId
    ? positionsData?.positions?.find((p) => p.id === candidate.positionId)?.title || "Unknown Position"
    : "Unknown Position";

  const isLoading = candidateLoading;
  const error = candidateError;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading candidate...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/candidates">
              <Button variant="ghost" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Candidates
              </Button>
            </Link>
            <Card className="border-destructive">
              <CardHeader>
                <div className="inline-flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <CardTitle>Candidate Not Found</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {error instanceof Error ? error.message : "Failed to load candidate details."}
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/candidates">
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </Link>

          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0">
                  <img
                    src={candidate.photoUrl || "/placeholder-avatar.png"}
                    alt={candidate.name}
                    className="w-48 h-48 rounded-lg object-cover"
                    data-testid="img-candidate"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold font-serif mb-3" data-testid="text-candidate-name">
                    {candidate.name}
                  </h1>
                  <Badge className="mb-4" data-testid="badge-position">
                    Running for {positionTitle}
                  </Badge>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-bio">
                    {candidate.bio || "No bio available."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-serif">Manifesto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {candidate.manifesto ? (
                  candidate.manifesto.split('\n').map((paragraph, index) => {
                    if (paragraph.trim() === '') return null;
                    if (paragraph.startsWith('**')) {
                      const text = paragraph.replace(/\*\*/g, '');
                      return (
                        <h3 key={index} className="font-semibold text-lg mt-6 mb-3">
                          {text}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('-')) {
                      return (
                        <li key={index} className="ml-6 mb-2 text-muted-foreground leading-relaxed">
                          {paragraph.substring(1).trim()}
                        </li>
                      );
                    }
                    return (
                      <p key={index} className="mb-4 text-muted-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground">No manifesto available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 flex justify-center">
            <Link href="/vote">
              <Button size="lg" data-testid="button-vote">
                Vote for this Candidate
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
