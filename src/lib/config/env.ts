const DEFAULT_API_PROXY_BASE = "/api/backend";

export const env = {
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_PROXY_BASE ?? DEFAULT_API_PROXY_BASE).replace(
    /\/$/,
    "",
  ),
};
