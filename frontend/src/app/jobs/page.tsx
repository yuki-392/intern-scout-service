import { PublicJobList } from "../../features/job-postings/public-job-list";
import styles from "../../features/intern-search/intern-search.module.css";
export default async function JobsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) { const page = Number.parseInt((await searchParams).page ?? "1", 10); return <main className={styles.shell}><div className={styles.content}><h1>インターン募集</h1><PublicJobList page={page > 0 ? page : 1} /></div></main>; }
