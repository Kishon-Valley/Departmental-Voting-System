import { Users, Briefcase, UserCheck } from "lucide-react";

export default function StatsSection() {
  const stats = [
    {
      icon: Briefcase,
      value: "8",
      label: "Open Positions",
      cardBg: "bg-blue-50/80",
      iconBg: "bg-blue-100",
      borderColor: "border-blue-100",
      textColor: "text-blue-800/90",
    },
    {
      icon: Users,
      value: "24",
      label: "Total Candidates",
      cardBg: "bg-purple-50/80",
      iconBg: "bg-purple-100",
      borderColor: "border-purple-100",
      textColor: "text-purple-800/90",
    },
    {
      icon: UserCheck,
      value: "1,234",
      label: "Eligible Voters",
      cardBg: "bg-emerald-50/80",
      iconBg: "bg-emerald-100",
      borderColor: "border-emerald-100",
      textColor: "text-emerald-800/90",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
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
                <p className={`text-3xl font-bold ${stat.textColor} mb-1 tabular-nums`} data-testid={`text-stat-value-${index}`}>
                  {stat.value}
                </p>
                <p className={`text-sm font-semibold ${stat.textColor} opacity-80`} data-testid={`text-stat-label-${index}`}>
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
