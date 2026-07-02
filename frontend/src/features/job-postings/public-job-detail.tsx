"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { applyToJobPosting, getPublicJobPosting } from "./job-posting-api";
import type { JobPosting } from "./job-posting-types";
import styles from "./job-postings.module.css";

type DetailState = "loading" | "ready" | "confirm" | "applied" | "success" | "not-found" | "error";

export function PublicJobDetail({ id }: { id: number }) {
  const [job, setJob] = useState<JobPosting | null>(null);
  const [state, setState] = useState<DetailState>("loading");
  const [conversation, setConversation] = useState<number | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void getPublicJobPosting(id)
      .then((result) => {
        if (!active) return;
        setJob(result);
        setState(result.applied ? "applied" : "ready");
      })
      .catch((error: { status?: number }) => {
        if (active) setState(error?.status === 404 ? "not-found" : "error");
      });

    return () => { active = false; };
  }, [id, loadAttempt]);

  if (state === "not-found") return <p>募集が見つかりません</p>;

  if (state === "error") {
    const retry = () => {
      setJob(null);
      setState("loading");
      setLoadAttempt((attempt) => attempt + 1);
    };

    return (
      <section className={`${styles.panel} ${styles.errorPanel}`} role="alert">
        <h1>募集情報を読み込めませんでした</h1>
        <p>通信が一時的に不安定な可能性があります。</p>
        <p>通信状況を確認して、もう一度お試しください。</p>
        <button className={styles.button} onClick={retry}>
          再読み込み
        </button>
      </section>
    );
  }

  if (!job) {
    return (
      <section className={`${styles.panel} ${styles.loadingPanel}`} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.spinner} aria-hidden="true" />
        <p>募集を読み込んでいます…</p>
        <div className={styles.skeleton} aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>
    );
  }

  async function apply() {
    const result = await applyToJobPosting(id);
    setConversation(result.conversation_id);
    setState("success");
  }

  return (
    <article className={styles.panel}>
      <h1>{job.title}</h1><p>{job.company_name}</p><p>{job.description}</p><p>{job.work_conditions}</p>
      {state === "ready" && <button className={styles.button} onClick={() => setState("confirm")}>応募する</button>}
      {state === "confirm" && <div><p>募集『{job.title}』に応募しました。プロフィールをご確認ください。が企業へ送信されます</p><button className={styles.button} onClick={() => void apply()}>応募を確定</button></div>}
      {state === "applied" && <p>応募済み</p>}
      {state === "success" && <p>応募しました</p>}
      {conversation && <Link href={`/conversations/${conversation}`}>会話を開く</Link>}
    </article>
  );
}
