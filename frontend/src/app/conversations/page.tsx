import { ConversationList } from "../../features/conversations/conversation-list";
import styles from "../../features/intern-search/intern-search.module.css";

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number.parseInt((await searchParams).page ?? "1", 10);
  return <main className={styles.shell}><div className={styles.content}><h1>会話一覧</h1><ConversationList page={page > 0 ? page : 1} /></div></main>;
}
