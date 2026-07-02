import { CompanyJobList } from "../../../features/job-postings/company-job-list";
import styles from "../../../features/intern-search/intern-search.module.css";
export default async function CompanyJobsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) { const created = (await searchParams).created ?? "initial"; return <main className={styles.shell}><div className={styles.content}><h1>自社募集</h1>{created !== "initial" ? <p role="status">募集を作成しました</p> : null}<CompanyJobList refreshKey={created} /></div></main>; }
