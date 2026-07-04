"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getIntern } from "./intern-api";
import type { InternDetailData } from "./intern-types";
import styles from "./intern-search.module.css";
import { ScoutForm } from "../conversations/scout-form";

export function InternDetail({ id, returnTo }: { id: number; returnTo: string | null }) {
  const [intern, setIntern] = useState<InternDetailData | null>(null);
  const [state, setState] = useState<"loading" | "failed" | "not-found">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try { setIntern(await getIntern(id)); } catch (error) { setState(error && typeof error === "object" && "status" in error && error.status === 404 ? "not-found" : "failed"); }
  }, [id]);
  useEffect(() => { void getIntern(id).then(setIntern).catch((error) => setState(error?.status === 404 ? "not-found" : "failed")); }, [id]);
  const back = returnTo?.startsWith("/interns") && !returnTo.includes("\\") ? returnTo : "/interns";

  if (state === "loading" && !intern) return <p>プロフィールを読み込んでいます</p>;
  if (state === "not-found") return <div><p>プロフィールが見つかりません</p><Link href="/interns">一覧へ戻る</Link></div>;
  if (state === "failed") return <button onClick={() => void load()}>再読み込み</button>;
  if (!intern) return null;
  return <article className={styles.card}><h1>{intern.display_name}</h1><p>{intern.school_name}・{intern.grade}</p><section><h2>経験・制作物</h2><p>{intern.bio}</p></section>{intern.desired_role && <p>希望職種: {intern.desired_role}</p>}<ul className={styles.stacks}>{intern.technical_stacks.map((stack) => <li key={stack}>{stack}</li>)}</ul>{intern.conversation_id ? <section className={styles.existingConversation}><p>この学生とはすでにやり取りしています。</p><Link className={styles.button} href={`/conversations/${intern.conversation_id}`}>会話を見る</Link></section> : <ScoutForm internProfileId={intern.id} />}<Link href={back}>一覧へ戻る</Link></article>;
}
