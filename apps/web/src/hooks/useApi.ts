"use client";

import { useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.preship.dev";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: false });

  const execute = useCallback(async (path: string, options: ApiOptions = {}) => {
    setState({ data: null, error: null, loading: true });
    try {
      const data = await apiFetch<T>(path, options);
      setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setState({ data: null, error: message, loading: false });
      throw err;
    }
  }, []);

  return { ...state, execute };
}

export default useApi;
