import { apiRequest } from "../api/api-client";
import type { InternDetailData, InternListResponse, InternQuery } from "./intern-types";

export function getInterns(query: InternQuery): Promise<InternListResponse> {
  return apiRequest(`/api/v1/interns?${queryString(query)}`);
}

export async function getIntern(id: number): Promise<InternDetailData> {
  return (await apiRequest<{ data: InternDetailData }>(`/api/v1/interns/${id}`)).data;
}

export function queryString(query: InternQuery) {
  const params = new URLSearchParams();
  if (query.school_name) params.set("school_name", query.school_name);
  if (query.desired_role) params.set("desired_role", query.desired_role);
  if (query.technical_stack) params.set("technical_stack", query.technical_stack);
  params.set("page", String(query.page));
  return params.toString();
}
