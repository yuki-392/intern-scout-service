import { prefetchCsrfToken } from "../auth/auth-api";
import { notifyIfSessionExpired } from "../auth/session-expiration";
import type { InternProfile, InternProfileInput } from "./intern-profile-types";

export async function getInternProfile(): Promise<InternProfile | null> {
  const response = await fetch("/api/v1/me/intern_profile", { cache: "no-store", credentials: "same-origin" });
  return unwrap(response);
}

export async function saveInternProfile(input: InternProfileInput): Promise<InternProfile> {
  const token = await prefetchCsrfToken();
  const response = await fetch("/api/v1/me/intern_profile", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify({ intern_profile: input }),
  });
  return unwrap(response) as Promise<InternProfile>;
}

async function unwrap(response: Response) {
  notifyIfSessionExpired(response);
  const body = await response.json();
  if (!response.ok) throw { status: response.status, ...body };
  return body.data;
}
