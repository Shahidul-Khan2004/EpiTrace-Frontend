import { BackendHealth } from "@/components/layout/backend-health";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute left-0 top-8 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" aria-hidden />
      <div className="absolute bottom-8 right-0 h-72 w-72 rounded-full bg-sky-100/60 blur-3xl" aria-hidden />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/70 bg-white/90 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <header className="mb-6 space-y-4">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            EpiTrace Control
          </div>
          <BackendHealth />
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
