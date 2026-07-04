import { CompanyJobCreator } from "../../../../features/job-postings/company-job-creator";
import styles from "../../../../features/intern-search/intern-search.module.css";
export default function NewJobPage() { return <main className={styles.shell}><div className={styles.content}><h1>募集を作成</h1><CompanyJobCreator /></div></main>; }
