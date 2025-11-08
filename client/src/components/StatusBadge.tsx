import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

export type ElectionStatus = "upcoming" | "active" | "closed";

interface StatusBadgeProps {
  status: ElectionStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    upcoming: {
      label: "Upcoming",
      icon: Clock,
      className: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    },
    active: {
      label: "Active",
      icon: CheckCircle2,
      className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    },
    closed: {
      label: "Closed",
      icon: XCircle,
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={className} data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
