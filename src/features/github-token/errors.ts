import { ApiError } from "@/lib/api/client";

export type GithubTokenFieldErrors = Record<string, string>;

export class GithubTokenError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly fieldErrors: GithubTokenFieldErrors;

  constructor(
    message: string,
    status: number,
    payload: unknown,
    fieldErrors: GithubTokenFieldErrors = {},
  ) {
    super(message);
    this.name = "GithubTokenError";
    this.status = status;
    this.payload = payload;
    this.fieldErrors = fieldErrors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFieldErrors(payload: unknown): GithubTokenFieldErrors {
  if (!isRecord(payload)) {
    return {};
  }

  const errors = payload.errors;
  if (!errors) {
    return {};
  }

  const fieldErrors: GithubTokenFieldErrors = {};

  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (!isRecord(item)) {
        continue;
      }

      const message = typeof item.message === "string" ? item.message : null;
      if (!message) {
        continue;
      }

      const keyCandidate =
        (typeof item.field === "string" && item.field) ||
        (typeof item.path === "string" && item.path) ||
        (typeof item.param === "string" && item.param) ||
        "access_token";

      if (!fieldErrors[keyCandidate]) {
        fieldErrors[keyCandidate] = message;
      }
    }

    return fieldErrors;
  }

  if (isRecord(errors)) {
    for (const [key, value] of Object.entries(errors)) {
      if (typeof value === "string") {
        fieldErrors[key] = value;
        continue;
      }

      if (Array.isArray(value) && typeof value[0] === "string") {
        fieldErrors[key] = value[0];
      }
    }
  }

  return fieldErrors;
}

function extractPayloadMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  const fieldErrors = toFieldErrors(payload);
  const firstFieldError = Object.values(fieldErrors)[0];
  return firstFieldError ?? null;
}

export function normalizeGithubTokenError(
  error: unknown,
  fallbackMessage = "An error occurred, please try again.",
): GithubTokenError {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error) {
      return new GithubTokenError(error.message, 0, null, {});
    }

    return new GithubTokenError(fallbackMessage, 0, null, {});
  }

  const fieldErrors = toFieldErrors(error.payload);
  const payloadMessage = extractPayloadMessage(error.payload);

  const messageByStatus: Record<number, string> = {
    404: "Token or Monitor not found",
    409: "GitHub token already exists for this user",
    422: payloadMessage ?? "Validation failed. Please check the form fields.",
    500: "An error occurred, please try again",
    503: "Failed to fetch GitHub token",
  };

  const message = messageByStatus[error.status] ?? payloadMessage ?? error.message ?? fallbackMessage;

  return new GithubTokenError(message, error.status, error.payload, fieldErrors);
}
