import type { InternDetailData, InternListResponse, InternQuery } from "./intern-types";
import { notifyIfSessionExpired } from "../auth/session-expiration";

export async function getInterns(query: InternQuery): Promise<InternListResponse> {
  const response = await fetch(`/api/v1/interns?${queryString(query)}`, { cache: "no-store", credentials: "same-origin" });
  return parse(response);
}

export async function getIntern(id: number): Promise<InternDetailData> {
  const response = await fetch(`/api/v1/interns/${id}`, { cache: "no-store", credentials: "same-origin" });
  return parse(response).then((body) => body.data);
}

export function queryString(query: InternQuery) {
  const params = new URLSearchParams();
  if (query.school_name) params.set("school_name", query.school_name);
  if (query.desired_role) params.set("desired_role", query.desired_role);
  if (query.technical_stack) params.set("technical_stack", query.technical_stack);
  params.set("page", String(query.page));
  return params.toString();
}

async function parse(response: Response) {
  notifyIfSessionExpired(response);
  const body = await response.json();
  if (!response.ok) throw { status: response.status, ...body };
  return body;
}
