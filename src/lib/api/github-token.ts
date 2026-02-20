import { apiRequest } from "@/lib/api/client";
import type {
  ApiSuccessResponse,
  CreateGithubTokenPayload,
  GithubToken,
  MonitorGithubTokenAssociation,
  UpdateGithubTokenPayload,
} from "@/types/api";

export function createGithubToken(token: string, payload: CreateGithubTokenPayload) {
  return apiRequest<ApiSuccessResponse<GithubToken>>("/github-token", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function fetchGithubTokens(token: string) {
  return apiRequest<ApiSuccessResponse<GithubToken[]>>("/github-token", {
    method: "GET",
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function getGithubToken(token: string, tokenId: string) {
  return apiRequest<ApiSuccessResponse<GithubToken>>(`/github-token/${tokenId}`, {
    method: "GET",
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function updateGithubToken(
  token: string,
  tokenId: string,
  updates: UpdateGithubTokenPayload,
) {
  return apiRequest<ApiSuccessResponse<GithubToken>>(`/github-token/${tokenId}`, {
    method: "PATCH",
    body: updates,
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function deleteGithubToken(token: string, tokenId: string) {
  return apiRequest<{ success: boolean; message?: string }>(`/github-token/${tokenId}`, {
    method: "DELETE",
    token,
    requiresAuth: true,
  });
}

export function linkTokenToMonitor(token: string, monitorId: string, tokenId: string) {
  return apiRequest<ApiSuccessResponse<MonitorGithubTokenAssociation>>(
    `/github-token/monitor/${monitorId}/add/${tokenId}`,
    {
      method: "POST",
      token,
      requiresAuth: true,
    },
  ).then((response) => response.data);
}

export function unlinkTokenFromMonitor(token: string, monitorId: string, tokenId: string) {
  return apiRequest<{ success: boolean; message?: string }>(
    `/github-token/monitor/${monitorId}/remove/${tokenId}`,
    {
      method: "DELETE",
      token,
      requiresAuth: true,
    },
  );
}

export function getMonitorGithubTokenAssociation(token: string, monitorId: string) {
  return apiRequest<ApiSuccessResponse<MonitorGithubTokenAssociation | MonitorGithubTokenAssociation[]>>(
    `/github-token/monitor/${monitorId}`,
    {
      method: "GET",
      token,
      requiresAuth: true,
    },
  ).then((response) => response.data);
}
