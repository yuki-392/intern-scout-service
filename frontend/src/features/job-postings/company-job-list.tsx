"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCompanyJobPostings } from "./job-posting-api";
import type { JobPosting } from "./job-posting-types";
import styles from "./job-postings.module.css";
export function CompanyJobList() { const [jobs, setJobs] = useState<JobPosting[] | null>(null); const [failed, setFailed] = useState(false); useEffect(() => { void getCompanyJobPostings().then(setJobs).catch(() => setFailed(true)); }, []); if (failed) return <p>募集を読み込めませんでした</p>; if (!jobs) return <p>募集を読み込んでいます</p>; if (jobs.length === 0) return <section className={styles.emptyState}><h2>作成した募集はありません</h2><p>募集を公開すると、インターン生からの応募を受け付けられます。</p><Link className={styles.detailLink} href="/company/jobs/new">新しい募集を作成</Link></section>; return <div><Link className={styles.detailLink} href="/company/jobs/new">新しい募集を作成</Link><ul className={styles.list}>{jobs.map((job) => <li className={styles.panel} key={job.id}><h2>{job.title}</h2><p>{job.status === "published" ? "公開中" : "非公開"}</p><Link href={`/company/jobs/${job.id}/edit`}>編集する</Link></li>)}</ul></div>; }
