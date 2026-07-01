import type {
  ApiErrorResponse,
  CurrentUser,
  LoginInput,
  RegistrationInput,
} from "./auth-types";

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
      const body = (await response.json()) as {
        data: { csrf_token: string };
      };
      csrfToken = body.data.csrf_token;
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
}

export async function registerUser(
  input: RegistrationInput,
): Promise<CurrentUser> {
  const user = await sendWithCsrf("/api/v1/auth/registrations", "POST", {
    user: input,
  });
  clearCsrfToken();
  return user;
}

export async function loginUser(input: LoginInput): Promise<CurrentUser> {
  const user = await sendWithCsrf("/api/v1/auth/session", "POST", {
    session: input,
  });
  clearCsrfToken();
  return user;
}

export async function logoutUser(): Promise<void> {
  await sendWithCsrf("/api/v1/auth/session", "DELETE");
  clearCsrfToken();
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await fetch("/api/v1/me", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    const error = await parseError(response);
    throw { status: response.status, ...error };
  }
  const payload = (await response.json()) as { data: CurrentUser };
  return payload.data;
}

async function sendWithCsrf(
  path: string,
  method: "POST" | "DELETE",
  body?: object,
  retry = true,
): Promise<CurrentUser> {
  const token = await prefetchCsrfToken();
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.ok) {
    if (response.status === 204) return undefined as never;
    const payload = (await response.json()) as { data: CurrentUser };
    return payload.data;
  }

  const error = await parseError(response);
  if (retry && error.errors.some(({ code }) => code === "invalid_csrf_token")) {
    clearCsrfToken();
    return sendWithCsrf(path, method, body, false);
  }
  throw error;
}

async function parseError(response: Response): Promise<ApiErrorResponse> {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return {
      errors: [
        {
          code: "request_failed",
          message: "通信に失敗しました。時間をおいてもう一度お試しください",
        },
      ],
    };
  }
}

function clearCsrfToken() {
  csrfToken = null;
  csrfRequest = null;
}
