import { Badge } from "@/components/ui/badge";
import type { MonitorCheck } from "@/types/api";

interface MonitorHistoryTableProps {
  history: MonitorCheck[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function MonitorHistoryTable({ history }: MonitorHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        No checks yet for this monitor.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">HTTP Code</th>
            <th className="px-4 py-3">Response Time</th>
            <th className="px-4 py-3">Error</th>
            <th className="px-4 py-3">Checked At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {history.map((entry) => (
            <tr key={entry.id}>
              <td className="px-4 py-3">
                <Badge tone={entry.status === "UP" ? "success" : "danger"}>{entry.status}</Badge>
              </td>
              <td className="px-4 py-3">{entry.status_code ?? "-"}</td>
              <td className="px-4 py-3">{entry.response_time_ms ?? "-"}</td>
              <td className="max-w-xs truncate px-4 py-3">{entry.error_message ?? "-"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(entry.checked_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
