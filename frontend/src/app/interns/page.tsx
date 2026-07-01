import { InternSearchPage } from "../../features/intern-search/intern-search-page";
import styles from "../../features/intern-search/intern-search.module.css";

export default async function InternsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const page = Number.parseInt(value("page"), 10);
  return <main className={styles.shell}><InternSearchPage initialQuery={{ school_name: value("school_name"), desired_role: value("desired_role"), technical_stack: value("technical_stack"), page: page > 0 ? page : 1 }} /></main>;
}
