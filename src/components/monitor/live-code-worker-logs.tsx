"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface CodeWorkerLogEvent {
  id: string;
  ts: string;
  worker?: string;
  level?: string;
  stage?: string;
  category?: string;
  jobId?: string;
  repo?: string;
  message?: string;
  pretty?: string;
}

interface LiveCodeWorkerLogsProps {
  defaultBaseUrl?: string;
  defaultJobId?: string;
}

const MAX_LOG_LINES = 2000;

const levelClassMap: Record<string, string> = {
  info: "text-sky-700",
  error: "text-rose-700",
  warn: "text-amber-700",
  warning: "text-amber-700",
  debug: "text-violet-700",
};

function parseLogPayload(payload: string): CodeWorkerLogEvent | null {
  try {
    const parsed = JSON.parse(payload) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const item = parsed as Partial<CodeWorkerLogEvent>;

    if (!item.id || !item.ts) {
      return null;
    }

    return {
      id: String(item.id),
      ts: String(item.ts),
      worker: item.worker ? String(item.worker) : undefined,
      level: item.level ? String(item.level).toLowerCase() : "info",
      stage: item.stage ? String(item.stage) : undefined,
      category: item.category ? String(item.category) : undefined,
      jobId: item.jobId ? String(item.jobId) : undefined,
      repo: item.repo ? String(item.repo) : undefined,
      message: item.message ? String(item.message) : "",
      pretty: item.pretty ? String(item.pretty) : undefined,
    };
  } catch {
    return null;
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function buildStreamUrl(baseUrl: string, jobId: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/$/, "");
  const endpoint = `${normalizedBase}/logs/code-worker/stream`;

  if (!jobId.trim()) {
    return endpoint;
  }

  const params = new URLSearchParams({ jobId: jobId.trim() });
  return `${endpoint}?${params.toString()}`;
}

export function LiveCodeWorkerLogs({
  defaultBaseUrl = "http://localhost:8080",
  defaultJobId = "",
}: LiveCodeWorkerLogsProps) {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [jobId, setJobId] = useState(defaultJobId);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [logs, setLogs] = useState<CodeWorkerLogEvent[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Idle");

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const manualDisconnectRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const connectSnapshotRef = useRef<{ baseUrl: string; jobId: string } | null>(null);

  const appendLog = useCallback((item: CodeWorkerLogEvent) => {
    setLogs((previous) => {
      const next = [...previous, item];
      if (next.length > MAX_LOG_LINES) {
        return next.slice(next.length - MAX_LOG_LINES);
      }
      return next;
    });
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const closeSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (nextBaseUrl: string, nextJobId: string, manual = false) => {
      const trimmedBaseUrl = nextBaseUrl.trim();

      if (!trimmedBaseUrl) {
        setStatus("error");
        setStatusText("Server URL is required.");
        return;
      }

      manualDisconnectRef.current = false;
      clearRetryTimer();
      closeSource();

      const streamUrl = buildStreamUrl(trimmedBaseUrl, nextJobId);
      connectSnapshotRef.current = { baseUrl: trimmedBaseUrl, jobId: nextJobId };
      setStatus("connecting");
      setStatusText(`Connecting to ${streamUrl}`);

      let source: EventSource;

      try {
        source = new EventSource(streamUrl);
      } catch {
        setStatus("error");
        setStatusText("Invalid stream URL. Check the server base URL.");
        return;
      }

      eventSourceRef.current = source;

      source.onopen = () => {
        setStatus("connected");
        setStatusText("Connected");
        setRetryAttempt(0);
      };

      source.addEventListener("connected", () => {
        setStatus("connected");
        setStatusText("Connected");
        setRetryAttempt(0);
      });

      source.addEventListener("heartbeat", () => {
        setLastHeartbeatAt(new Date().toISOString());
      });

      source.addEventListener("log", (event) => {
        const parsed = parseLogPayload((event as MessageEvent<string>).data);
        if (parsed) {
          appendLog(parsed);
        }
      });

      source.onmessage = (event) => {
        const parsed = parseLogPayload(event.data);
        if (parsed) {
          appendLog(parsed);
        }
      };

      source.onerror = () => {
        closeSource();

        if (manualDisconnectRef.current) {
          setStatus("disconnected");
          setStatusText("Disconnected");
          return;
        }

        setStatus("error");

        setRetryAttempt((previous) => {
          const nextAttempt = previous + 1;
          const delay = Math.min(1000 * 2 ** Math.min(nextAttempt - 1, 4), 15000);
          setStatusText(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`);

          clearRetryTimer();
          retryTimeoutRef.current = window.setTimeout(() => {
            if (!connectSnapshotRef.current) {
              return;
            }

            connect(connectSnapshotRef.current.baseUrl, connectSnapshotRef.current.jobId);
          }, delay);

          return nextAttempt;
        });
      };

      if (manual) {
        setStatusText("Connecting...");
      }
    },
    [appendLog, clearRetryTimer, closeSource],
  );

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearRetryTimer();
    closeSource();
    setStatus("disconnected");
    setStatusText("Disconnected");
  }, [clearRetryTimer, closeSource]);

  useEffect(() => {
    return () => {
      manualDisconnectRef.current = true;
      clearRetryTimer();
      closeSource();
    };
  }, [clearRetryTimer, closeSource]);

  useEffect(() => {
    if (!autoScroll || !scrollContainerRef.current) {
      return;
    }

    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [autoScroll, logs]);

  const statusToneClass =
    status === "connected"
      ? "bg-emerald-100 text-emerald-700"
      : status === "connecting"
        ? "bg-sky-100 text-sky-700"
        : status === "error"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate-700";

  const visibleLogLines = useMemo(
    () =>
      logs.map((item) =>
        item.pretty
          ? item.pretty
          : `[${item.ts}] [${(item.level ?? "info").toUpperCase()}] [${item.stage ?? "runtime"}] ${item.message ?? ""}`,
      ),
    [logs],
  );

  const handleCopyVisible = useCallback(async () => {
    if (visibleLogLines.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(visibleLogLines.join("\n"));
      setStatusText("Visible logs copied to clipboard.");
    } catch {
      setStatusText("Unable to copy logs to clipboard.");
    }
  }, [visibleLogLines]);

  const handleDownload = useCallback(() => {
    if (visibleLogLines.length === 0) {
      return;
    }

    const blob = new Blob([visibleLogLines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `code-worker-logs-${Date.now()}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [visibleLogLines]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
      <div className="sticky top-0 z-10 rounded-t-3xl border-b border-slate-200 bg-white/90 p-4 backdrop-blur sm:p-5">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Server base URL"
              placeholder="http://localhost:8080"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />

            <Input
              label="Job ID (optional)"
              placeholder="123"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => connect(baseUrl, jobId, true)}>
              Connect
            </Button>
            <Button variant="secondary" onClick={disconnect}>
              Disconnect
            </Button>
            <Button variant="ghost" onClick={() => setLogs([])}>
              Clear
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoScroll((previous) => !previous)}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {autoScroll ? "Pause Auto-scroll" : "Resume Auto-scroll"}
            </button>
            <Button variant="secondary" onClick={() => void handleCopyVisible()}>
              Copy Visible Logs
            </Button>
            <Button variant="secondary" onClick={handleDownload}>
              Download .txt
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className={cn("rounded-full px-3 py-1 font-semibold", statusToneClass)}>
            {status.toUpperCase()}
          </span>
          <span className="text-slate-600">{statusText}</span>
          <span className="text-slate-500">Retries: {retryAttempt}</span>
          <span className="text-slate-500">Lines: {logs.length}</span>
          {lastHeartbeatAt ? (
            <span className="text-slate-500">Heartbeat: {formatTimestamp(lastHeartbeatAt)}</span>
          ) : null}
        </div>
      </div>

      <div ref={scrollContainerRef} className="max-h-[65vh] overflow-auto p-3 sm:p-5">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            No logs yet. Connect to start streaming from <span className="font-mono">/logs/code-worker/stream</span>.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const level = (log.level ?? "info").toLowerCase();
              const levelClass = levelClassMap[level] ?? "text-slate-700";
              const isUnitTest = (log.category ?? "").toLowerCase() === "unit_test";

              return (
                <article
                  key={log.id}
                  className={cn(
                    "rounded-xl border bg-white/80 p-3 font-mono text-xs leading-relaxed sm:text-sm",
                    isUnitTest
                      ? "border-violet-300 bg-violet-50/60"
                      : "border-slate-200",
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                      {formatTimestamp(log.ts)}
                    </span>
                    <span className={cn("font-semibold uppercase", levelClass)}>{level}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                      {log.stage ?? "runtime"}
                    </span>
                    {log.category ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5",
                          isUnitTest
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {log.category}
                      </span>
                    ) : null}
                    {log.jobId ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                        job={log.jobId}
                      </span>
                    ) : null}
                  </div>

                  <p className={cn("break-words text-slate-700", isUnitTest ? "font-semibold" : "")}>{log.message ?? ""}</p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
