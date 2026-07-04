"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { applyToJobPosting, getPublicJobPosting } from "./job-posting-api";
import type { JobPosting } from "./job-posting-types";
import styles from "./job-postings.module.css";

type DetailState = "loading" | "ready" | "confirm" | "applying" | "applied" | "success" | "not-found" | "error";

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
    setState("applying");
    const result = await applyToJobPosting(id);
    setConversation(result.conversation_id);
    setState("success");
  }

  return (
    <article className={styles.panel}>
      <h1>{job.title}</h1><p>{job.company_name}</p><section><h2>募集内容</h2><p>{job.description}</p><p>{job.work_conditions}</p></section>{(job.company_description || job.company_website_url) ? <section className={styles.companyProfile}><h2>企業について</h2>{job.company_description ? <p>{job.company_description}</p> : null}{job.company_website_url ? <a href={job.company_website_url} target="_blank" rel="noreferrer">企業ホームページを見る</a> : null}</section> : null}
      {state === "ready" && <button className={styles.button} onClick={() => setState("confirm")}>応募する</button>}
      {(state === "confirm" || state === "applying") && (
        <div className={styles.dialogBackdrop}>
          <section className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="application-confirm-title">
            <h2 id="application-confirm-title">応募の確認</h2>
            <p>{job.title}に応募しますか？</p>
            <div className={styles.dialogActions}>
              <button className={styles.secondaryButton} disabled={state === "applying"} onClick={() => setState("ready")}>いいえ</button>
              <button className={styles.button} disabled={state === "applying"} onClick={() => void apply()}>{state === "applying" ? "応募中…" : "はい"}</button>
            </div>
          </section>
        </div>
      )}
      {state === "applied" && <button className={styles.appliedButton} disabled>応募済み</button>}
      {state === "success" && <p>応募しました</p>}
      {conversation && <Link href={`/conversations/${conversation}`}>会話を開く</Link>}
    </article>
  );
}
