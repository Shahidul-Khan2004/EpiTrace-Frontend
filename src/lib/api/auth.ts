import { apiRequest } from "@/lib/api/client";
import type { AuthResponse, LoginPayload, RegisterPayload } from "@/types/api";

export function registerUser(payload: RegisterPayload) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
    requiresAuth: false,
  });
}

export function loginUser(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
    requiresAuth: false,
  });
}
