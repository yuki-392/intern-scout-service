import { ConversationDetail } from "../../../features/conversations/conversation-detail";
import styles from "../../../features/intern-search/intern-search.module.css";

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const id = Number((await params).id); const page = Number.parseInt((await searchParams).page ?? "1", 10);
  return <main className={styles.shell}><div className={styles.content}><ConversationDetail id={id} page={page > 0 ? page : 1} /></div></main>;
}
