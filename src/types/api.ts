export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type NotificationProvider = "slack" | "discord";

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
  repo_link: string;
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
  repo_link?: string;
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
  repo_link: string;
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
  github_token_id?: string | null;
}

export interface UserWebhook {
  id: string;
  user_id: string;
  provider: NotificationProvider;
  webhook_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookPayload {
  provider: NotificationProvider;
  webhook_url: string;
}

export interface UpdateWebhookPayload {
  provider?: NotificationProvider;
  webhook_url?: string;
  is_active?: boolean;
}

export interface MonitorWebhookAssociation {
  id: string;
  monitor_id: string;
  webhook_id: string;
  created_at: string;
}

export interface GithubToken {
  id: string;
  user_id?: string;
  is_active: boolean;
  token_last4: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGithubTokenPayload {
  access_token: string;
}

export interface UpdateGithubTokenPayload {
  access_token?: string;
  is_active?: boolean;
}

export interface MonitorGithubTokenAssociation {
  monitor_id: string;
  github_token_id: string;
  created_at?: string;
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
