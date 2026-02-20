"use client";

import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { MonitorCard } from "@/components/monitor/monitor-card";
import { MonitorForm, type MonitorFormSubmission } from "@/components/monitor/monitor-form";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/features/auth/use-auth-guards";
import { GithubTokenError } from "@/features/github-token/errors";
import { useGithubTokenStore } from "@/features/github-token/use-github-token-store";
import { ApiError } from "@/lib/api/client";
import {
  createMonitor,
  deleteMonitor,
  listMonitors,
  pauseMonitor,
  resumeMonitor,
  startMonitor,
} from "@/lib/api/monitor";
import { addWebhookToMonitor, createWebhook, listUserWebhooks } from "@/lib/api/webhook";
import { extractErrorMessage } from "@/lib/utils/error";
import type { Monitor, UserWebhook } from "@/types/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface FeedbackState {
  tone: "error" | "success" | "info";
  message: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, session, isReady, logout } = useRequireAuth();
  const {
    tokens: githubTokens,
    createGithubToken,
    fetchGithubTokens,
    linkTokenToMonitor,
  } = useGithubTokenStore();

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [userWebhooks, setUserWebhooks] = useState<UserWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [pendingByMonitor, setPendingByMonitor] = useState<Record<string, string | null>>({});

  const handleAuthError = useCallback(
    (error: unknown) => {
      if (
        (error instanceof ApiError || error instanceof GithubTokenError) &&
        error.status === 401
      ) {
        logout();
        return true;
      }

      return false;
    },
    [logout],
  );

  const loadMonitors = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);

    try {
      const data = await listMonitors(token);
      setMonitors(data);
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
  }, [handleAuthError, token]);

  const loadGithubTokens = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      await fetchGithubTokens(token);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({
        tone: "error",
        message: extractErrorMessage(error),
      });
    }
  }, [fetchGithubTokens, handleAuthError, token]);

  const loadUserWebhooks = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const data = await listUserWebhooks(token);
      setUserWebhooks(data.filter((item) => item.is_active));
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({
        tone: "error",
        message: extractErrorMessage(error),
      });
    }
  }, [handleAuthError, token]);

  useEffect(() => {
    if (isReady && token) {
      void loadMonitors();
      void loadGithubTokens();
      void loadUserWebhooks();
    }
  }, [isReady, loadGithubTokens, loadMonitors, loadUserWebhooks, token]);

  const monitorStats = useMemo(() => {
    return monitors.reduce(
      (accumulator, monitor) => {
        accumulator.total += 1;

        if (!monitor.is_active) {
          accumulator.paused += 1;
        } else if (monitor.status === "UP") {
          accumulator.up += 1;
        } else {
          accumulator.down += 1;
        }

        return accumulator;
      },
      { total: 0, up: 0, down: 0, paused: 0 },
    );
  }, [monitors]);

  const activeGithubTokens = useMemo(
    () => githubTokens.filter((item) => item.is_active),
    [githubTokens],
  );

  const runMonitorAction = useCallback(
    async (monitorId: string, action: string, task: () => Promise<void>, successMessage: string) => {
      setPendingByMonitor((previous) => ({ ...previous, [monitorId]: action }));
      setFeedback(null);

      try {
        await task();
        setFeedback({ tone: "success", message: successMessage });
        await loadMonitors();
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        setFeedback({
          tone: "error",
          message: extractErrorMessage(error),
        });
      } finally {
        setPendingByMonitor((previous) => ({ ...previous, [monitorId]: null }));
      }
    },
    [handleAuthError, loadMonitors],
  );

  const handleCreate = useCallback(
    async (payload: MonitorFormSubmission) => {
      if (!token) {
        return;
      }

      if (payload.mode !== "create") {
        return;
      }

      setIsCreating(true);
      setFeedback(null);

      try {
        let webhookIdToAttach = payload.webhookId;
        if (!webhookIdToAttach) {
          if (!payload.webhook) {
            throw new Error("Webhook is required when creating a monitor.");
          }

          const normalizedWebhookUrl = payload.webhook.webhook_url.trim();
          const existingWebhooks = await listUserWebhooks(token);

          const matchedWebhook = existingWebhooks.find(
            (webhook) =>
              webhook.provider === payload.webhook?.provider &&
              webhook.webhook_url.trim() === normalizedWebhookUrl,
          );

          const webhook =
            matchedWebhook ??
            (await createWebhook(token, {
              provider: payload.webhook.provider,
              webhook_url: normalizedWebhookUrl,
            }));
          webhookIdToAttach = webhook.id;
        }

        const monitor = await createMonitor(token, payload.monitor);

        try {
          await addWebhookToMonitor(token, monitor.id, webhookIdToAttach);
        } catch (associationError) {
          await deleteMonitor(token, monitor.id).catch(() => undefined);
          throw associationError;
        }

        const githubTokenIdToLink = payload.githubTokenId;

        if (githubTokenIdToLink) {
          try {
            await linkTokenToMonitor(token, monitor.id, githubTokenIdToLink);
          } catch (linkError) {
            if (handleAuthError(linkError)) {
              return;
            }

            setFeedback({
              tone: "error",
              message: `Monitor created, but token linking failed: ${extractErrorMessage(linkError)}`,
            });
            await loadMonitors();
            return;
          }
        }

        setFeedback({
          tone: "success",
          message: githubTokenIdToLink
            ? "Monitor created and GitHub token linked successfully."
            : "Monitor created successfully.",
        });
        await loadMonitors();
        await loadUserWebhooks();
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        setFeedback({
          tone: "error",
          message: extractErrorMessage(error),
        });
      } finally {
        setIsCreating(false);
      }
    },
    [
      handleAuthError,
      linkTokenToMonitor,
      loadMonitors,
      loadUserWebhooks,
      token,
    ],
  );

  const handleCreateGithubToken = useCallback(
    async (accessToken: string) => {
      if (!token) {
        throw new Error("Authentication required.");
      }

      const createdGithubToken = await createGithubToken(token, { access_token: accessToken });
      await loadGithubTokens();
      return createdGithubToken;
    },
    [createGithubToken, loadGithubTokens, token],
  );

  const handleCreateWebhook = useCallback(
    async (provider: "slack" | "discord", webhookUrl: string) => {
      if (!token) {
        throw new Error("Authentication required.");
      }

      const normalizedWebhookUrl = webhookUrl.trim();
      const existingWebhooks = await listUserWebhooks(token);
      const matchedWebhook = existingWebhooks.find(
        (item) => item.provider === provider && item.webhook_url.trim() === normalizedWebhookUrl,
      );

      const webhook =
        matchedWebhook ??
        (await createWebhook(token, {
          provider,
          webhook_url: normalizedWebhookUrl,
        }));

      await loadUserWebhooks();
      return webhook;
    },
    [loadUserWebhooks, token],
  );

  if (!isReady) {
    return null;
  }

  return (
    <AppShell
      title="Your monitors"
      subtitle="Create checks, control runtime state, and inspect each monitor history from one place."
      userEmail={session?.user.email}
      onLogout={logout}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Create monitor</h2>
              <p className="text-sm text-slate-600">
                Create and attach a new webhook or attach an existing one, and optionally link a GitHub token.
              </p>
            </div>
          </div>

          <MonitorForm
            mode="create"
            onSubmit={handleCreate}
            isSubmitting={isCreating}
            githubTokens={activeGithubTokens}
            userWebhooks={userWebhooks}
            onCreateGithubToken={handleCreateGithubToken}
            onCreateWebhook={handleCreateWebhook}
          />
        </section>

        <section className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:grid-cols-4 sm:p-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{monitorStats.total}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Up</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-800">{monitorStats.up}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-xs uppercase tracking-wide text-rose-700">Down</p>
            <p className="mt-2 text-2xl font-semibold text-rose-800">{monitorStats.down}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-700">Paused</p>
            <p className="mt-2 text-2xl font-semibold text-amber-800">{monitorStats.paused}</p>
          </div>
        </section>
      </div>

      <section className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Monitor list</h2>
            <p className="text-sm text-slate-600">Includes start, pause, resume, delete, detail and history access.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void loadMonitors();
              void loadGithubTokens();
              void loadUserWebhooks();
            }}
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            Refresh
          </Button>
        </div>

        {feedback ? <Alert message={feedback.message} tone={feedback.tone} /> : null}

        {isLoading && monitors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading monitors...
          </div>
        ) : null}

        {!isLoading && monitors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
            No monitors yet. Create your first monitor using the form above.
          </div>
        ) : null}

        <div className="space-y-4">
          {monitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              pendingAction={pendingByMonitor[monitor.id] ?? null}
              onOpen={() => router.push(`/monitors/${monitor.id}`)}
              onStart={() =>
                runMonitorAction(
                  monitor.id,
                  "start",
                  () => startMonitor(token ?? "", monitor.id).then(() => undefined),
                  `Monitor \"${monitor.name}\" started.`,
                )
              }
              onPause={() =>
                runMonitorAction(
                  monitor.id,
                  "pause",
                  () => pauseMonitor(token ?? "", monitor.id).then(() => undefined),
                  `Monitor \"${monitor.name}\" paused.`,
                )
              }
              onResume={() =>
                runMonitorAction(
                  monitor.id,
                  "resume",
                  () => resumeMonitor(token ?? "", monitor.id).then(() => undefined),
                  `Monitor \"${monitor.name}\" resumed.`,
                )
              }
              onDelete={async () => {
                const confirmed = window.confirm(
                  `Delete monitor \"${monitor.name}\"? This cannot be undone.`,
                );

                if (!confirmed) {
                  return;
                }

                await runMonitorAction(
                  monitor.id,
                  "delete",
                  () => deleteMonitor(token ?? "", monitor.id).then(() => undefined),
                  `Monitor \"${monitor.name}\" deleted.`,
                );
              }}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
