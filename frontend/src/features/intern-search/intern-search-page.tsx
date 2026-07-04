"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInterns } from "./intern-api";
import type { InternListResponse, InternQuery } from "./intern-types";
import styles from "./intern-search.module.css";

export function InternSearchPage({ initialQuery }: { initialQuery: InternQuery }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<InternListResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try { setResult(await getInterns(initialQuery)); } catch { setFailed(true); }
  }, [initialQuery]);
  useEffect(() => { void getInterns(initialQuery).then(setResult).catch(() => setFailed(true)); }, [initialQuery]);

  function navigate(next: InternQuery) { router.push(`/interns?${queryString(next)}`); }
  function submit(event: FormEvent) { event.preventDefault(); navigate({ ...query, page: 1 }); }
  const currentPath = `/interns?${queryString(initialQuery)}`;

  return <div className={styles.content}>
    <h1>インターン生を探す</h1>
    <form className={styles.search} onSubmit={submit}>
      {(["school_name", "desired_role", "technical_stack"] as const).map((field) => <label className={styles.field} key={field}>{field === "school_name" ? "学校名" : field === "desired_role" ? "希望職種" : "技術スタック"}<input value={query[field]} onChange={(e) => setQuery((value) => ({ ...value, [field]: e.target.value }))} /></label>)}
      <div className={styles.actions}><button className={styles.button}>検索</button><button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => router.push("/interns")}>条件をクリア</button></div>
    </form>
    {!result && !failed && <p>候補者を読み込んでいます</p>}
    {failed && <div><p>候補者を読み込めませんでした</p><button className={styles.button} onClick={() => void load()}>再読み込み</button></div>}
    {result?.data.length === 0 && <p>条件に一致するインターン生はいません</p>}
    {result && result.data.length > 0 && <ul className={styles.list}>{result.data.map((intern) => <li className={styles.card} key={intern.id}><h2>{intern.display_name}</h2><p>{intern.school_name}・{intern.grade}</p><section><h3>経験・制作物</h3><p>{intern.bio_excerpt}</p></section><ul className={styles.stacks}>{intern.technical_stacks.map((stack) => <li key={stack}>{stack}</li>)}</ul><Link href={`/interns/${intern.id}?return_to=${encodeURIComponent(currentPath)}`}>{intern.display_name}の詳細を見る</Link></li>)}</ul>}
    {result && result.meta.total_pages > 0 && <nav className={styles.pagination} aria-label="ページ移動"><button disabled={result.meta.current_page <= 1} onClick={() => navigate({ ...initialQuery, page: result.meta.current_page - 1 })}>前のページ</button><span>{result.meta.current_page} / {result.meta.total_pages}ページ</span><button aria-label="次のページ" disabled={result.meta.current_page >= result.meta.total_pages} onClick={() => navigate({ ...initialQuery, page: result.meta.current_page + 1 })}>次のページ</button></nav>}
  </div>;
}

function queryString(query: InternQuery) {
  const params = new URLSearchParams();
  if (query.school_name) params.set("school_name", query.school_name);
  if (query.desired_role) params.set("desired_role", query.desired_role);
  if (query.technical_stack) params.set("technical_stack", query.technical_stack);
  params.set("page", String(query.page));
  return params.toString();
}
