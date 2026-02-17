"use client";

import { BackendHealth } from "@/components/layout/backend-health";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  title: string;
  subtitle: string;
  userEmail?: string;
  onLogout?: () => void;
  children: ReactNode;
}

export function AppShell({ title, subtitle, userEmail, onLogout, children }: AppShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
            >
              EpiTrace Dashboard
            </Link>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl leading-tight text-slate-900">
              {title}
            </h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BackendHealth />
            {userEmail ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
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
