import { PasswordResetForm } from "../../features/auth/password-reset-form";
import styles from "../../features/auth/auth-form.module.css";

export default function ResetPasswordPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="reset-password-title">
        <div className={styles.heading}>
          <h1 id="reset-password-title">新しいパスワード</h1>
          <p className={styles.muted}>8文字以上の新しいパスワードを設定してください。</p>
        </div>
        <PasswordResetForm token="" />
      </section>
    </main>
  );
}
