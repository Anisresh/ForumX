const TOKEN_KEY = "forumx_token";

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export function getToken(): string | null {
  return safeGet(TOKEN_KEY);
}

export function setToken(token: string): void {
  safeSet(TOKEN_KEY, token);
}

export function clearToken(): void {
  safeRemove(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
