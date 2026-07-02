import { LoginForm } from "../../features/auth/login-form";
import { AuthPageGuard } from "../../features/auth/auth-page-guard";
import styles from "../../features/auth/auth-form.module.css";
import { resolveSupportContact } from "../../features/auth/support-contact";

type Props = {
  searchParams: Promise<{
    reason?: string | string[];
    return_to?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : null;
  const returnTo =
    typeof params.return_to === "string" ? params.return_to : null;
  const supportContact = resolveSupportContact(
    process.env.SUPPORT_CONTACT_URL,
    process.env.SUPPORT_CONTACT_LABEL,
  );

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.heading}>
          <h1 id="login-title">ログイン</h1>
          <p className={styles.muted}>登録したメールアドレスでログインします。</p>
        </div>
        <AuthPageGuard returnTo={returnTo}>
          <LoginForm
            reason={reason}
            returnTo={returnTo}
            supportContact={supportContact}
          />
        </AuthPageGuard>
      </section>
    </main>
  );
}
