"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { useRedirectIfAuthenticated } from "@/features/auth/use-auth-guards";

export default function LoginPage() {
  const { isChecking } = useRedirectIfAuthenticated();

  if (isChecking) {
    return null;
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue tracking uptime, response health, and monitor history in real time."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
