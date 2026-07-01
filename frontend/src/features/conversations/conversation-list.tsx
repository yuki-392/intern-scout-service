"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getConversations } from "./conversation-api";
import type { ConversationSummary, Meta } from "./conversation-types";
import styles from "./conversations.module.css";

export function ConversationList({ page }: { page: number }) {
  const [data, setData] = useState<ConversationSummary[] | null>(null); const [meta, setMeta] = useState<Meta | null>(null); const [failed, setFailed] = useState(false);
  const load = useCallback(async () => { setFailed(false); try { const result = await getConversations(page); setData(result.data); setMeta(result.meta); } catch { setFailed(true); } }, [page]);
  useEffect(() => { void getConversations(page).then((result) => { setData(result.data); setMeta(result.meta); }).catch(() => setFailed(true)); }, [page]);
  if (!data && !failed) return <p>会話を読み込んでいます</p>; if (failed) return <button onClick={() => void load()}>再読み込み</button>; if (!data?.length) return <p>会話はまだありません</p>;
  return <div><ul className={styles.list}>{data.map((item) => <li className={styles.panel} key={item.id}><h2>{item.counterpart_name}</h2><p>{item.latest_sender_name}: <span>{item.latest_message_excerpt}</span></p><Link href={`/conversations/${item.id}`}>{item.counterpart_name}との会話を開く</Link></li>)}</ul>{meta && <p>{meta.current_page} / {meta.total_pages}ページ</p>}</div>;
}
