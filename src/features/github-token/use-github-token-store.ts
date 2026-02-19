"use client";

import {
  createGithubToken as createGithubTokenApi,
  deleteGithubToken as deleteGithubTokenApi,
  fetchGithubTokens as fetchGithubTokensApi,
  getGithubToken as getGithubTokenApi,
  linkTokenToMonitor as linkTokenToMonitorApi,
  unlinkTokenFromMonitor as unlinkTokenFromMonitorApi,
  updateGithubToken as updateGithubTokenApi,
} from "@/lib/api/github-token";
import type {
  CreateGithubTokenPayload,
  GithubToken,
  MonitorGithubTokenAssociation,
  UpdateGithubTokenPayload,
} from "@/types/api";
import { useCallback, useState } from "react";
import { normalizeGithubTokenError } from "./errors";

export function useGithubTokenStore() {
  const [tokens, setTokens] = useState<GithubToken[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingTokenId, setUpdatingTokenId] = useState<string | null>(null);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);
  const [linkingMonitorId, setLinkingMonitorId] = useState<string | null>(null);
  const [unlinkingMonitorId, setUnlinkingMonitorId] = useState<string | null>(null);

  const fetchGithubTokens = useCallback(async (authToken: string): Promise<GithubToken[]> => {
    setIsFetching(true);

    try {
      const data = await fetchGithubTokensApi(authToken);
      setTokens(data);
      return data;
    } catch (error) {
      throw normalizeGithubTokenError(error, "Failed to fetch GitHub token");
    } finally {
      setIsFetching(false);
    }
  }, []);

  const createGithubToken = useCallback(
    async (authToken: string, tokenData: CreateGithubTokenPayload): Promise<GithubToken> => {
      setIsCreating(true);

      try {
        const created = await createGithubTokenApi(authToken, tokenData);
        setTokens((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
        return created;
      } catch (error) {
        throw normalizeGithubTokenError(error);
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  const getGithubToken = useCallback(
    async (authToken: string, id: string): Promise<GithubToken> => {
      try {
        return await getGithubTokenApi(authToken, id);
      } catch (error) {
        throw normalizeGithubTokenError(error);
      }
    },
    [],
  );

  const updateGithubToken = useCallback(
    async (
      authToken: string,
      id: string,
      updates: UpdateGithubTokenPayload,
    ): Promise<GithubToken> => {
      setUpdatingTokenId(id);

      try {
        const updated = await updateGithubTokenApi(authToken, id, updates);
        setTokens((previous) => previous.map((item) => (item.id === id ? updated : item)));
        return updated;
      } catch (error) {
        throw normalizeGithubTokenError(error);
      } finally {
        setUpdatingTokenId(null);
      }
    },
    [],
  );

  const deleteGithubToken = useCallback(async (authToken: string, id: string): Promise<void> => {
    setDeletingTokenId(id);

    try {
      await deleteGithubTokenApi(authToken, id);
      setTokens((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      throw normalizeGithubTokenError(error);
    } finally {
      setDeletingTokenId(null);
    }
  }, []);

  const linkTokenToMonitor = useCallback(
    async (authToken: string, monitorId: string, tokenId: string): Promise<MonitorGithubTokenAssociation> => {
      setLinkingMonitorId(monitorId);

      try {
        return await linkTokenToMonitorApi(authToken, monitorId, tokenId);
      } catch (error) {
        throw normalizeGithubTokenError(error);
      } finally {
        setLinkingMonitorId(null);
      }
    },
    [],
  );

  const unlinkTokenFromMonitor = useCallback(
    async (authToken: string, monitorId: string, tokenId: string): Promise<void> => {
      setUnlinkingMonitorId(monitorId);

      try {
        await unlinkTokenFromMonitorApi(authToken, monitorId, tokenId);
      } catch (error) {
        throw normalizeGithubTokenError(error);
      } finally {
        setUnlinkingMonitorId(null);
      }
    },
    [],
  );

  return {
    tokens,
    isFetching,
    isCreating,
    updatingTokenId,
    deletingTokenId,
    linkingMonitorId,
    unlinkingMonitorId,
    createGithubToken,
    fetchGithubTokens,
    getGithubToken,
    updateGithubToken,
    deleteGithubToken,
    linkTokenToMonitor,
    unlinkTokenFromMonitor,
  };
}
