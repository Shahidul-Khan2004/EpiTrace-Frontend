"use client";

import { BackendHealth } from "@/components/layout/backend-health";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface AppShellProps {
  title: string;
  subtitle: string;
  userEmail?: string;
  onLogout?: () => void;
  children: ReactNode;
}

export function AppShell({ title, subtitle, userEmail, onLogout, children }: AppShellProps) {
  const pathname = usePathname();

  const isDashboardActive = pathname === "/dashboard" || pathname.startsWith("/monitors/");
  const isGithubTokensActive = pathname.startsWith("/settings/github-tokens");
  const isWebhooksActive = pathname.startsWith("/settings/webhooks");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:mb-8 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
            >
              EpiTrace
            </Link>
            <nav className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href="/dashboard"
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  isDashboardActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/settings/github-tokens"
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  isGithubTokensActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                }`}
              >
                GitHub Tokens
              </Link>
              <Link
                href="/settings/webhooks"
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  isWebhooksActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                }`}
              >
                Webhooks
              </Link>
            </nav>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl leading-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 md:w-auto md:justify-end">
            <BackendHealth />
            {userEmail ? (
              <span className="max-w-full break-all rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {userEmail}
              </span>
            ) : null}
            {onLogout ? (
              <Button variant="secondary" onClick={onLogout}>
                Logout
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
