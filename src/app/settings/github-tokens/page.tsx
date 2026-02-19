"use client";

import { Alert } from "@/components/feedback/alert";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/features/auth/use-auth-guards";
import {
  GithubTokenError,
  type GithubTokenFieldErrors,
} from "@/features/github-token/errors";
import { useGithubTokenStore } from "@/features/github-token/use-github-token-store";
import { ApiError } from "@/lib/api/client";
import type { GithubToken } from "@/types/api";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

interface FeedbackState {
  tone: "error" | "success" | "info";
  message: string;
}

type TokenModalMode = "create" | "edit";

interface TokenModalState {
  open: boolean;
  mode: TokenModalMode;
  tokenId: string | null;
  currentLast4: string | null;
}

interface TokenModalProps {
  mode: TokenModalMode;
  open: boolean;
  currentLast4: string | null;
  isSubmitting: boolean;
  formError: string | null;
  fieldErrors: GithubTokenFieldErrors;
  onClose: () => void;
  onSubmit: (accessToken: string) => Promise<void>;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function maskToken(last4: string): string {
  return `****...${last4}`;
}

function getTokenLabel(item: GithubToken): string {
  return `${maskToken(item.token_last4)} (${item.is_active ? "active" : "inactive"})`;
}

function GithubTokenModal({
  mode,
  open,
  currentLast4,
  isSubmitting,
  formError,
  fieldErrors,
  onClose,
  onSubmit,
}: TokenModalProps) {
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAccessToken("");
      setShowToken(false);
      setLocalError(null);
    }
  }, [open, mode]);

  if (!open) {
    return null;
  }

  const tokenError = fieldErrors.access_token;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedToken = accessToken.trim();
    if (!normalizedToken) {
      setLocalError("GitHub token is required.");
      return;
    }

    if (normalizedToken.length < 1) {
      setLocalError("GitHub token must contain at least 1 character.");
      return;
    }

    setLocalError(null);
    await onSubmit(normalizedToken);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === "create" ? "Create New GitHub Token" : "Edit GitHub Token"}
          </h2>
          <p className="text-sm text-slate-600">
            {mode === "create"
              ? "Paste your GitHub personal access token. It will be stored securely by the backend."
              : "Replace the existing token with a new GitHub personal access token."}
          </p>
          {mode === "edit" && currentLast4 ? (
            <p className="text-xs text-slate-500">
              Current token: <span className="font-semibold text-slate-700">{maskToken(currentLast4)}</span>
            </p>
          ) : null}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label htmlFor="github-access-token" className="space-y-2">
            <span className="text-sm font-medium text-slate-700">GitHub Personal Access Token</span>
            <div className="flex items-center gap-2">
              <input
                id="github-access-token"
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(event) => {
                  setAccessToken(event.target.value);
                  setLocalError(null);
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowToken((previous) => !previous)}
              >
                {showToken ? "Hide" : "Show"}
              </Button>
            </div>
            {localError ? <span className="text-xs text-rose-600">{localError}</span> : null}
            {tokenError ? <span className="text-xs text-rose-600">{tokenError}</span> : null}
          </label>

          {formError ? <Alert tone="error" message={formError} /> : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {mode === "create" ? "Create Token" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GithubTokensPage() {
  const { token: authToken, session, isReady, logout } = useRequireAuth();
  const {
    tokens,
    isFetching,
    isCreating,
    updatingTokenId,
    deletingTokenId,
    createGithubToken,
    deleteGithubToken,
    fetchGithubTokens,
    getGithubToken,
    updateGithubToken,
  } = useGithubTokenStore();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [modal, setModal] = useState<TokenModalState>({
    open: false,
    mode: "create",
    tokenId: null,
    currentLast4: null,
  });
  const [isOpeningEdit, setIsOpeningEdit] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalFieldErrors, setModalFieldErrors] = useState<GithubTokenFieldErrors>({});

  const isSavingModal = isCreating || (modal.mode === "edit" && updatingTokenId === modal.tokenId);

  const handleAuthError = useCallback(
    (error: unknown) => {
      if (
        ((error instanceof ApiError) || (error instanceof GithubTokenError)) &&
        error.status === 401
      ) {
        logout();
        return true;
      }

      return false;
    },
    [logout],
  );

  const loadTokens = useCallback(async () => {
    if (!authToken) {
      return;
    }

    try {
      await fetchGithubTokens(authToken);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      const normalized = error instanceof GithubTokenError ? error : new GithubTokenError("Failed to fetch GitHub token", 0, null, {});
      setFeedback({ tone: "error", message: normalized.message });
    }
  }, [authToken, fetchGithubTokens, handleAuthError]);

  useEffect(() => {
    if (isReady && authToken) {
      void loadTokens();
    }
  }, [authToken, isReady, loadTokens]);

  const sortedTokens = useMemo(
    () => [...tokens].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [tokens],
  );

  const openCreateModal = () => {
    setModal({ open: true, mode: "create", tokenId: null, currentLast4: null });
    setModalError(null);
    setModalFieldErrors({});
    setFeedback(null);
  };

  const handleOpenEdit = async (tokenId: string) => {
    if (!authToken) {
      return;
    }

    setIsOpeningEdit(tokenId);
    setModalError(null);
    setModalFieldErrors({});
    setFeedback(null);

    try {
      const tokenDetails = await getGithubToken(authToken, tokenId);
      setModal({
        open: true,
        mode: "edit",
        tokenId,
        currentLast4: tokenDetails.token_last4,
      });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      const normalized = error instanceof GithubTokenError ? error : new GithubTokenError("Failed to fetch GitHub token", 0, null, {});
      setFeedback({ tone: "error", message: normalized.message });
    } finally {
      setIsOpeningEdit(null);
    }
  };

  const closeModal = () => {
    if (isSavingModal) {
      return;
    }

    setModal((previous) => ({ ...previous, open: false }));
    setModalError(null);
    setModalFieldErrors({});
  };

  const handleModalSubmit = async (accessToken: string) => {
    if (!authToken) {
      return;
    }

    setModalError(null);
    setModalFieldErrors({});

    try {
      if (modal.mode === "create") {
        await createGithubToken(authToken, { access_token: accessToken });
        setFeedback({ tone: "success", message: "GitHub token created successfully." });
      } else if (modal.tokenId) {
        await updateGithubToken(authToken, modal.tokenId, { access_token: accessToken });
        setFeedback({ tone: "success", message: "GitHub token updated successfully." });
      }

      closeModal();
      await fetchGithubTokens(authToken);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      const normalized =
        error instanceof GithubTokenError
          ? error
          : new GithubTokenError("An error occurred, please try again", 0, null, {});

      setModalError(normalized.message);
      setModalFieldErrors(normalized.fieldErrors);
    }
  };

  const handleToggleActive = async (item: GithubToken, nextActive: boolean) => {
    if (!authToken) {
      return;
    }

    setFeedback(null);

    try {
      await updateGithubToken(authToken, item.id, { is_active: nextActive });
      setFeedback({
        tone: "success",
        message: `Token ${maskToken(item.token_last4)} ${nextActive ? "activated" : "deactivated"}.`,
      });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      const normalized =
        error instanceof GithubTokenError
          ? error
          : new GithubTokenError("An error occurred, please try again", 0, null, {});

      setFeedback({ tone: "error", message: normalized.message });
    }
  };

  const handleDelete = async (item: GithubToken) => {
    if (!authToken) {
      return;
    }

    const confirmed = window.confirm(
      `Delete GitHub token ${maskToken(item.token_last4)}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    try {
      await deleteGithubToken(authToken, item.id);
      setFeedback({ tone: "success", message: "GitHub token deleted." });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      const normalized =
        error instanceof GithubTokenError
          ? error
          : new GithubTokenError("An error occurred, please try again", 0, null, {});

      setFeedback({ tone: "error", message: normalized.message });
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <AppShell
      title="GitHub Tokens"
      subtitle="Create and manage personal access tokens used by monitor code-fix automation."
      userEmail={session?.user.email}
      onLogout={logout}
    >
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Token management</h2>
            <p className="text-sm text-slate-600">
              Tokens are always masked. Only the last 4 characters are shown.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button variant="secondary" onClick={() => void loadTokens()} loading={isFetching}>
              Refresh
            </Button>
            <Button onClick={openCreateModal}>Create New Token</Button>
          </div>
        </div>

        {feedback ? <Alert message={feedback.message} tone={feedback.tone} /> : null}

        {isFetching && sortedTokens.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading GitHub tokens...
          </div>
        ) : null}

        {!isFetching && sortedTokens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
            No GitHub tokens found. Create your first token to enable code-fix linking.
          </div>
        ) : null}

        {sortedTokens.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Token ID</th>
                  <th className="px-4 py-3 font-semibold">Token</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedTokens.map((item) => {
                  const isUpdatingThis = updatingTokenId === item.id;
                  const isDeletingThis = deletingTokenId === item.id;

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 align-middle text-xs text-slate-600">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-800">
                          {item.id}
                        </code>
                      </td>
                      <td className="px-4 py-3 align-middle font-medium text-slate-900">
                        {getTokenLabel(item)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={item.is_active}
                            disabled={isUpdatingThis || isDeletingThis}
                            onChange={(event) => void handleToggleActive(item, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                          />
                          <span>{item.is_active ? "Active" : "Inactive"}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => void handleOpenEdit(item.id)}
                            loading={isOpeningEdit === item.id}
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

      <GithubTokenModal
        open={modal.open}
        mode={modal.mode}
        currentLast4={modal.currentLast4}
        isSubmitting={Boolean(isSavingModal)}
        formError={modalError}
        fieldErrors={modalFieldErrors}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
    </AppShell>
  );
}
