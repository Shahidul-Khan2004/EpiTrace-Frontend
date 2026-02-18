import { Badge } from "@/components/ui/badge";

interface StatusPillProps {
  status: "UP" | "DOWN" | null;
  isActive: boolean;
}

export function StatusPill({ status, isActive }: StatusPillProps) {
  const monitorTone = !isActive ? "warning" : status === "UP" ? "success" : "danger";
  const monitorLabel = !isActive ? "PAUSED" : status ?? "UNKNOWN";

  if (monitorLabel === "PAUSED") {
    return <span className="text-xs font-semibold tracking-wide text-slate-700">{monitorLabel}</span>;
  }

  return <Badge tone={monitorTone}>{monitorLabel}</Badge>;
}
