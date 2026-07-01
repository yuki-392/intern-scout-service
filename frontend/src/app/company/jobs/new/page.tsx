import { JobPostingForm } from "../../../../features/job-postings/job-posting-form";
import styles from "../../../../features/intern-search/intern-search.module.css";
export default function NewJobPage() { return <main className={styles.shell}><div className={styles.content}><h1>募集を作成</h1><JobPostingForm posting={null} /></div></main>; }
