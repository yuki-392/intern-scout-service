import { apiMutate, apiRequest } from "../api/api-client";
import { clearCsrfToken, prefetchCsrfToken } from "../api/csrf";
import type { CurrentUser, LoginInput, RegistrationInput } from "./auth-types";

export { prefetchCsrfToken };

export async function registerUser(input: RegistrationInput): Promise<CurrentUser> {
  const payload = await apiMutate<{ data: CurrentUser }>("/api/v1/auth/registrations", jsonInit("POST", { user: input }));
  clearCsrfToken();
  return payload.data;
}

export async function loginUser(input: LoginInput): Promise<CurrentUser> {
  const payload = await apiMutate<{ data: CurrentUser }>("/api/v1/auth/session", jsonInit("POST", { session: input }));
  clearCsrfToken();
  return payload.data;
}

export async function logoutUser(): Promise<void> {
  await apiMutate<void>("/api/v1/auth/session", { method: "DELETE" });
  clearCsrfToken();
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiMutate<void>("/api/v1/auth/password_reset", jsonInit("POST", { email }));
}

export async function resetPassword(token: string, password: string, passwordConfirmation: string): Promise<void> {
  await apiMutate<void>("/api/v1/auth/password_reset", jsonInit("PATCH", { token, password, password_confirmation: passwordConfirmation }));
  clearCsrfToken();
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return (await apiRequest<{ data: CurrentUser }>("/api/v1/me")).data;
}

function jsonInit(method: string, body: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
