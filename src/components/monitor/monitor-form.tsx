"use client";

import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseJsonField, prettifyJson } from "@/features/monitor/form-utils";
import type {
  CreateMonitorPayload,
  HttpMethod,
  Monitor,
  UpdateMonitorPayload,
} from "@/types/api";
import { useEffect, useMemo, useState, type FormEvent } from "react";

interface MonitorFormProps {
  mode: "create" | "update";
  initialValues?: Partial<Monitor>;
  onSubmit: (payload: CreateMonitorPayload | UpdateMonitorPayload) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

interface MonitorFormState {
  name: string;
  url: string;
  method: HttpMethod;
  requestHeader: string;
  requestBody: string;
  checkInterval: string;
  timeout: string;
  isActive: boolean;
}

const defaultState: MonitorFormState = {
  name: "",
  url: "",
  method: "GET",
  requestHeader: "",
  requestBody: "",
  checkInterval: "10",
  timeout: "5",
  isActive: false,
};

function buildState(initialValues?: Partial<Monitor>): MonitorFormState {
  if (!initialValues) {
    return defaultState;
  }

  return {
    name: initialValues.name ?? "",
    url: initialValues.url ?? "",
    method: initialValues.method ?? "GET",
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

    if (!state.name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }

    if (!state.url.trim()) {
      setErrorMessage("URL is required.");
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
          name: state.name,
          url: state.url,
          method: state.method,
          request_header: normalizedHeaders,
          request_body: requestBody,
          check_interval: checkInterval,
          timeout,
          is_active: state.isActive,
        });

        setState(defaultState);
        return;
      }

      await onSubmit({
        name: state.name,
        url: state.url,
        method: state.method,
        request_header: normalizedHeaders,
        request_body: requestBody,
        check_interval: checkInterval,
        timeout,
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errorMessage ? <Alert message={errorMessage} tone="error" /> : null}

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

      <div className="grid gap-4 sm:grid-cols-2">
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
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(event) => updateField("isActive", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
          />
          Start monitor immediately after creating
        </label>
      ) : null}

      <Button type="submit" loading={isSubmitting}>
        {submitLabel ?? (mode === "create" ? "Create Monitor" : "Update Monitor")}
      </Button>
    </form>
  );
}
