import styles from "../../../features/auth/auth-form.module.css";
import { AccountDeletionForm } from "../../../features/account/account-deletion-form";

export default function AccountSettingsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.heading}>
          <h1>アカウント削除</h1>
          <p className={styles.muted}>削除による影響を確認し、現在のパスワードを入力してください。</p>
        </div>
        <AccountDeletionForm />
      </section>
    </main>
  );
}
