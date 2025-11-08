import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CandidateResult {
  id: string;
  name: string;
  votes: number;
  percentage: number;
}

interface ResultsChartProps {
  positionTitle: string;
  candidates: CandidateResult[];
}

export default function ResultsChart({ positionTitle, candidates }: ResultsChartProps) {
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const maxVotes = Math.max(...candidates.map((c) => c.votes));
  const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif" data-testid="text-position-title">
          {positionTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="text-total-votes">
          Total Votes: {totalVotes}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedCandidates.map((candidate, index) => (
          <div key={candidate.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium truncate" data-testid={`text-candidate-name-${candidate.id}`}>
                  {candidate.name}
                </span>
                {index === 0 && maxVotes > 0 && (
                  <Badge variant="default" className="bg-chart-2">
                    Winner
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground" data-testid={`text-votes-${candidate.id}`}>
                  {candidate.votes} votes
                </span>
                <span className="text-sm font-medium min-w-[3rem] text-right" data-testid={`text-percentage-${candidate.id}`}>
                  {candidate.percentage}%
                </span>
              </div>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${candidate.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
