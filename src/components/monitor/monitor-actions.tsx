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
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      {primaryAction === "pause" ? (
        <Button
          variant="secondary"
          loading={pendingAction === "pause"}
          className="w-full sm:w-auto"
          onClick={() => void onPause()}
        >
          Pause
        </Button>
      ) : primaryAction === "resume" ? (
        <Button
          variant="secondary"
          loading={pendingAction === "resume"}
          className="w-full sm:w-auto"
          onClick={() => void onResume()}
        >
          Resume
        </Button>
      ) : (
        <Button
          variant="secondary"
          loading={pendingAction === "start"}
          className="w-full sm:w-auto"
          onClick={() => void onStart()}
        >
          Start
        </Button>
      )}

      <Button
        variant="danger"
        loading={pendingAction === "delete"}
        className="w-full sm:w-auto"
        onClick={() => void onDelete()}
      >
        Delete
      </Button>
    </div>
  );
}
