import { CompanyJobList } from "../../../features/job-postings/company-job-list";
import styles from "../../../features/intern-search/intern-search.module.css";
export default function CompanyJobsPage() { return <main className={styles.shell}><div className={styles.content}><h1>自社募集</h1><CompanyJobList /></div></main>; }
