import { SignupForm } from "../../features/auth/signup-form";
import { AuthPageGuard } from "../../features/auth/auth-page-guard";
import type { UserRole } from "../../features/auth/auth-types";
import styles from "../../features/auth/auth-form.module.css";

type Props = {
  searchParams: Promise<{ role?: string | string[] }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const { role: value } = await searchParams;
  const role: UserRole | null =
    value === "intern" || value === "company" ? value : null;

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="signup-title">
        <div className={styles.heading}>
          <h1 id="signup-title">アカウント登録</h1>
          <p className={styles.muted}>利用者種別を選び、必要事項を入力してください。</p>
        </div>
        <AuthPageGuard returnTo={null}>
          <SignupForm initialRole={role} demoMode={process.env.DEMO_MODE === "true"} />
        </AuthPageGuard>
      </section>
    </main>
  );
}
