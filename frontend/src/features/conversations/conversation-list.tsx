"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "../auth/auth-api";
import type { UserRole } from "../auth/auth-types";
import { getConversations } from "./conversation-api";
import type { ConversationSummary, Meta } from "./conversation-types";
import styles from "./conversations.module.css";

export function ConversationList({ page }: { page: number }) {
  const [data, setData] = useState<ConversationSummary[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [result, user] = await Promise.all([getConversations(page), getCurrentUser()]);
      setData(result.data);
      setMeta(result.meta);
      setRole(user.role);
    } catch {
      setFailed(true);
    }
  }, [page]);

  useEffect(() => {
    void Promise.all([getConversations(page), getCurrentUser()])
      .then(([result, user]) => {
        setData(result.data);
        setMeta(result.meta);
        setRole(user.role);
      })
      .catch(() => setFailed(true));
  }, [page]);

  const retry = () => {
    setFailed(false);
    void load();
  };

  if ((!data || !role) && !failed) return <p>会話を読み込んでいます</p>;
  if (failed) return <button onClick={retry}>再読み込み</button>;
  if (!data?.length) {
    return (
      <section className={styles.emptyState}>
        <h2>会話はまだありません</h2>
        <p>スカウトまたは応募をきっかけに会話が始まります。</p>
        {role === "intern" ? (
          <Link className={styles.emptyCta} href="/profile/edit">プロフィールを充実させる</Link>
        ) : (
          <Link className={styles.emptyCta} href="/interns">インターン生を探す</Link>
        )}
      </section>
    );
  }
  return <div><ul className={styles.list}>{data.map((item) => <li className={styles.panel} key={item.id}><h2>{item.counterpart_name}</h2><p>{item.latest_sender_name}: <span>{item.latest_message_excerpt}</span></p><Link href={`/conversations/${item.id}`}>{item.counterpart_name}との会話を開く</Link></li>)}</ul>{meta && <p>{meta.current_page} / {meta.total_pages}ページ</p>}</div>;
}
