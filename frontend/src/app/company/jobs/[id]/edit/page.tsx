import { CompanyJobEditor } from "../../../../../features/job-postings/company-job-editor";
import styles from "../../../../../features/intern-search/intern-search.module.css";
export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) { return <main className={styles.shell}><div className={styles.content}><h1>募集を編集</h1><CompanyJobEditor id={Number((await params).id)} /></div></main>; }
