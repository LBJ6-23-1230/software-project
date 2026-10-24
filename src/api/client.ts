let token = sessionStorage.getItem("campus-session") || "";
export function setToken(value: string) {
  token = value;
  if (value) sessionStorage.setItem("campus-session", value);
  else sessionStorage.removeItem("campus-session");
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  // R03: a proxy HTML response must never be mistaken for a successful write.
  const result = await response.json().catch(() => {
    throw new Error("服务返回了无法识别的响应，请刷新确认结果后重试");
  });
  if (!response.ok) {
    const message = result?.error?.message;
    throw new Error(typeof message === "string" ? message : "操作失败，请重试");
  }
  if (result === null || typeof result !== "object")
    throw new Error("服务返回了无法识别的响应，请刷新确认结果后重试");
  return result as T;
}
export const post = <T>(path: string, body: unknown = {}) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "操作失败，请重试";
