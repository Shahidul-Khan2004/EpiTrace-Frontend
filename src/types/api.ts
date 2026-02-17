export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface User {
  id: string;
  email: string;
  joinedAt?: string;
  last_updated?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  rePassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateMonitorPayload {
  name: string;
  url: string;
  method: HttpMethod;
  request_header?: Record<string, unknown>;
  request_body?: unknown;
  is_active?: boolean;
  check_interval: number;
  timeout: number;
}

export interface UpdateMonitorPayload {
  name?: string;
  url?: string;
  method?: HttpMethod;
  request_header?: Record<string, unknown>;
  request_body?: unknown;
  check_interval?: number;
  timeout?: number;
}

export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: HttpMethod;
  request_header: Record<string, unknown>;
  request_body: unknown;
  is_active: boolean;
  check_interval: number;
  timeout: number;
  status: "UP" | "DOWN" | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

export interface MonitorCheck {
  id: string;
  monitor_id: string;
  status: "UP" | "DOWN";
  response_time_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
}

export interface HealthResponse {
  status: "RUNNING" | "ERROR";
  timestamp: string;
  dbTime?: string;
  dbVersion?: string;
  message?: string;
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
