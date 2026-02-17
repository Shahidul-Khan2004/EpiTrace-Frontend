export function prettifyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export function parseJsonField(raw: string, fieldName: string): unknown | undefined {
  if (!raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${fieldName} must be valid JSON.`);
  }
}
