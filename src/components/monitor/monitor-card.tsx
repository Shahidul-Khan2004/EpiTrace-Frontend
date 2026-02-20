import { MonitorActions } from "@/components/monitor/monitor-actions";
import { StatusPill } from "@/components/monitor/status-pill";
import { Button } from "@/components/ui/button";
import type { Monitor } from "@/types/api";

interface MonitorCardProps {
  monitor: Monitor;
  pendingAction: string | null;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onDelete: () => Promise<void>;
  onOpen: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function MonitorCard({
  monitor,
  pendingAction,
  onStart,
  onPause,
  onResume,
  onDelete,
  onOpen,
}: MonitorCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{monitor.name}</h3>
          <p className="max-w-2xl break-all text-sm text-slate-600">
            <span className="font-medium text-slate-700">Target URL:</span> {monitor.url}
          </p>
          <p className="max-w-2xl break-all text-sm text-slate-600">
            <span className="font-medium text-slate-700">Repo Link:</span> {monitor.repo_link || "-"}
          </p>
        </div>
        <StatusPill isActive={monitor.is_active} status={monitor.status} />
      </div>

      <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-medium text-slate-500">Method</dt>
          <dd className="font-semibold text-slate-800">{monitor.method}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Interval</dt>
          <dd className="font-semibold text-slate-800">{monitor.check_interval}s</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Timeout</dt>
          <dd className="font-semibold text-slate-800">{monitor.timeout}s</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Last Check</dt>
          <dd className="font-semibold text-slate-800">{formatDate(monitor.last_checked_at)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onOpen} className="w-full sm:w-auto">
          View Details
        </Button>

        <MonitorActions
          monitor={monitor}
          pendingAction={pendingAction}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}
