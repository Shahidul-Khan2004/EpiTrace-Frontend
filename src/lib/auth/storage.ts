import type { User } from "@/types/api";

const TOKEN_KEY = "epitrace.auth.token";
const USER_KEY = "epitrace.auth.user";

export interface StoredSession {
  token: string;
  user: User;
}

function isClient() {
  return typeof window !== "undefined";
}

export function getStoredToken(): string | null {
  if (!isClient()) {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredSession(): StoredSession | null {
  if (!isClient()) {
    return null;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);

  if (!token || !userRaw) {
    return null;
  }

  try {
    const user = JSON.parse(userRaw) as User;
    return { token, user };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function storeSession(token: string, user: User) {
  if (!isClient()) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  if (!isClient()) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
