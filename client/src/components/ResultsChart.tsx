import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

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

const PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const barChartConfig = {
  votes: {
    label: "Votes",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function shortName(name: string, max = 16) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export default function ResultsChart({ positionTitle, candidates }: ResultsChartProps) {
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const maxVotes = Math.max(...candidates.map((c) => c.votes), 0);
  const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);

  const barData = sortedCandidates.map((c) => ({
    label: shortName(c.name),
    fullName: c.name,
    votes: c.votes,
  }));

  const pieData = sortedCandidates
    .filter((c) => c.votes > 0)
    .map((c) => ({ name: c.name, votes: c.votes }));

  const hasVotes = totalVotes > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif" data-testid="text-position-title">
          {positionTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="text-total-votes">
          Total votes: {totalVotes}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasVotes ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Votes by candidate</p>
              <ChartContainer config={barChartConfig} className="h-[200px] w-full">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, Math.max(maxVotes, 1)]} hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={88}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                          return row?.fullName ?? "";
                        }}
                      />
                    }
                  />
                  <Bar dataKey="votes" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Vote share</p>
              <ChartContainer
                config={{
                  votes: { label: "Votes", color: "hsl(var(--chart-1))" },
                }}
                className="h-[200px] w-full"
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="votes"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </PieChart>
              </ChartContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No votes recorded yet for this position.</p>
        )}

        <div className="space-y-4 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">Breakdown</p>
          {sortedCandidates.map((candidate, index) => (
            <div key={candidate.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                    aria-hidden
                  />
                  <span className="font-medium truncate" data-testid={`text-candidate-name-${candidate.id}`}>
                    {candidate.name}
                  </span>
                  {index === 0 && maxVotes > 0 && (
                    <Badge variant="default" className="bg-chart-2">
                      Leading
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground" data-testid={`text-votes-${candidate.id}`}>
                    {candidate.votes} votes
                  </span>
                  <span
                    className="text-sm font-medium min-w-[3rem] text-right"
                    data-testid={`text-percentage-${candidate.id}`}
                  >
                    {candidate.percentage}%
                  </span>
                </div>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${candidate.percentage}%`,
                    backgroundColor: PALETTE[index % PALETTE.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
