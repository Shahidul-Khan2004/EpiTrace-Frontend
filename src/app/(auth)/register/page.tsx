"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { useRedirectIfAuthenticated } from "@/features/auth/use-auth-guards";

export default function RegisterPage() {
  const { isChecking } = useRedirectIfAuthenticated();

  if (isChecking) {
    return null;
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start by registering, then create and manage your monitors from one clean dashboard."
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
