"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCompanyJobPostings } from "./job-posting-api";
import type { JobPosting, Meta } from "./job-posting-types";
import styles from "./job-postings.module.css";

type CompanyPostingPage = {
  data: JobPosting[];
  meta: Meta;
  loadedKey: string;
};

export function CompanyJobList({ page, refreshKey = "initial" }: { page: number; refreshKey?: string }) {
  const [result, setResult] = useState<CompanyPostingPage | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const requestKey = `${page}:${refreshKey}`;

  useEffect(() => {
    let active = true;
    void getCompanyJobPostings(page)
      .then((nextResult) => {
        if (active) setResult({ ...nextResult, loadedKey: requestKey });
      })
      .catch(() => {
        if (active) setFailedKey(requestKey);
      });
    return () => { active = false; };
  }, [page, refreshKey, requestKey]);

  if (failedKey === requestKey) return <p>募集を読み込めませんでした</p>;
  if (!result || result.loadedKey !== requestKey) return <p>募集を読み込んでいます</p>;
  if (result.data.length === 0) {
    return <section className={styles.emptyState}><h2>作成した募集はありません</h2><p>募集を公開すると、インターン生からの応募を受け付けられます。</p><Link className={styles.detailLink} href="/company/jobs/new">新しい募集を作成</Link></section>;
  }

  const { current_page: currentPage, total_pages: totalPages } = result.meta;
  return (
    <div>
      <Link className={styles.detailLink} href="/company/jobs/new">新しい募集を作成</Link>
      <ul className={styles.list}>
        {result.data.map((job) => <li className={styles.panel} key={job.id}><h2>{job.title}</h2><p>{job.status === "published" ? "公開中" : "非公開"}</p><Link href={`/company/jobs/${job.id}/edit`}>編集する</Link></li>)}
      </ul>
      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="自社募集のページ移動">
          {currentPage > 1 ? <Link href={`/company/jobs?page=${currentPage - 1}`} rel="prev">前へ</Link> : <span />}
          <span>{currentPage} / {totalPages}ページ</span>
          {currentPage < totalPages ? <Link href={`/company/jobs?page=${currentPage + 1}`} rel="next">次へ</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
