"use client";

import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { MonitorActions } from "@/components/monitor/monitor-actions";
import { MonitorForm } from "@/components/monitor/monitor-form";
import { MonitorHistoryTable } from "@/components/monitor/monitor-history-table";
import { StatusPill } from "@/components/monitor/status-pill";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/features/auth/use-auth-guards";
import { ApiError } from "@/lib/api/client";
import {
  deleteMonitor,
  getMonitorById,
  getMonitorHistory,
  pauseMonitor,
  resumeMonitor,
  startMonitor,
  updateMonitor,
} from "@/lib/api/monitor";
import { extractErrorMessage } from "@/lib/utils/error";
import type { Monitor, MonitorCheck, UpdateMonitorPayload } from "@/types/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface FeedbackState {
  tone: "error" | "success" | "info";
  message: string;
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

export default function MonitorDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const monitorId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { token, session, isReady, logout } = useRequireAuth();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [history, setHistory] = useState<MonitorCheck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleAuthError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return true;
      }

      return false;
    },
    [logout],
  );

  const loadData = useCallback(async () => {
    if (!token || !monitorId) {
      return;
    }

    setIsLoading(true);

    try {
      const [monitorDetails, monitorHistory] = await Promise.all([
        getMonitorById(token, monitorId),
        getMonitorHistory(token, monitorId),
      ]);

      setMonitor(monitorDetails);
      setHistory(monitorHistory);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({
        tone: "error",
        message: extractErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthError, monitorId, token]);

  useEffect(() => {
    if (isReady && token && monitorId) {
      void loadData();
    }
  }, [isReady, loadData, monitorId, token]);

  const runAction = useCallback(
    async (action: string, task: () => Promise<void>, successMessage: string) => {
      setPendingAction(action);
      setFeedback(null);

      try {
        await task();
        setFeedback({ tone: "success", message: successMessage });
        await loadData();
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        setFeedback({ tone: "error", message: extractErrorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    },
    [handleAuthError, loadData],
  );

  const handleUpdate = useCallback(
    async (payload: UpdateMonitorPayload) => {
      if (!token || !monitorId) {
        return;
      }

      setIsUpdating(true);
      setFeedback(null);

      try {
        const updated = await updateMonitor(token, monitorId, payload);
        setMonitor(updated);
        setFeedback({ tone: "success", message: "Monitor updated successfully." });
        await loadData();
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        setFeedback({ tone: "error", message: extractErrorMessage(error) });
      } finally {
        setIsUpdating(false);
      }
    },
    [handleAuthError, loadData, monitorId, token],
  );

  if (!isReady) {
    return null;
  }

  if (isLoading && !monitor) {
    return (
      <AppShell
        title="Monitor details"
        subtitle="Loading monitor data"
        userEmail={session?.user.email}
        onLogout={logout}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading monitor details...
        </div>
      </AppShell>
    );
  }

  if (!monitor) {
    return (
      <AppShell
        title="Monitor details"
        subtitle="Unable to load monitor"
        userEmail={session?.user.email}
        onLogout={logout}
      >
        <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <p>Monitor not found or you do not have access.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-[9px] text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <span aria-hidden>&larr;</span>
            <span>Back to dashboard</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={monitor.name}
      subtitle="Monitor details, control actions, and full check history"
      userEmail={session?.user.email}
      onLogout={logout}
    >
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-[9px] text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          <span aria-hidden>&larr;</span>
          <span>Back to dashboard</span>
        </Link>
      </div>

      {feedback ? <Alert message={feedback.message} tone={feedback.tone} /> : null}

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={monitor.status} isActive={monitor.is_active} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {monitor.method}
              </span>
            </div>
            <p className="break-all text-sm text-slate-600">
              <span className="font-medium text-slate-700">Target URL:</span> {monitor.url}
            </p>
            <p className="break-all text-sm text-slate-600">
              <span className="font-medium text-slate-700">Repo Link:</span> {monitor.repo_link || "-"}
            </p>
          </div>

          <MonitorActions
            monitor={monitor}
            pendingAction={pendingAction}
            onStart={() =>
              runAction(
                "start",
                () => startMonitor(token ?? "", monitor.id).then(() => undefined),
                "Monitor started.",
              )
            }
            onPause={() =>
              runAction(
                "pause",
                () => pauseMonitor(token ?? "", monitor.id).then(() => undefined),
                "Monitor paused.",
              )
            }
            onResume={() =>
              runAction(
                "resume",
                () => resumeMonitor(token ?? "", monitor.id).then(() => undefined),
                "Monitor resumed.",
              )
            }
            onDelete={async () => {
              const confirmed = window.confirm(
                `Delete monitor \"${monitor.name}\"? This cannot be undone.`,
              );
              if (!confirmed) {
                return;
              }

              setPendingAction("delete");
              setFeedback(null);

              try {
                await deleteMonitor(token ?? "", monitor.id);
                router.replace("/dashboard");
              } catch (error) {
                if (handleAuthError(error)) {
                  return;
                }

                setFeedback({ tone: "error", message: extractErrorMessage(error) });
              } finally {
                setPendingAction(null);
              }
            }}
          />
        </div>

        <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-medium text-slate-500">Check interval</dt>
            <dd className="font-semibold text-slate-800">{monitor.check_interval}s</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Timeout</dt>
            <dd className="font-semibold text-slate-800">{monitor.timeout}s</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Created</dt>
            <dd className="font-semibold text-slate-800">{formatDate(monitor.created_at)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Last checked</dt>
            <dd className="font-semibold text-slate-800">{formatDate(monitor.last_checked_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold text-slate-900">Update monitor</h2>
        <p className="mt-1 text-sm text-slate-600">
          Uses <code className="rounded bg-slate-100 px-1 py-0.5">PATCH /monitor/:id</code>.
        </p>

        <div className="mt-4">
          <MonitorForm
            mode="update"
            initialValues={monitor}
            onSubmit={(payload) => handleUpdate(payload as UpdateMonitorPayload)}
            isSubmitting={isUpdating}
            submitLabel="Save Changes"
          />
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">History report</h2>
            <p className="text-sm text-slate-600">
              Uses <code className="rounded bg-slate-100 px-1 py-0.5">GET /monitor/:id/history</code>.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => void loadData()}
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            Refresh History
          </Button>
        </div>

        <MonitorHistoryTable history={history} />
      </section>
    </AppShell>
  );
}
