"use client";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startScout } from "./conversation-api";
import styles from "./conversations.module.css";

export function ScoutForm({ internProfileId }: { internProfileId: number }) {
  const router = useRouter(); const [body, setBody] = useState(""); const [error, setError] = useState(""); const [sending, setSending] = useState(false); const busy = useRef(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (busy.current) return; busy.current = true; setSending(true); setError(""); try { const result = await startScout(internProfileId, body); router.push(`/conversations/${result.conversation_id}`); } catch (reason) { setError(reason && typeof reason === "object" && "errors" in reason ? (reason as { errors: { message: string }[] }).errors[0]?.message : "通信に失敗しました"); } finally { busy.current = false; setSending(false); } }
  return <form className={styles.form} onSubmit={submit}><label>スカウトメッセージ<textarea maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} /></label><span>{body.length.toLocaleString()} / 2,000文字</span>{error && <p className={styles.error}>{error}</p>}<button className={styles.button} disabled={sending}>スカウトを送る</button></form>;
}
