import Link from "next/link";

import styles from "./page.module.css";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ account_deleted?: string }>;
}) {
  const accountDeleted = (await searchParams).account_deleted === "1";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>Intern Scout</p>
        {accountDeleted ? (
          <p className={styles.notice} role="status">
            アカウントを削除しました
          </p>
        ) : null}
        <section className={styles.hero} aria-labelledby="hero-title">
          <h1 id="hero-title">
            挑戦したい学生と、未来をつくる企業をつなぐ
          </h1>
          <p>
            プロフィールと募集をきっかけに、お互いを知り、直接話せる
            インターンスカウトサービスです。
          </p>
        </section>

        <div className={styles.actions} aria-label="アカウント登録">
          <Link className={styles.primary} href="/signup?role=intern">
            インターン生として登録
          </Link>
          <Link className={styles.secondary} href="/signup?role=company">
            企業担当者として登録
          </Link>
        </div>

        <p className={styles.login}>
          アカウントをお持ちの方は<Link href="/login">ログイン</Link>
        </p>
      </div>
    </main>
  );
}
