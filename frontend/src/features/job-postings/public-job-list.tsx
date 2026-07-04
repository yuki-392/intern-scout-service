"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getPublicJobPostings } from "./job-posting-api";
import type { JobPosting, Meta } from "./job-posting-types";
import styles from "./job-postings.module.css";

type JobPostingPage = {
  data: JobPosting[];
  meta: Meta;
  requestedPage: number;
};

export function PublicJobList({ page }: { page: number }) {
  const [result, setResult] = useState<JobPostingPage | null>(null);
  const [failedPage, setFailedPage] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicJobPostings(page)
      .then((nextResult) => {
        if (active) setResult({ ...nextResult, requestedPage: page });
      })
      .catch(() => {
        if (active) setFailedPage(page);
      });
    return () => { active = false; };
  }, [page]);

  if (failedPage === page) return <p>募集を読み込めませんでした</p>;
  if (!result || result.requestedPage !== page) return <p>募集を読み込んでいます</p>;
  if (!result.data.length) {
    return (
      <section className={styles.emptyState}>
        <h2>公開中の募集はありません</h2>
        <p>新しい募集が公開されるまで、企業に伝わるプロフィールを準備しましょう。</p>
        <Link className={styles.detailLink} href="/profile/edit">プロフィールを充実させる</Link>
      </section>
    );
  }

  const { current_page: currentPage, total_pages: totalPages } = result.meta;
  return (
    <div>
      <ul className={styles.list}>
        {result.data.map((job) => (
          <li className={styles.panel} key={job.id}>
            <h2>{job.title}</h2>
            <p>{job.company_name}</p>
            <ul className={styles.stacks}>{job.technical_stacks.map((item) => <li key={item}>{item}</li>)}</ul>
            {job.applied ? <p>応募済み</p> : null}
            <Link className={styles.detailLink} href={`/jobs/${job.id}`}>募集詳細を見る</Link>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="募集一覧のページ移動">
          {currentPage > 1 ? <Link href={`/jobs?page=${currentPage - 1}`} rel="prev">前へ</Link> : <span />}
          <span>{currentPage} / {totalPages}ページ</span>
          {currentPage < totalPages ? <Link href={`/jobs?page=${currentPage + 1}`} rel="next">次へ</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
