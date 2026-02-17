import { apiRequest } from "@/lib/api/client";
import type { HealthResponse } from "@/types/api";

export function getHealth() {
  return apiRequest<HealthResponse>("/health", { requiresAuth: false });
}
