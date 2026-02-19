"use client";

import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useRequireAuth } from "@/features/auth/use-auth-guards";
import { ApiError } from "@/lib/api/client";
import {
  createWebhook,
  deleteWebhook,
  listUserWebhooks,
  updateWebhook,
} from "@/lib/api/webhook";
import { extractErrorMessage } from "@/lib/utils/error";
import type { NotificationProvider, UserWebhook } from "@/types/api";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

interface FeedbackState {
  tone: "error" | "success" | "info";
  message: string;
}

type WebhookModalMode = "create" | "edit";

interface WebhookModalState {
  open: boolean;
  mode: WebhookModalMode;
  webhookId: string | null;
  provider: NotificationProvider;
  webhookUrl: string;
}

interface WebhookModalProps {
  open: boolean;
  mode: WebhookModalMode;
  initialProvider: NotificationProvider;
  initialWebhookUrl: string;
  isSubmitting: boolean;
  formError: string | null;
  onClose: () => void;
  onSubmit: (provider: NotificationProvider, webhookUrl: string) => Promise<void>;
}

function formatDate(iso: string): string {
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

function WebhookModal({
  open,
  mode,
  initialProvider,
  initialWebhookUrl,
  isSubmitting,
  formError,
  onClose,
  onSubmit,
}: WebhookModalProps) {
  const [provider, setProvider] = useState<NotificationProvider>(initialProvider);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setProvider(initialProvider);
    setWebhookUrl(initialWebhookUrl);
    setLocalError(null);
  }, [initialProvider, initialWebhookUrl, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedWebhookUrl = webhookUrl.trim();
    if (!normalizedWebhookUrl) {
      setLocalError("Webhook URL is required.");
      return;
    }

    if (!isValidWebhookUrl(normalizedWebhookUrl)) {
      setLocalError("Webhook URL must be a valid HTTP(S) URL.");
      return;
    }

    setLocalError(null);
    await onSubmit(provider, normalizedWebhookUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === "create" ? "Create New Webhook" : "Edit Webhook"}
          </h2>
          <p className="text-sm text-slate-600">
            {mode === "create"
              ? "Create a user webhook you can attach to monitors."
              : "Update provider or endpoint for this webhook."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Select
            label="Provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as NotificationProvider)}
          >
            <option value="slack">Slack</option>
            <option value="discord">Discord</option>
          </Select>

          <Input
            label="Webhook URL"
            type="url"
            value={webhookUrl}
            onChange={(event) => {
              setWebhookUrl(event.target.value);
              setLocalError(null);
            }}
            placeholder="https://hooks.slack.com/services/XXX/YYY/ZZZ"
            required
          />

          {localError ? <Alert message={localError} tone="error" /> : null}
          {formError ? <Alert message={formError} tone="error" /> : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {mode === "create" ? "Create Webhook" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  const { token: authToken, session, isReady, logout } = useRequireAuth();

  const [webhooks, setWebhooks] = useState<UserWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [updatingWebhookId, setUpdatingWebhookId] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modal, setModal] = useState<WebhookModalState>({
    open: false,
    mode: "create",
    webhookId: null,
    provider: "slack",
    webhookUrl: "",
  });

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

  const loadWebhooks = useCallback(async () => {
    if (!authToken) {
      return;
    }

    setIsLoading(true);

    try {
      const data = await listUserWebhooks(authToken);
      setWebhooks(data);
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
  }, [authToken, handleAuthError]);

  useEffect(() => {
    if (isReady && authToken) {
      void loadWebhooks();
    }
  }, [authToken, isReady, loadWebhooks]);

  const sortedWebhooks = useMemo(
    () => [...webhooks].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [webhooks],
  );

  const openCreateModal = () => {
    setModal({
      open: true,
      mode: "create",
      webhookId: null,
      provider: "slack",
      webhookUrl: "",
    });
    setModalError(null);
    setFeedback(null);
  };

  const openEditModal = (item: UserWebhook) => {
    setModal({
      open: true,
      mode: "edit",
      webhookId: item.id,
      provider: item.provider,
      webhookUrl: item.webhook_url,
    });
    setModalError(null);
    setFeedback(null);
  };

  const closeModal = () => {
    if (isModalSubmitting) {
      return;
    }

    setModal((previous) => ({ ...previous, open: false }));
    setModalError(null);
  };

  const handleModalSubmit = async (provider: NotificationProvider, webhookUrl: string) => {
    if (!authToken) {
      return;
    }

    setIsModalSubmitting(true);
    setModalError(null);

    try {
      if (modal.mode === "create") {
        const created = await createWebhook(authToken, {
          provider,
          webhook_url: webhookUrl,
        });

        setWebhooks((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
        setFeedback({ tone: "success", message: "Webhook created successfully." });
      } else if (modal.webhookId) {
        setUpdatingWebhookId(modal.webhookId);

        const updated = await updateWebhook(authToken, modal.webhookId, {
          provider,
          webhook_url: webhookUrl,
        });

        setWebhooks((previous) =>
          previous.map((item) => (item.id === modal.webhookId ? updated : item)),
        );
        setFeedback({ tone: "success", message: "Webhook updated successfully." });
      }

      closeModal();
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setModalError(extractErrorMessage(error));
    } finally {
      setIsModalSubmitting(false);
      setUpdatingWebhookId(null);
    }
  };

  const handleToggleActive = async (item: UserWebhook, nextActive: boolean) => {
    if (!authToken) {
      return;
    }

    setFeedback(null);
    setUpdatingWebhookId(item.id);

    try {
      const updated = await updateWebhook(authToken, item.id, { is_active: nextActive });
      setWebhooks((previous) =>
        previous.map((webhook) => (webhook.id === item.id ? updated : webhook)),
      );

      setFeedback({
        tone: "success",
        message: `${formatProvider(item.provider)} webhook ${nextActive ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({ tone: "error", message: extractErrorMessage(error) });
    } finally {
      setUpdatingWebhookId(null);
    }
  };

  const handleDelete = async (item: UserWebhook) => {
    if (!authToken) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${formatProvider(item.provider)} webhook ${maskWebhookUrl(item.webhook_url)}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setDeletingWebhookId(item.id);

    try {
      await deleteWebhook(authToken, item.id);
      setWebhooks((previous) => previous.filter((webhook) => webhook.id !== item.id));
      setFeedback({ tone: "success", message: "Webhook deleted." });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setFeedback({ tone: "error", message: extractErrorMessage(error) });
    } finally {
      setDeletingWebhookId(null);
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <AppShell
      title="Webhooks"
      subtitle="Manage user webhooks and keep them ready for monitor notifications."
      userEmail={session?.user.email}
      onLogout={logout}
    >
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Webhook management</h2>
            <p className="text-sm text-slate-600">
              Create and edit user webhooks outside monitor pages.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button variant="secondary" onClick={() => void loadWebhooks()} loading={isLoading}>
              Refresh
            </Button>
            <Button onClick={openCreateModal}>Create New Webhook</Button>
          </div>
        </div>

        {feedback ? <Alert message={feedback.message} tone={feedback.tone} /> : null}

        {isLoading && sortedWebhooks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading webhooks...
          </div>
        ) : null}

        {!isLoading && sortedWebhooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
            No webhooks found. Create one to reuse across monitors.
          </div>
        ) : null}

        {sortedWebhooks.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Webhook ID</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">URL</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedWebhooks.map((item) => {
                  const isUpdatingThis = updatingWebhookId === item.id;
                  const isDeletingThis = deletingWebhookId === item.id;

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 align-middle text-xs text-slate-600">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-800">
                          {item.id}
                        </code>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-900">
                        {formatProvider(item.provider)}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600">
                        {maskWebhookUrl(item.webhook_url)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={item.is_active}
                            disabled={isUpdatingThis || isDeletingThis}
                            onChange={(event) =>
                              void handleToggleActive(item, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                          />
                          <span>{item.is_active ? "Active" : "Inactive"}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => openEditModal(item)}
                            disabled={isUpdatingThis || isDeletingThis}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => void handleDelete(item)}
                            loading={isDeletingThis}
                            disabled={isUpdatingThis}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <WebhookModal
        open={modal.open}
        mode={modal.mode}
        initialProvider={modal.provider}
        initialWebhookUrl={modal.webhookUrl}
        isSubmitting={isModalSubmitting}
        formError={modalError}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
    </AppShell>
  );
}
