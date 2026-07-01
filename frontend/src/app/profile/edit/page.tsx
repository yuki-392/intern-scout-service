import styles from "../../../features/auth/auth-form.module.css";
import { InternProfileForm } from "../../../features/intern-profile/intern-profile-form";

export default function EditProfilePage() {
  return <main className={styles.page}><section className={styles.card}><div className={styles.heading}><h1>プロフィール編集</h1><p className={styles.muted}>企業へ伝えたい経験や希望を入力してください。</p></div><InternProfileForm /></section></main>;
}
