"use client";

import { getHealth } from "@/lib/api/health";
import { useEffect, useState } from "react";

interface HealthState {
  status: "checking" | "up" | "down";
  label: string;
}

const CHECK_INTERVAL_MS = 30_000;

export function BackendHealth() {
  const [health, setHealth] = useState<HealthState>({
    status: "checking",
    label: "Checking backend",
  });

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        const response = await getHealth();

        if (!mounted) {
          return;
        }

        if (response.status === "RUNNING") {
          setHealth({
            status: "up",
            label: "Backend healthy",
          });
          return;
        }

        setHealth({
          status: "down",
          label: "Backend unhealthy",
        });
      } catch {
        if (!mounted) {
          return;
        }

        setHealth({
          status: "down",
          label: "Backend unreachable",
        });
      }
    };

    void checkHealth();
    const interval = window.setInterval(() => {
      void checkHealth();
    }, CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const indicatorClass =
    health.status === "up"
      ? "bg-emerald-500"
      : health.status === "down"
        ? "bg-rose-500"
        : "bg-amber-400";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${indicatorClass}`} />
      <span>{health.label}</span>
    </div>
  );
}
