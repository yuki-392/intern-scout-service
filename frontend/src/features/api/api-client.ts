import type { ApiErrorResponse } from "../auth/auth-types";
import { notifyIfSessionExpired } from "../auth/session-expiration";
import { clearCsrfToken, prefetchCsrfToken } from "./csrf";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  return parseResponse<T>(response);
}

export async function apiMutate<T>(path: string, init: RequestInit, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-CSRF-Token", await prefetchCsrfToken());
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  });

  try {
    return await parseResponse<T>(response);
  } catch (error) {
    if (retry && isInvalidCsrf(error)) {
      clearCsrfToken();
      return apiMutate<T>(path, init, false);
    }
    throw error;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  notifyIfSessionExpired(response);
  if (response.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (response.ok) return undefined as T;
    body = requestFailed();
  }

  if (!response.ok) throw { status: response.status, ...asErrorResponse(body) };
  return body as T;
}

function asErrorResponse(value: unknown): ApiErrorResponse {
  if (value && typeof value === "object" && "errors" in value && Array.isArray(value.errors)) {
    return value as ApiErrorResponse;
  }
  return requestFailed();
}

function isInvalidCsrf(value: unknown): boolean {
  return Boolean(
    value && typeof value === "object" && "errors" in value &&
    Array.isArray(value.errors) &&
    value.errors.some((error: unknown) => error && typeof error === "object" && "code" in error && error.code === "invalid_csrf_token"),
  );
}

function requestFailed(): ApiErrorResponse {
  return { errors: [{ code: "request_failed", message: "通信に失敗しました。時間をおいてもう一度お試しください" }] };
}
