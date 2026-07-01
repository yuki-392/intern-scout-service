"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getConversation, sendMessage } from "./conversation-api";
import type { ConversationDetailData } from "./conversation-types";
import styles from "./conversations.module.css";

export function ConversationDetail({ id, page }: { id: number; page: number }) {
  const [detail, setDetail] = useState<ConversationDetailData | null>(null); const [body, setBody] = useState(""); const [error, setError] = useState(""); const [sending, setSending] = useState(false); const busy = useRef(false);
  useEffect(() => { void getConversation(id, page).then(setDetail).catch(() => setError("会話を読み込めませんでした")); }, [id, page]);
  async function submit(event: FormEvent) { event.preventDefault(); if (busy.current || !detail) return; busy.current = true; setSending(true); try { const message = await sendMessage(id, body); setDetail({ ...detail, messages: [...detail.messages, message] }); setBody(""); setError(""); } catch (reason) { setError(reason && typeof reason === "object" && "errors" in reason ? (reason as { errors: { message: string }[] }).errors[0]?.message : "通信に失敗しました"); } finally { busy.current = false; setSending(false); } }
  if (!detail) return <p>{error || "会話を読み込んでいます"}</p>;
  return <section className={styles.panel}><h1>{detail.counterpart_name}</h1><div>{detail.messages.map((message) => <article className={styles.message} data-testid="message" key={message.id}><strong>{message.sender_name}</strong><span>{message.body}</span></article>)}</div>{detail.can_send ? <form className={styles.form} onSubmit={submit}><label>返信メッセージ<textarea maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} /></label><span>{body.length.toLocaleString()} / 2,000文字</span>{error && <p className={styles.error}>{error}</p>}<button className={styles.button} disabled={sending}>送信</button></form> : <p>この相手には新しいメッセージを送信できません</p>}</section>;
}
