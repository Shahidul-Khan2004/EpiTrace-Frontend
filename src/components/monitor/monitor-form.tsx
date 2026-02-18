"use client";

import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseJsonField, prettifyJson } from "@/features/monitor/form-utils";
import type {
  CreateMonitorPayload,
  CreateWebhookPayload,
  HttpMethod,
  Monitor,
  NotificationProvider,
  UpdateMonitorPayload,
} from "@/types/api";
import { useEffect, useMemo, useState, type FormEvent } from "react";

interface MonitorFormProps {
  mode: "create" | "update";
  initialValues?: Partial<Monitor>;
  onSubmit: (payload: MonitorFormSubmission) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export type MonitorFormSubmission =
  | {
      mode: "create";
      monitor: CreateMonitorPayload;
      webhook: CreateWebhookPayload;
    }
  | {
      mode: "update";
      monitor: UpdateMonitorPayload;
    };

interface MonitorFormState {
  name: string;
  url: string;
  repoLink: string;
  method: HttpMethod;
  notificationProvider: NotificationProvider | "";
  notificationWebhookUrl: string;
  requestHeader: string;
  requestBody: string;
  checkInterval: string;
  timeout: string;
  isActive: boolean;
}

const notificationProviders: NotificationProvider[] = ["slack", "discord"];

const defaultState: MonitorFormState = {
  name: "",
  url: "",
  repoLink: "",
  method: "GET",
  notificationProvider: "",
  notificationWebhookUrl: "",
  requestHeader: "",
  requestBody: "",
  checkInterval: "10",
  timeout: "5",
  isActive: false,
};

function isValidWebhookUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function buildState(initialValues?: Partial<Monitor>): MonitorFormState {
  if (!initialValues) {
    return defaultState;
  }

  return {
    name: initialValues.name ?? "",
    url: initialValues.url ?? "",
    repoLink: initialValues.repo_link ?? "",
    method: initialValues.method ?? "GET",
    notificationProvider: "",
    notificationWebhookUrl: "",
    requestHeader: prettifyJson(initialValues.request_header),
    requestBody: prettifyJson(initialValues.request_body),
    checkInterval: String(initialValues.check_interval ?? 10),
    timeout: String(initialValues.timeout ?? 5),
    isActive: Boolean(initialValues.is_active),
  };
}

export function MonitorForm({
  mode,
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitLabel,
}: MonitorFormProps) {
  const [state, setState] = useState<MonitorFormState>(() => buildState(initialValues));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stateFromInitialValues = useMemo(() => buildState(initialValues), [initialValues]);

  useEffect(() => {
    setState(stateFromInitialValues);
  }, [stateFromInitialValues]);

  const updateField = <K extends keyof MonitorFormState>(field: K, value: MonitorFormState[K]) => {
    setState((previous) => ({ ...previous, [field]: value }));
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const checkInterval = Number(state.checkInterval);
    const timeout = Number(state.timeout);
    const notificationProvider = state.notificationProvider;
    const notificationWebhookUrl = state.notificationWebhookUrl.trim();

    if (!state.name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }

    if (!state.url.trim()) {
      setErrorMessage("URL is required.");
      return;
    }

    if (!state.repoLink.trim()) {
      setErrorMessage("Repository link is required.");
      return;
    }

    if (!Number.isInteger(checkInterval) || checkInterval < 10) {
      setErrorMessage("Check interval must be an integer of at least 10 seconds.");
      return;
    }

    if (!Number.isInteger(timeout) || timeout < 1) {
      setErrorMessage("Timeout must be an integer of at least 1 second.");
      return;
    }

    if (mode === "create" && !notificationProvider) {
      setErrorMessage("Notification provider is required.");
      return;
    }

    if (
      notificationProvider &&
      !notificationProviders.includes(notificationProvider as NotificationProvider)
    ) {
      setErrorMessage("Notification provider must be either slack or discord.");
      return;
    }

    if (mode === "create" && !notificationWebhookUrl) {
      setErrorMessage("Notification webhook URL is required.");
      return;
    }

    if (notificationWebhookUrl && !isValidWebhookUrl(notificationWebhookUrl)) {
      setErrorMessage("Notification webhook URL must be a valid URL.");
      return;
    }

    try {
      const requestHeader = parseJsonField(state.requestHeader, "Request headers");
      const requestBody = parseJsonField(state.requestBody, "Request body");
      if (
        requestHeader !== undefined &&
        (typeof requestHeader !== "object" || requestHeader === null || Array.isArray(requestHeader))
      ) {
        throw new Error("Request headers must be a JSON object.");
      }

      const normalizedHeaders = requestHeader as Record<string, unknown> | undefined;

      if (mode === "create") {
        await onSubmit({
          mode: "create",
          monitor: {
            name: state.name,
            url: state.url,
            repo_link: state.repoLink,
            method: state.method,
            request_header: normalizedHeaders,
            request_body: requestBody,
            check_interval: checkInterval,
            timeout,
            is_active: state.isActive,
          },
          webhook: {
            provider: notificationProvider as NotificationProvider,
            webhook_url: notificationWebhookUrl,
          },
        });

        setState(defaultState);
        return;
      }

      await onSubmit({
        mode: "update",
        monitor: {
          name: state.name,
          url: state.url,
          repo_link: state.repoLink,
          method: state.method,
          request_header: normalizedHeaders,
          request_body: requestBody,
          check_interval: checkInterval,
          timeout,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage("Unable to submit monitor form.");
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {errorMessage ? <Alert message={errorMessage} tone="error" /> : null}

      <div className="space-y-5">
        <Input
          label="Monitor Name"
          value={state.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Primary API"
          required
        />

        <Input
          label="Target URL"
          type="url"
          value={state.url}
          onChange={(event) => updateField("url", event.target.value)}
          placeholder="https://example.com/health"
          required
        />

        <Input
          label="Repository Link"
          type="url"
          value={state.repoLink}
          onChange={(event) => updateField("repoLink", event.target.value)}
          placeholder="https://github.com/org/repository"
          required
        />

        {mode === "create" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Notification Provider"
              value={state.notificationProvider}
              onChange={(event) =>
                updateField("notificationProvider", event.target.value as NotificationProvider | "")
              }
              required
            >
              <option value="" disabled>
                Select a provider
              </option>
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
            </Select>

            <Input
              label="Notification Webhook URL"
              type="url"
              value={state.notificationWebhookUrl}
              onChange={(event) => updateField("notificationWebhookUrl", event.target.value)}
              placeholder="https://hooks.slack.com/services/XXX/YYY/ZZZ"
              required
            />
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="HTTP Method"
            value={state.method}
            onChange={(event) => updateField("method", event.target.value as HttpMethod)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </Select>

          <Input
            label="Timeout (seconds)"
            type="number"
            min={1}
            step={1}
            value={state.timeout}
            onChange={(event) => updateField("timeout", event.target.value)}
            required
          />
        </div>

        <Input
          label="Check Interval (seconds)"
          type="number"
          min={10}
          step={1}
          value={state.checkInterval}
          onChange={(event) => updateField("checkInterval", event.target.value)}
          required
        />

        <Textarea
          label="Request Headers (JSON, optional)"
          value={state.requestHeader}
          onChange={(event) => updateField("requestHeader", event.target.value)}
          placeholder='{"Authorization": "Bearer token"}'
        />

        <Textarea
          label="Request Body (JSON, optional)"
          value={state.requestBody}
          onChange={(event) => updateField("requestBody", event.target.value)}
          placeholder='{"key": "value"}'
        />

        {mode === "create" ? (
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={state.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Start monitor immediately after creating
          </label>
        ) : null}
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        {submitLabel ?? (mode === "create" ? "Create Monitor" : "Update Monitor")}
      </Button>
    </form>
  );
}
