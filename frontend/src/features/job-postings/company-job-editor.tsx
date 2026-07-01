"use client";
import { useEffect, useState } from "react";
import { getCompanyJobPosting } from "./job-posting-api";
import type { JobPosting } from "./job-posting-types";
import { JobPostingForm } from "./job-posting-form";
export function CompanyJobEditor({ id }: { id: number }) { const [job, setJob] = useState<JobPosting | null>(null); const [failed, setFailed] = useState(false); useEffect(() => { void getCompanyJobPosting(id).then(setJob).catch(() => setFailed(true)); }, [id]); if (failed) return <p>募集が見つかりません</p>; if (!job) return <p>募集を読み込んでいます</p>; return <JobPostingForm posting={job} />; }
