import { ApiError } from "@/lib/api/client";

export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const payload = error.payload;

    if (payload && typeof payload === "object") {
      if ("error" in payload && typeof payload.error === "string") {
        return payload.error;
      }

      if ("message" in payload && typeof payload.message === "string") {
        return payload.message;
      }

      if ("errors" in payload && Array.isArray(payload.errors)) {
        const firstError = payload.errors[0];
        if (
          firstError &&
          typeof firstError === "object" &&
          "message" in firstError &&
          typeof firstError.message === "string"
        ) {
          return firstError.message;
        }
      }
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error. Please try again.";
}
