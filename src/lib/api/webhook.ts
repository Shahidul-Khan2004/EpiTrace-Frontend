import { apiRequest } from "@/lib/api/client";
import type {
  ApiSuccessResponse,
  CreateWebhookPayload,
  MonitorWebhookAssociation,
  UpdateWebhookPayload,
  UserWebhook,
} from "@/types/api";

export function createWebhook(token: string, payload: CreateWebhookPayload) {
  return apiRequest<ApiSuccessResponse<UserWebhook>>("/webhook", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function listUserWebhooks(token: string) {
  return apiRequest<ApiSuccessResponse<UserWebhook[]>>("/webhook", {
    method: "GET",
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function updateWebhook(token: string, webhookId: string, payload: UpdateWebhookPayload) {
  return apiRequest<ApiSuccessResponse<UserWebhook>>(`/webhook/${webhookId}`, {
    method: "PATCH",
    body: payload,
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function deleteWebhook(token: string, webhookId: string) {
  return apiRequest<{ success: boolean; message?: string }>(`/webhook/${webhookId}`, {
    method: "DELETE",
    token,
    requiresAuth: true,
  });
}

export function listMonitorWebhooks(token: string, monitorId: string) {
  return apiRequest<ApiSuccessResponse<UserWebhook[]>>(`/webhook/monitor/${monitorId}`, {
    method: "GET",
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function addWebhookToMonitor(token: string, monitorId: string, webhookId: string) {
  return apiRequest<ApiSuccessResponse<MonitorWebhookAssociation>>(
    `/webhook/monitor/${monitorId}/add/${webhookId}`,
    {
      method: "POST",
      token,
      requiresAuth: true,
    },
  ).then((response) => response.data);
}

export function removeWebhookFromMonitor(token: string, monitorId: string, webhookId: string) {
  return apiRequest<{ success: boolean; message?: string }>(
    `/webhook/monitor/${monitorId}/remove/${webhookId}`,
    {
      method: "DELETE",
      token,
      requiresAuth: true,
    },
  );
}
