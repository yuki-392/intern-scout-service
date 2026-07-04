import { PasswordResetRequestForm } from "../../features/auth/password-reset-form";
import styles from "../../features/auth/auth-form.module.css";

export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="forgot-password-title">
        <div className={styles.heading}>
          <h1 id="forgot-password-title">パスワード再設定</h1>
          <p className={styles.muted}>登録したメールアドレスへ再設定リンクを送ります。</p>
        </div>
        <PasswordResetRequestForm />
      </section>
    </main>
  );
}
