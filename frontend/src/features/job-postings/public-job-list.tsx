"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicJobPostings } from "./job-posting-api";
import type { JobPosting } from "./job-posting-types";
import styles from "./job-postings.module.css";
export function PublicJobList({ page }: { page: number }) { const [jobs, setJobs] = useState<JobPosting[] | null>(null); const [failed, setFailed] = useState(false); useEffect(() => { void getPublicJobPostings(page).then((result) => setJobs(result.data)).catch(() => setFailed(true)); }, [page]); if (failed) return <p>募集を読み込めませんでした</p>; if (!jobs) return <p>募集を読み込んでいます</p>; if (!jobs.length) return <p>公開中の募集はありません</p>; return <ul className={styles.list}>{jobs.map((job) => <li className={styles.panel} key={job.id}><h2>{job.title}</h2><p>{job.company_name}</p><ul className={styles.stacks}>{job.technical_stacks.map((item) => <li key={item}>{item}</li>)}</ul>{job.applied && <p>応募済み</p>}<Link className={styles.detailLink} href={`/jobs/${job.id}`}>募集詳細を見る</Link></li>)}</ul>; }
