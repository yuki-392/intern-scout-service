export type InternQuery = { school_name: string; desired_role: string; technical_stack: string; page: number };
export type InternSummary = { id: number; display_name: string; school_name: string; grade: string; bio_excerpt: string; desired_role: string | null; technical_stacks: string[]; published_at: string };
export type InternDetailData = Omit<InternSummary, "bio_excerpt"> & { bio: string; conversation_id: number | null };
export type InternListResponse = { data: InternSummary[]; meta: { current_page: number; total_pages: number; total_count: number; per_page: number } };
