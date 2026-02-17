import { apiRequest } from "@/lib/api/client";
import type {
  ApiSuccessResponse,
  CreateMonitorPayload,
  Monitor,
  MonitorCheck,
  UpdateMonitorPayload,
} from "@/types/api";

export function createMonitor(token: string, payload: CreateMonitorPayload) {
  return apiRequest<ApiSuccessResponse<Monitor>>("/monitor/create", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function listMonitors(token: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ApiSuccessResponse<Monitor[]>>(`/monitor?${params.toString()}`, {
    method: "GET",
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function getMonitorById(token: string, monitorId: string) {
  return apiRequest<ApiSuccessResponse<Monitor>>(`/monitor/${monitorId}`, {
    method: "GET",
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function updateMonitor(token: string, monitorId: string, payload: UpdateMonitorPayload) {
  return apiRequest<ApiSuccessResponse<Monitor>>(`/monitor/${monitorId}`, {
    method: "PATCH",
    body: payload,
    token,
    requiresAuth: true,
  }).then((response) => response.data);
}

export function deleteMonitor(token: string, monitorId: string) {
  return apiRequest<{ success: boolean; message?: string }>(`/monitor/${monitorId}`, {
    method: "DELETE",
    token,
    requiresAuth: true,
  });
}

export function startMonitor(token: string, monitorId: string) {
  return apiRequest<{ success?: boolean; message?: string }>(`/monitor/start/${monitorId}`, {
    method: "POST",
    token,
    requiresAuth: true,
  });
}

export function pauseMonitor(token: string, monitorId: string) {
  return apiRequest<{ success?: boolean; message?: string }>(`/monitor/pause/${monitorId}`, {
    method: "POST",
    token,
    requiresAuth: true,
  });
}

export function resumeMonitor(token: string, monitorId: string) {
  return apiRequest<{ success?: boolean; message?: string }>(`/monitor/resume/${monitorId}`, {
    method: "POST",
    token,
    requiresAuth: true,
  });
}

export function getMonitorHistory(token: string, monitorId: string, limit = 100, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ApiSuccessResponse<MonitorCheck[]>>(
    `/monitor/${monitorId}/history?${params.toString()}`,
    {
      method: "GET",
      token,
      requiresAuth: true,
    },
  ).then((response) => response.data);
}
