import { prefetchCsrfToken } from "../auth/auth-api";
import { notifyIfSessionExpired } from "../auth/session-expiration";
import type { ApiErrorResponse } from "../auth/auth-types";

export async function deleteAccount(password: string): Promise<void> {
  const token = await prefetchCsrfToken();
  const response = await fetch("/api/v1/me/account", {
    method: "DELETE",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({ account: { password } }),
  });

  if (response.ok) return;
  notifyIfSessionExpired(response);

  try {
    throw (await response.json()) as ApiErrorResponse;
  } catch (error) {
    if (isApiError(error)) throw { status: response.status, ...error };
    throw {
      errors: [
        {
          code: "request_failed",
          message: "通信に失敗しました。時間をおいてもう一度お試しください",
        },
      ],
    } satisfies ApiErrorResponse;
  }
}

function isApiError(value: unknown): value is ApiErrorResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "errors" in value &&
      Array.isArray(value.errors),
  );
}
