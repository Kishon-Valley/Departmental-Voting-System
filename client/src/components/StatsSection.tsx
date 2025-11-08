import { Card } from "@/components/ui/card";
import { Users, Award, CheckCircle } from "lucide-react";

export default function StatsSection() {
  const stats = [
    {
      icon: Award,
      value: "8",
      label: "Open Positions",
      color: "text-chart-1",
    },
    {
      icon: Users,
      value: "24",
      label: "Total Candidates",
      color: "text-chart-2",
    },
    {
      icon: CheckCircle,
      value: "1,234",
      label: "Eligible Voters",
      color: "text-chart-3",
    },
  ];

  return (
    <section className="py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center gap-4">
                <div className={`${stat.color} bg-accent rounded-lg p-3`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold font-serif" data-testid={`text-stat-value-${index}`}>
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-stat-label-${index}`}>
                    {stat.label}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
