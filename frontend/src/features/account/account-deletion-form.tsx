"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiErrorResponse } from "../auth/auth-types";
import styles from "../auth/auth-form.module.css";
import { deleteAccount } from "./account-api";

export function AccountDeletionForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !password || !confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await deleteAccount(password);
      router.push("/?account_deleted=1");
    } catch (reason) {
      const response = reason as ApiErrorResponse;
      setError(response.errors?.[0]?.message ?? "通信に失敗しました。時間をおいてもう一度お試しください");
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.notice}>
        <p>削除後はログインできず、元に戻せません</p>
        <p>送信済みメッセージと応募履歴は相手側に残ります</p>
        <p>企業の公開募集はすべて非公開になります</p>
      </div>

      <label className={styles.field}>
        現在のパスワード
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? "account-deletion-error" : undefined}
          required
        />
      </label>
      {error ? <p id="account-deletion-error" className={styles.error} role="alert">{error}</p> : null}

      <label>
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{" "}
        上記を理解しました
      </label>

      <button
        className={styles.primary}
        type="submit"
        disabled={!password || !confirmed || submitting}
        aria-busy={submitting}
      >
        アカウントを削除
      </button>
    </form>
  );
}
