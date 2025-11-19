import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CandidateCard from "@/components/CandidateCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Candidates() {
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch candidates
  const { data: candidatesData, isLoading: candidatesLoading, error: candidatesError } = useQuery<{ candidates: Array<{ id: string; positionId: string; name: string; photoUrl: string | null; manifesto: string | null; bio: string | null }> }>({
    queryKey: ["/api/candidates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch positions
  const { data: positionsData, isLoading: positionsLoading } = useQuery<{ positions: Array<{ id: string; title: string; description: string | null; order: number }> }>({
    queryKey: ["/api/positions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const isLoading = candidatesLoading || positionsLoading;
  const error = candidatesError;

  // Combine candidates with position titles
  const candidates = useMemo(() => {
    if (!candidatesData?.candidates || !positionsData?.positions) return [];
    
    return candidatesData.candidates.map((candidate) => {
      const position = positionsData.positions.find((p) => p.id === candidate.positionId);
      return {
        id: candidate.id,
        name: candidate.name,
        position: position?.title || "Unknown Position",
        photoUrl: candidate.photoUrl || "/placeholder-avatar.png",
        manifestoSnippet: candidate.manifesto || candidate.bio || "No manifesto available.",
      };
    });
  }, [candidatesData, positionsData]);

  const positions = useMemo(() => {
    return ["all", ...Array.from(new Set(candidates.map((c) => c.position)))];
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesPosition = selectedPosition === "all" || candidate.position === selectedPosition;
      const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.manifestoSnippet.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPosition && matchesSearch;
    });
  }, [candidates, selectedPosition, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4" data-testid="text-page-title">
              Meet the Candidates
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
              Learn about the candidates running for various positions in our Laboratory Technology department elections
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-position">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.slice(1).map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading candidates...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardHeader>
                <div className="inline-flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <CardTitle>Error Loading Candidates</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {error instanceof Error ? error.message : "Failed to load candidates. Please try again later."}
                </p>
              </CardContent>
            </Card>
          ) : filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} {...candidate} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground" data-testid="text-no-results">
                No candidates found matching your search criteria.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
