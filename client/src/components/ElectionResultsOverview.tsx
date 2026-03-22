import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  votes: {
    label: "Votes cast",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type Row = { positionTitle: string; totalVotes: number };

function shortTitle(title: string, max = 22) {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

interface ElectionResultsOverviewProps {
  rows: Row[];
}

export default function ElectionResultsOverview({ rows }: ElectionResultsOverviewProps) {
  const data = rows.map((r) => ({
    position: shortTitle(r.positionTitle),
    fullTitle: r.positionTitle,
    votes: r.totalVotes,
  }));

  if (data.length === 0) {
    return null;
  }

  const maxVotes = Math.max(...data.map((d) => d.votes), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Turnout by position</CardTitle>
        <CardDescription>
          Total ballots recorded for each office (same voter counts once per position)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[min(360px,50vh)] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" domain={[0, maxVotes]} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="position"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { fullTitle?: string } | undefined;
                    return row?.fullTitle ?? "";
                  }}
                />
              }
            />
            <Bar dataKey="votes" fill="var(--color-votes)" radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
