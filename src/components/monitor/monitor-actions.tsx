import { Button } from "@/components/ui/button";
import type { Monitor } from "@/types/api";

interface MonitorActionsProps {
  monitor: Monitor;
  pendingAction: string | null;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function getPrimaryActionLabel(monitor: Monitor) {
  if (monitor.is_active) {
    return "pause";
  }

  if (monitor.last_checked_at) {
    return "resume";
  }

  return "start";
}

export function MonitorActions({
  monitor,
  pendingAction,
  onStart,
  onPause,
  onResume,
  onDelete,
}: MonitorActionsProps) {
  const primaryAction = getPrimaryActionLabel(monitor);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primaryAction === "pause" ? (
        <Button
          variant="secondary"
          loading={pendingAction === "pause"}
          onClick={() => void onPause()}
        >
          Pause
        </Button>
      ) : primaryAction === "resume" ? (
        <Button
          variant="secondary"
          loading={pendingAction === "resume"}
          onClick={() => void onResume()}
        >
          Resume
        </Button>
      ) : (
        <Button
          variant="secondary"
          loading={pendingAction === "start"}
          onClick={() => void onStart()}
        >
          Start
        </Button>
      )}

      <Button variant="danger" loading={pendingAction === "delete"} onClick={() => void onDelete()}>
        Delete
      </Button>
    </div>
  );
}
