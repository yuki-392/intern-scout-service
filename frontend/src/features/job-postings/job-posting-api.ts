import { prefetchCsrfToken } from "../auth/auth-api";
import { notifyIfSessionExpired } from "../auth/session-expiration";
import type { JobPosting, JobPostingInput, Meta } from "./job-posting-types";

export async function saveCompanyJobPosting(id: number | null, input: JobPostingInput): Promise<JobPosting> {
  return (await mutate(id ? `/api/v1/company/job_postings/${id}` : "/api/v1/company/job_postings", id ? "PATCH" : "POST", { job_posting: input })).data;
}
export async function getCompanyJobPostings(): Promise<JobPosting[]> { return (await request("/api/v1/company/job_postings")).data; }
export async function getCompanyJobPosting(id: number): Promise<JobPosting> { return (await request(`/api/v1/company/job_postings/${id}`)).data; }
export async function getPublicJobPostings(page: number): Promise<{ data: JobPosting[]; meta: Meta }> { return request(`/api/v1/job_postings?page=${page}`); }
export async function getPublicJobPosting(id: number): Promise<JobPosting> { return (await request(`/api/v1/job_postings/${id}`)).data; }
export async function applyToJobPosting(id: number): Promise<{ conversation_id: number }> { return (await mutate(`/api/v1/job_postings/${id}/applications`, "POST", {})).data; }
async function request(path: string) { const response = await fetch(path, { cache: "no-store", credentials: "same-origin" }); return parse(response); }
async function mutate(path: string, method: string, body: object) { const token = await prefetchCsrfToken(); const response = await fetch(path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(body) }); return parse(response); }
async function parse(response: Response) { notifyIfSessionExpired(response); const body = await response.json(); if (!response.ok) throw { status: response.status, ...body }; return body; }
