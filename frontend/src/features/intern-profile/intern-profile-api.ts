import { apiMutate, apiRequest } from "../api/api-client";
import type { InternProfile, InternProfileInput } from "./intern-profile-types";

export async function getInternProfile(): Promise<InternProfile | null> {
  return (await apiRequest<{ data: InternProfile | null }>("/api/v1/me/intern_profile")).data;
}

export async function saveInternProfile(input: InternProfileInput): Promise<InternProfile> {
  return (await apiMutate<{ data: InternProfile }>("/api/v1/me/intern_profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intern_profile: input }),
  })).data;
}
