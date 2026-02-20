"use client";

import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { MonitorActions } from "@/components/monitor/monitor-actions";
import { MonitorForm, type MonitorFormSubmission } from "@/components/monitor/monitor-form";
import { MonitorHistoryTable } from "@/components/monitor/monitor-history-table";
import { StatusPill } from "@/components/monitor/status-pill";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useRequireAuth } from "@/features/auth/use-auth-guards";
import { GithubTokenError } from "@/features/github-token/errors";
import { useGithubTokenStore } from "@/features/github-token/use-github-token-store";
import { ApiError } from "@/lib/api/client";
import { getMonitorGithubTokenAssociation } from "@/lib/api/github-token";
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
import { useCallback, useEffect, useMemo, useState } from "react";

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

function maskGithubToken(last4: string): string {
  return `****...${last4}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function resolveLinkedGithubTokenId(monitor: Monitor): string | null {
  const monitorRecord = monitor as unknown as Record<string, unknown>;

  const directId =
    readNonEmptyString(monitorRecord.github_token_id) ??
    readNonEmptyString(monitorRecord.githubTokenId);

  if (directId) {
    return directId;
  }

  const githubTokenObject = isRecord(monitorRecord.github_token)
    ? monitorRecord.github_token
    : isRecord(monitorRecord.githubToken)
      ? monitorRecord.githubToken
      : null;

  const nestedTokenId = githubTokenObject
    ? readNonEmptyString(githubTokenObject.id) ?? readNonEmptyString(githubTokenObject.token_id)
    : null;

  if (nestedTokenId) {
    return nestedTokenId;
  }

  const candidateCollections: unknown[] = [
    monitorRecord.monitor_github_tokens,
    monitorRecord.monitorGithubTokens,
    monitorRecord.github_tokens,
    monitorRecord.githubTokens,
  ];

  for (const collection of candidateCollections) {
    if (!Array.isArray(collection)) {
      continue;
    }

    for (const item of collection) {
      if (!isRecord(item)) {
        continue;
      }

      const relationId =
        readNonEmptyString(item.github_token_id) ?? readNonEmptyString(item.githubTokenId);

      if (relationId) {
        return relationId;
      }

      if (isRecord(item.github_token)) {
        const fromNestedRelation = readNonEmptyString(item.github_token.id);
        if (fromNestedRelation) {
          return fromNestedRelation;
        }
      }
    }
  }

  return null;
}

function resolveLinkedGithubTokenIdFromAssociation(payload: unknown): string | null {
  const items = Array.isArray(payload) ? payload : [payload];

  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }

    const directId =
      readNonEmptyString(item.github_token_id) ??
      readNonEmptyString(item.githubTokenId) ??
      readNonEmptyString(item.id);

    if (directId) {
      return directId;
    }

    if (isRecord(item.github_token)) {
      const nestedId = readNonEmptyString(item.github_token.id);
      if (nestedId) {
        return nestedId;
      }
    }
  }

  return null;
}

export default function MonitorDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const monitorId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { token, session, isReady, logout } = useRequireAuth();
  const {
    tokens: githubTokens,
    fetchGithubTokens,
    linkingMonitorId,
    unlinkingMonitorId,
    linkTokenToMonitor,
    unlinkTokenFromMonitor,
  } = useGithubTokenStore();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [history, setHistory] = useState<MonitorCheck[]>([]);
  const [userWebhooks, setUserWebhooks] = useState<UserWebhook[]>([]);
  const [monitorWebhooks, setMonitorWebhooks] = useState<UserWebhook[]>([]);
  const [linkedGithubTokenId, setLinkedGithubTokenId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAttachingWebhook, setIsAttachingWebhook] = useState(false);
  const [removingWebhookId, setRemovingWebhookId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState("");
  const [selectedGithubTokenId, setSelectedGithubTokenId] = useState("");

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

  const loadData = useCallback(async () => {
    if (!token || !monitorId) {
      return;
    }

    setIsLoading(true);

    try {
      const [monitorDetails, monitorHistory, allWebhooks, linkedWebhooks, allGithubTokens] =
        await Promise.all([
        getMonitorById(token, monitorId),
        getMonitorHistory(token, monitorId),
        listUserWebhooks(token),
        listMonitorWebhooks(token, monitorId),
        fetchGithubTokens(token),
      ]);

      setMonitor(monitorDetails);
      setHistory(monitorHistory);
      setUserWebhooks(allWebhooks);
      setMonitorWebhooks(linkedWebhooks);

      let resolvedLinkedTokenId: string | null = null;

      try {
        const association = await getMonitorGithubTokenAssociation(token, monitorId);
        resolvedLinkedTokenId = resolveLinkedGithubTokenIdFromAssociation(association);
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }
      }

      if (!resolvedLinkedTokenId) {
        resolvedLinkedTokenId = resolveLinkedGithubTokenId(monitorDetails);
      }

      setLinkedGithubTokenId(resolvedLinkedTokenId);
      setSelectedGithubTokenId(
        resolvedLinkedTokenId && allGithubTokens.some((item) => item.id === resolvedLinkedTokenId)
          ? resolvedLinkedTokenId
          : "",
      );
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
  }, [fetchGithubTokens, handleAuthError, monitorId, token]);

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

  const activeGithubTokens = useMemo(
    () => githubTokens.filter((item) => item.is_active),
    [githubTokens],
  );

  const currentlyLinkedGithubToken = useMemo(
    () => githubTokens.find((item) => item.id === linkedGithubTokenId) ?? null,
    [githubTokens, linkedGithubTokenId],
  );
  const hasLinkedGithubToken = Boolean(linkedGithubTokenId);
  const hasLinkedWebhook = monitorWebhooks.length > 0;

  const linkedTokenLabel = currentlyLinkedGithubToken
    ? maskGithubToken(currentlyLinkedGithubToken.token_last4)
    : "selected token";

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

  const handleAttachWebhook = useCallback(async () => {
    if (!token || !monitorId) {
      return;
    }

    if (hasLinkedWebhook) {
      setFeedback({
        tone: "error",
        message: "Only one webhook can be linked to a monitor. Remove the current webhook first.",
      });
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
  }, [handleAuthError, hasLinkedWebhook, loadData, monitorId, selectedWebhookId, token]);

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

  const isLinkingGithubToken = monitorId ? linkingMonitorId === monitorId : false;
  const isUnlinkingGithubToken = monitorId ? unlinkingMonitorId === monitorId : false;

  const handleLinkGithubToken = useCallback(async () => {
    if (!token || !monitorId) {
      return;
    }

    if (!selectedGithubTokenId) {
      setFeedback({ tone: "error", message: "Select a GitHub token to link." });
      return;
    }

    if (linkedGithubTokenId && linkedGithubTokenId !== selectedGithubTokenId) {
      setFeedback({
        tone: "error",
        message: "Only one GitHub token can be linked to a monitor. Unlink the current token first.",
      });
      return;
    }

    setFeedback(null);

    try {
      await linkTokenToMonitor(token, monitorId, selectedGithubTokenId);
      setLinkedGithubTokenId(selectedGithubTokenId);
      setFeedback({ tone: "success", message: "GitHub token linked to this monitor." });
      await loadData();
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({ tone: "error", message: extractErrorMessage(error) });
    }
  }, [
    handleAuthError,
    linkTokenToMonitor,
    loadData,
    linkedGithubTokenId,
    monitorId,
    selectedGithubTokenId,
    token,
  ]);

  const handleUnlinkGithubToken = useCallback(async () => {
    if (!token || !monitorId || !linkedGithubTokenId) {
      return;
    }

    const confirmed = window.confirm(
      `Unlink GitHub token ${linkedTokenLabel} from this monitor?`,
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    try {
      await unlinkTokenFromMonitor(token, monitorId, linkedGithubTokenId);
      setLinkedGithubTokenId(null);
      setSelectedGithubTokenId("");
      setFeedback({ tone: "success", message: "GitHub token unlinked from this monitor." });
      await loadData();
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({ tone: "error", message: extractErrorMessage(error) });
    }
  }, [
    handleAuthError,
    linkedTokenLabel,
    linkedGithubTokenId,
    loadData,
    monitorId,
    token,
    unlinkTokenFromMonitor,
  ]);

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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-[9px] text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <span aria-hidden>&larr;</span>
            <span>Back to dashboard</span>
          </Link>

          <Link
            href={`/monitors/${monitor.id}/live-logs`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-[9px] text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <span>Live Logs</span>
          </Link>
        </div>
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
            <h2 className="text-xl font-semibold text-slate-900">GitHub token configuration</h2>
            <p className="text-sm text-slate-600">
              Link a GitHub token to enable code-fix agent actions for this monitor.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void loadData()}
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            Refresh Tokens
          </Button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-base font-semibold text-slate-900">Link token to monitor</h3>
            <Select
              label="Available GitHub tokens"
              value={selectedGithubTokenId}
              onChange={(event) => setSelectedGithubTokenId(event.target.value)}
              disabled={activeGithubTokens.length === 0 || Boolean(linkedGithubTokenId)}
            >
              <option value="">
                {activeGithubTokens.length === 0
                  ? "No active token available"
                  : linkedGithubTokenId
                    ? "A token is already linked"
                    : "Select a GitHub token"}
              </option>
              {activeGithubTokens.map((tokenItem) => (
                <option key={tokenItem.id} value={tokenItem.id}>
                  {maskGithubToken(tokenItem.token_last4)}
                </option>
              ))}
            </Select>

            <Button
              variant="secondary"
              onClick={() => void handleLinkGithubToken()}
              loading={isLinkingGithubToken}
              disabled={
                !selectedGithubTokenId ||
                activeGithubTokens.length === 0 ||
                hasLinkedGithubToken
              }
              className="w-full sm:w-auto"
            >
              Link Token
            </Button>

            {activeGithubTokens.length === 0 ? (
              <p className="text-sm text-slate-600">
                No active tokens found. Create one in{" "}
                <Link
                  href="/settings/github-tokens"
                  className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4"
                >
                  GitHub Tokens
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-base font-semibold text-slate-900">Currently linked token</h3>
            {currentlyLinkedGithubToken ? (
              <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {maskGithubToken(currentlyLinkedGithubToken.token_last4)}
                </p>
                <p className="text-xs text-slate-500">
                  Created {formatDate(currentlyLinkedGithubToken.created_at)}
                </p>
                <Button
                  variant="danger"
                  onClick={() => void handleUnlinkGithubToken()}
                  loading={isUnlinkingGithubToken}
                  className="w-full sm:w-auto"
                >
                  Unlink
                </Button>
              </article>
            ) : hasLinkedGithubToken ? (
              <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">A GitHub token is linked</p>
                <p className="text-xs text-slate-500">
                  Linked token ID: <span className="font-mono">{linkedGithubTokenId}</span>
                </p>
                <Button
                  variant="danger"
                  onClick={() => void handleUnlinkGithubToken()}
                  loading={isUnlinkingGithubToken}
                  className="w-full sm:w-auto"
                >
                  Unlink
                </Button>
              </article>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No GitHub token linked to this monitor.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Notification webhooks</h2>
            <p className="text-sm text-slate-600">
              Link a webhook to receive monitor alerts for this monitor.
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
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-base font-semibold text-slate-900">Link webhook to monitor</h3>
            <Select
              label="Available webhooks"
              value={selectedWebhookId}
              onChange={(event) => setSelectedWebhookId(event.target.value)}
              disabled={attachableWebhooks.length === 0 || hasLinkedWebhook}
            >
              <option value="">
                {hasLinkedWebhook
                  ? "A webhook is already linked"
                  : attachableWebhooks.length === 0
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
              disabled={!selectedWebhookId || attachableWebhooks.length === 0 || hasLinkedWebhook}
              className="w-full sm:w-auto"
            >
              Link Webhook
            </Button>
            {userWebhooks.length === 0 ? (
              <p className="text-sm text-slate-600">
                No active webhooks found. Create one in{" "}
                <Link
                  href="/settings/webhooks"
                  className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4"
                >
                  Webhooks
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-base font-semibold text-slate-900">Currently linked webhook</h3>
            {monitorWebhooks[0] ? (
              <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {formatProvider(monitorWebhooks[0].provider)}
                </p>
                <p className="break-all text-sm text-slate-600">
                  {maskWebhookUrl(monitorWebhooks[0].webhook_url)}
                </p>
                <p className="text-xs text-slate-500">
                  Created {formatDate(monitorWebhooks[0].created_at)}
                </p>
                <Button
                  variant="danger"
                  loading={removingWebhookId === monitorWebhooks[0].id}
                  onClick={() => void handleRemoveWebhook(monitorWebhooks[0].id)}
                  className="w-full sm:w-auto"
                >
                  Unlink
                </Button>
              </article>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No webhook linked to this monitor.
              </div>
            )}
          </div>
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
