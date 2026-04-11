import { Users, Briefcase, UserCheck, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

type PublicStats = {
  openPositions: number;
  totalCandidates: number;
  eligibleVoters: number;
};

function formatCount(n: number) {
  return n.toLocaleString();
}

export default function StatsSection() {
  const { data, isLoading, isError } = useQuery<PublicStats>({
    queryKey: ["/api/stats/public"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const display = (n: number | undefined) => {
    if (isLoading) return null;
    if (isError) return "—";
    return formatCount(n ?? 0);
  };

  const stats = [
    {
      icon: Briefcase,
      value: display(data?.openPositions),
      label: "Open Positions",
      cardBg: "bg-blue-50/80",
      iconBg: "bg-blue-100",
      borderColor: "border-blue-100",
      textColor: "text-blue-800/90",
    },
    {
      icon: Users,
      value: display(data?.totalCandidates),
      label: "Total Candidates",
      cardBg: "bg-purple-50/80",
      iconBg: "bg-purple-100",
      borderColor: "border-purple-100",
      textColor: "text-purple-800/90",
    },
    {
      icon: UserCheck,
      value: display(data?.eligibleVoters),
      label: "Eligible Voters",
      cardBg: "bg-emerald-50/80",
      iconBg: "bg-emerald-100",
      borderColor: "border-emerald-100",
      textColor: "text-emerald-800/90",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {isError && (
        <p className="text-center text-sm text-muted-foreground mb-4" role="alert">
          Could not load live statistics. Counts may be unavailable.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.cardBg} backdrop-blur-md rounded-2xl p-6 border ${stat.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
          >
            <div className="flex items-center gap-4">
              <div className={`${stat.iconBg} rounded-xl p-3 shadow-md border border-white/60`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
              <div className="flex-1">
                <p
                  className={`text-3xl font-bold ${stat.textColor} mb-1 tabular-nums min-h-[2.25rem] flex items-center`}
                  data-testid={`text-stat-value-${index}`}
                >
                  {stat.value === null ? (
                    <Loader2 className={`h-8 w-8 animate-spin ${stat.textColor} opacity-70`} aria-label="Loading" />
                  ) : (
                    <span>{stat.value}</span>
                  )}
                </p>
                <p
                  className={`text-sm font-semibold ${stat.textColor} opacity-80`}
                  data-testid={`text-stat-label-${index}`}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
