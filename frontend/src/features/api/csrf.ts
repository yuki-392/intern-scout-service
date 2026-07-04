import type { ApiErrorResponse } from "../auth/auth-types";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

export function prefetchCsrfToken(): Promise<string> {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (csrfRequest) return csrfRequest;

  csrfRequest = fetch("/api/v1/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) throw await parseError(response);
      const body = (await response.json()) as { data: { csrf_token: string } };
      csrfToken = body.data.csrf_token;
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
}

export function clearCsrfToken() {
  csrfToken = null;
  csrfRequest = null;
}

async function parseError(response: Response): Promise<ApiErrorResponse> {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return requestFailed();
  }
}

function requestFailed(): ApiErrorResponse {
  return { errors: [{ code: "request_failed", message: "通信に失敗しました。時間をおいてもう一度お試しください" }] };
}
