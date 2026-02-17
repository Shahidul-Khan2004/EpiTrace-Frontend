"use client";

import { clearStoredSession, getStoredSession, type StoredSession } from "@/lib/auth/storage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (session?.token) {
      router.replace("/dashboard");
      return;
    }

    setIsChecking(false);
  }, [router]);

  return { isChecking };
}

export function useRequireAuth() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const currentSession = getStoredSession();

    if (!currentSession?.token) {
      router.replace("/register");
      return;
    }

    setSession(currentSession);
    setIsReady(true);
  }, [router]);

  const logout = useCallback(() => {
    clearStoredSession();
    router.replace("/login");
  }, [router]);

  return {
    session,
    token: session?.token ?? null,
    isReady,
    logout,
  };
}
