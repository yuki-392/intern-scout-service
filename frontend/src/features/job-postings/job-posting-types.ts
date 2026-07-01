export type JobPosting = { id: number; company_name: string; title: string; description: string; work_conditions: string; status?: "draft" | "published"; technical_stacks: string[]; published_at?: string; applied?: boolean };
export type JobPostingInput = { title: string; description: string; work_conditions: string; status: "draft" | "published"; technical_stacks: string[] };
export type Meta = { current_page: number; total_pages: number; total_count: number; per_page: number };
