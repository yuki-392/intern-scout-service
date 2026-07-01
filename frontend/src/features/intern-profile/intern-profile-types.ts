export type InternProfile = {
  id: number;
  display_name: string;
  school_name: string;
  grade: string;
  bio: string;
  desired_role: string | null;
  technical_stacks: string[];
  published: boolean;
  published_at: string;
};

export type InternProfileInput = Omit<InternProfile, "id" | "published" | "published_at">;
