"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser, prefetchCsrfToken } from "./auth-api";
import type { ApiErrorResponse } from "./auth-types";
import { safeReturnTo } from "./safe-return-to";
import type { SupportContact } from "./support-contact";
import styles from "./auth-form.module.css";

type Props = {
  reason: string | null;
  returnTo: string | null;
  supportContact: SupportContact | null;
};

export function LoginForm({ reason, returnTo, supportContact }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    void prefetchCsrfToken().catch(() => undefined);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const user = await loginUser({ email, password });
      const origin = window.location.origin;
      router.replace(safeReturnTo(returnTo, user.role, origin));
    } catch (error) {
      setMessage(toMessage(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {reason === "session_expired" && (
        <p className={styles.notice}>
          セッションの有効期限が切れました。もう一度ログインしてください
        </p>
      )}

      {message && (
        <div className={styles.summary} role="alert">
          {message}
        </div>
      )}

      <div className={styles.fields}>
        <label className={styles.field}>
          メールアドレス
          <input
            autoComplete="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          パスワード
          <input
            autoComplete="current-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>

      <button className={styles.primary} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "ログイン中…" : "ログイン"}
      </button>

      <div className={styles.links}>
        <p className={styles.signupPrompt}>
          初めての方は<Link href="/signup">新規登録</Link>
        </p>
        <details className={styles.recovery}>
          <summary>パスワードを忘れた方</summary>
          <p className={styles.help}>
            <Link href="/forgot-password">パスワードを再設定する</Link>
          </p>
          {supportContact ? (
            <p className={styles.help}>
              メールを受け取れない場合は
              <a href={supportContact.href}>
                {supportContact.label}へ問い合わせる
              </a>
            </p>
          ) : (
            <p className={styles.help}>
              メールが届かない場合は、入力したアドレスと迷惑メールフォルダをご確認ください
            </p>
          )}
        </details>
      </div>
    </form>
  );
}

function toMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as ApiErrorResponse).errors)
  ) {
    return (error as ApiErrorResponse).errors[0]?.message;
  }
  return "通信に失敗しました。時間をおいてもう一度お試しください";
}
