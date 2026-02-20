"use client";

import { AppShell } from "@/components/layout/app-shell";
import { LiveCodeWorkerLogs } from "@/components/monitor/live-code-worker-logs";
import { useRequireAuth } from "@/features/auth/use-auth-guards";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function MonitorLiveLogsPage() {
  const { session, isReady, logout } = useRequireAuth();
  const params = useParams<{ id: string | string[] }>();
  const monitorId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!isReady) {
    return null;
  }

  return (
    <AppShell
      title="Live Code Worker Logs"
      subtitle="Stream real-time AI code-worker logs with reconnection and filtering controls."
      userEmail={session?.user.email}
      onLogout={logout}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/monitors/${monitorId}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          Back to Monitor Details
        </Link>
      </div>

      <LiveCodeWorkerLogs defaultBaseUrl="http://localhost:8080" />
    </AppShell>
  );
}
