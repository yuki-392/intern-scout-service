import { PublicJobDetail } from "../../../features/job-postings/public-job-detail";
import styles from "../../../features/intern-search/intern-search.module.css";
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) { return <main className={styles.shell}><div className={styles.content}><PublicJobDetail id={Number((await params).id)} /></div></main>; }
