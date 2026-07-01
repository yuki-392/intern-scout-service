"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCompanyJobPostings } from "./job-posting-api";
import type { JobPosting } from "./job-posting-types";
import styles from "./job-postings.module.css";
export function CompanyJobList() { const [jobs, setJobs] = useState<JobPosting[] | null>(null); const [failed, setFailed] = useState(false); useEffect(() => { void getCompanyJobPostings().then(setJobs).catch(() => setFailed(true)); }, []); if (failed) return <p>募集を読み込めませんでした</p>; if (!jobs) return <p>募集を読み込んでいます</p>; return <div><Link href="/company/jobs/new">新しい募集を作成</Link>{jobs.length === 0 ? <p>作成した募集はありません</p> : <ul className={styles.list}>{jobs.map((job) => <li className={styles.panel} key={job.id}><h2>{job.title}</h2><p>{job.status === "published" ? "公開中" : "非公開"}</p><Link href={`/company/jobs/${job.id}/edit`}>編集する</Link></li>)}</ul>}</div>; }
