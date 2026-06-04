import { QueryClient } from "@tanstack/react-query";
import { getToken } from "./auth";

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const headers: Record<string, string> = { ...getAuthHeaders() };
  if (data) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey.join("/") : (queryKey as string);
        const res = await fetch(url as string, { headers: getAuthHeaders() });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: { retry: false },
  },
});
