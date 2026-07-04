import { apiMutate, apiRequest } from "../api/api-client";
import type { JobPosting, JobPostingInput, Meta } from "./job-posting-types";

export async function saveCompanyJobPosting(id: number | null, input: JobPostingInput): Promise<JobPosting> {
  const path = id ? `/api/v1/company/job_postings/${id}` : "/api/v1/company/job_postings";
  return (await apiMutate<{ data: JobPosting }>(path, jsonInit(id ? "PATCH" : "POST", { job_posting: input }))).data;
}
export function getCompanyJobPostings(page: number): Promise<{ data: JobPosting[]; meta: Meta }> { return apiRequest(`/api/v1/company/job_postings?page=${page}`); }
export async function getCompanyJobPosting(id: number): Promise<JobPosting> { return (await apiRequest<{ data: JobPosting }>(`/api/v1/company/job_postings/${id}`)).data; }
export function getPublicJobPostings(page: number): Promise<{ data: JobPosting[]; meta: Meta }> { return apiRequest(`/api/v1/job_postings?page=${page}`); }
export async function getPublicJobPosting(id: number): Promise<JobPosting> { return (await apiRequest<{ data: JobPosting }>(`/api/v1/job_postings/${id}`)).data; }
export async function applyToJobPosting(id: number): Promise<{ conversation_id: number }> { return (await apiMutate<{ data: { conversation_id: number } }>(`/api/v1/job_postings/${id}/applications`, jsonInit("POST", {}))).data; }

function jsonInit(method: string, body: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
