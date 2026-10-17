import { ApiResponse } from "./handler";

export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string[]>;

  constructor(message: string, code = "API_ERROR", status = 400, fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<{ data: T; meta?: ApiResponse<T>["meta"] }> {
  const { params, headers, ...customConfig } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...customConfig,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
      }
    }
    throw new ApiError("Session expired or unauthorized", "UNAUTHORIZED", 401);
  }

  // Handle CSV or file downloads directly if Content-Type matches
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("text/csv") || contentType.includes("application/octet-stream")) {
    const blob = await response.blob();
    return { data: blob as unknown as T };
  }

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || json.error) {
    const error = json.error || {
      code: `HTTP_${response.status}`,
      message: "An unknown error occurred",
    };
    throw new ApiError(error.message, error.code, response.status, error.fields);
  }

  return {
    data: json.data as T,
    meta: json.meta,
  };
}

apiClient.get = <T>(endpoint: string, options?: FetchOptions) =>
  apiClient<T>(endpoint, { method: "GET", ...options });

apiClient.post = <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
  apiClient<T>(endpoint, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

apiClient.patch = <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
  apiClient<T>(endpoint, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

apiClient.put = <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
  apiClient<T>(endpoint, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

apiClient.delete = <T>(endpoint: string, options?: FetchOptions) =>
  apiClient<T>(endpoint, { method: "DELETE", ...options });

