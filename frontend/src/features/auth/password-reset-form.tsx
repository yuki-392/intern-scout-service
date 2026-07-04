"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  prefetchCsrfToken,
  requestPasswordReset,
  resetPassword,
} from "./auth-api";
import type { ApiErrorResponse } from "./auth-types";
import styles from "./auth-form.module.css";

const SENT_MESSAGE = "該当するアカウントがある場合、再設定メールを送信しました";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void prefetchCsrfToken().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setMessage(SENT_MESSAGE);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {message && <p className={styles.notice} role="status">{message}</p>}
      <label className={styles.field}>
        メールアドレス
        <input
          autoComplete="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <button className={styles.primary} type="submit" disabled={submitting}>
        {submitting ? "送信中…" : "再設定メールを送信"}
      </button>
      <Link href="/login">ログインへ戻る</Link>
    </form>
  );
}

export function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void prefetchCsrfToken().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const resetToken = token || new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
      await resetPassword(resetToken, password, confirmation);
      setCompleted(true);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <div className={styles.form}>
        <p className={styles.notice} role="status">パスワードを変更しました</p>
        <Link href="/login">ログインへ</Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {message && <div className={styles.summary} role="alert">{message}</div>}
      <label className={styles.field}>
        新しいパスワード
        <input
          autoComplete="new-password"
          minLength={8}
          name="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className={styles.field}>
        新しいパスワード（確認）
        <input
          autoComplete="new-password"
          minLength={8}
          name="password_confirmation"
          type="password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <button className={styles.primary} type="submit" disabled={submitting}>
        {submitting ? "変更中…" : "パスワードを変更"}
      </button>
    </form>
  );
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "errors" in error) {
    return (error as ApiErrorResponse).errors[0]?.message ?? "処理に失敗しました";
  }
  return "通信に失敗しました。時間をおいてもう一度お試しください";
}
