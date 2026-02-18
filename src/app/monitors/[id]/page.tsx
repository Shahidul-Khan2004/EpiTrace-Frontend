"use client";

import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { MonitorActions } from "@/components/monitor/monitor-actions";
import { MonitorForm, type MonitorFormSubmission } from "@/components/monitor/monitor-form";
import { MonitorHistoryTable } from "@/components/monitor/monitor-history-table";
import { StatusPill } from "@/components/monitor/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import {
  addWebhookToMonitor,
  createWebhook,
  listMonitorWebhooks,
  listUserWebhooks,
  removeWebhookFromMonitor,
} from "@/lib/api/webhook";
import { extractErrorMessage } from "@/lib/utils/error";
import type {
  Monitor,
  MonitorCheck,
  NotificationProvider,
  UpdateMonitorPayload,
  UserWebhook,
} from "@/types/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

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

function formatProvider(provider: NotificationProvider): string {
  return provider === "slack" ? "Slack" : "Discord";
}

function maskWebhookUrl(webhookUrl: string): string {
  try {
    const parsed = new URL(webhookUrl);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      return parsed.origin;
    }

    const maskedSegments = pathSegments.map((segment, index) => (index < 2 ? segment : "***"));
    return `${parsed.origin}/${maskedSegments.join("/")}`;
  } catch {
    return "Invalid URL";
  }
}

function isValidWebhookUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function MonitorDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const monitorId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { token, session, isReady, logout } = useRequireAuth();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [history, setHistory] = useState<MonitorCheck[]>([]);
  const [userWebhooks, setUserWebhooks] = useState<UserWebhook[]>([]);
  const [monitorWebhooks, setMonitorWebhooks] = useState<UserWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [isAttachingWebhook, setIsAttachingWebhook] = useState(false);
  const [removingWebhookId, setRemovingWebhookId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [newWebhookProvider, setNewWebhookProvider] = useState<NotificationProvider>("slack");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedWebhookId, setSelectedWebhookId] = useState("");

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
      const [monitorDetails, monitorHistory, allWebhooks, linkedWebhooks] = await Promise.all([
        getMonitorById(token, monitorId),
        getMonitorHistory(token, monitorId),
        listUserWebhooks(token),
        listMonitorWebhooks(token, monitorId),
      ]);

      setMonitor(monitorDetails);
      setHistory(monitorHistory);
      setUserWebhooks(allWebhooks);
      setMonitorWebhooks(linkedWebhooks);
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

  const linkedWebhookIds = useMemo(
    () => new Set(monitorWebhooks.map((webhook) => webhook.id)),
    [monitorWebhooks],
  );

  const attachableWebhooks = useMemo(
    () => userWebhooks.filter((webhook) => !linkedWebhookIds.has(webhook.id)),
    [linkedWebhookIds, userWebhooks],
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

  const handleCreateAndAttachWebhook = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!token || !monitorId) {
        return;
      }

      const normalizedUrl = newWebhookUrl.trim();
      if (!normalizedUrl) {
        setFeedback({ tone: "error", message: "Webhook URL is required." });
        return;
      }

      if (!isValidWebhookUrl(normalizedUrl)) {
        setFeedback({ tone: "error", message: "Webhook URL must be a valid HTTP(S) URL." });
        return;
      }

      setIsCreatingWebhook(true);
      setFeedback(null);
      let createdWebhook: UserWebhook | null = null;

      try {
        createdWebhook = await createWebhook(token, {
          provider: newWebhookProvider,
          webhook_url: normalizedUrl,
        });

        await addWebhookToMonitor(token, monitorId, createdWebhook.id);
        setNewWebhookUrl("");
        setFeedback({ tone: "success", message: "Webhook created and linked to this monitor." });
        await loadData();
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        if (createdWebhook) {
          setFeedback({
            tone: "error",
            message: `Webhook created, but linking failed: ${extractErrorMessage(error)}`,
          });
          await loadData();
          return;
        }

        setFeedback({ tone: "error", message: extractErrorMessage(error) });
      } finally {
        setIsCreatingWebhook(false);
      }
    },
    [handleAuthError, loadData, monitorId, newWebhookProvider, newWebhookUrl, token],
  );

  const handleAttachWebhook = useCallback(async () => {
    if (!token || !monitorId) {
      return;
    }

    if (!selectedWebhookId) {
      setFeedback({ tone: "error", message: "Select a webhook to attach." });
      return;
    }

    setIsAttachingWebhook(true);
    setFeedback(null);

    try {
      await addWebhookToMonitor(token, monitorId, selectedWebhookId);
      setSelectedWebhookId("");
      setFeedback({ tone: "success", message: "Webhook attached to this monitor." });
      await loadData();
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({ tone: "error", message: extractErrorMessage(error) });
    } finally {
      setIsAttachingWebhook(false);
    }
  }, [handleAuthError, loadData, monitorId, selectedWebhookId, token]);

  const handleRemoveWebhook = useCallback(
    async (webhookId: string) => {
      if (!token || !monitorId) {
        return;
      }

      setRemovingWebhookId(webhookId);
      setFeedback(null);

      try {
        await removeWebhookFromMonitor(token, monitorId, webhookId);
        setFeedback({ tone: "success", message: "Webhook removed from this monitor." });
        await loadData();
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        setFeedback({ tone: "error", message: extractErrorMessage(error) });
      } finally {
        setRemovingWebhookId(null);
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
            onSubmit={(payload: MonitorFormSubmission) => {
              if (payload.mode !== "update") {
                return Promise.resolve();
              }

              return handleUpdate(payload.monitor);
            }}
            isSubmitting={isUpdating}
            submitLabel="Save Changes"
          />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Notification webhooks</h2>
            <p className="text-sm text-slate-600">
              Create webhooks and link them to this monitor using <code className="rounded bg-slate-100 px-1 py-0.5">/webhook</code> routes.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void loadData()}
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            Refresh Webhooks
          </Button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form
            className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
            onSubmit={handleCreateAndAttachWebhook}
          >
            <h3 className="text-base font-semibold text-slate-900">Create and attach webhook</h3>
            <Select
              label="Provider"
              value={newWebhookProvider}
              onChange={(event) =>
                setNewWebhookProvider(event.target.value as NotificationProvider)
              }
            >
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
            </Select>
            <Input
              label="Webhook URL"
              type="url"
              placeholder="https://hooks.slack.com/services/XXX/YYY/ZZZ"
              value={newWebhookUrl}
              onChange={(event) => setNewWebhookUrl(event.target.value)}
              required
            />
            <Button type="submit" loading={isCreatingWebhook} className="w-full sm:w-auto">
              Create + Attach
            </Button>
          </form>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-base font-semibold text-slate-900">Attach existing webhook</h3>
            <Select
              label="Active user webhooks"
              value={selectedWebhookId}
              onChange={(event) => setSelectedWebhookId(event.target.value)}
              disabled={attachableWebhooks.length === 0}
            >
              <option value="">
                {attachableWebhooks.length === 0
                  ? "No webhook available to attach"
                  : "Select a webhook"}
              </option>
              {attachableWebhooks.map((webhook) => (
                <option key={webhook.id} value={webhook.id}>
                  {formatProvider(webhook.provider)} - {maskWebhookUrl(webhook.webhook_url)}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              onClick={() => void handleAttachWebhook()}
              loading={isAttachingWebhook}
              disabled={!selectedWebhookId || attachableWebhooks.length === 0}
              className="w-full sm:w-auto"
            >
              Attach Selected Webhook
            </Button>
            {userWebhooks.length === 0 ? (
              <p className="text-sm text-slate-600">
                No active user webhooks exist yet. Create one in the left panel.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <h3 className="text-base font-semibold text-slate-900">Linked to this monitor</h3>

          {monitorWebhooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No webhooks linked yet.
            </div>
          ) : (
            <div className="space-y-3">
              {monitorWebhooks.map((webhook) => (
                <article
                  key={webhook.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatProvider(webhook.provider)}
                    </p>
                    <p className="break-all text-sm text-slate-600">
                      {maskWebhookUrl(webhook.webhook_url)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created {formatDate(webhook.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    loading={removingWebhookId === webhook.id}
                    onClick={() => void handleRemoveWebhook(webhook.id)}
                    className="w-full sm:w-auto"
                  >
                    Remove
                  </Button>
                </article>
              ))}
            </div>
          )}
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
