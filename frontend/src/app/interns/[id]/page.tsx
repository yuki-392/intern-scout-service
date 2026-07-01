import { InternDetail } from "../../../features/intern-search/intern-detail";
import styles from "../../../features/intern-search/intern-search.module.css";

export default async function InternPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ return_to?: string | string[] }> }) {
  const { id } = await params;
  const query = await searchParams;
  return <main className={styles.shell}><div className={styles.content}><InternDetail id={Number(id)} returnTo={typeof query.return_to === "string" ? query.return_to : null} /></div></main>;
}
