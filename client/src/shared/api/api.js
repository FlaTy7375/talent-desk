import { localizeApiError } from "./apiErrors";

export async function apiFetch(path, { method = "GET", token, body } = {}) {
  const headers = {};
  const isFormData = body instanceof FormData;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const raw = data.message || data.error || `HTTP ${res.status}`;
    const err = new Error(localizeApiError(raw));
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}
