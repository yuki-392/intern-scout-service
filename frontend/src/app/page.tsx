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
            学生の挑戦と、企業の未来をつなぐ
          </h1>
          <p>
            プロフィールと募集をきっかけに、お互いを知り、直接話せる
            インターンスカウトサービスです。
          </p>
        </section>

        <section className={styles.audiences} aria-labelledby="audience-title">
          <h2 id="audience-title" className={styles.audienceTitle}>利用方法を選んでください</h2>
          <div className={styles.actions}>
            <article className={styles.audienceCard}>
              <h2>学生の方</h2>
              <p>プロフィールを公開し、スカウトを受け取ったり募集へ応募できます。</p>
              <Link className={styles.cta} href="/signup?role=intern">
                インターン生として登録
              </Link>
            </article>
            <article className={styles.audienceCard}>
              <h2>採用担当者の方</h2>
              <p>技術スタックから学生を探し、スカウトや募集掲載を始められます。</p>
              <Link className={styles.cta} href="/signup?role=company">
                企業担当者として登録
              </Link>
            </article>
          </div>
        </section>

        <p className={styles.login}>
          アカウントをお持ちの方は<Link href="/login">ログイン</Link>
        </p>
      </div>
    </main>
  );
}
