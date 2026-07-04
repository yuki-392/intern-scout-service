"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { prefetchCsrfToken, registerUser } from "./auth-api";
import type { ApiError, ApiErrorResponse, UserRole } from "./auth-types";
import styles from "./auth-form.module.css";

type Props = {
  initialRole: UserRole | null;
  demoMode?: boolean;
};

export function SignupForm({ initialRole, demoMode = false }: Props) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role) void prefetchCsrfToken().catch(() => undefined);
  }, [role]);

  useEffect(() => {
    if (errors.length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  function chooseRole(nextRole: UserRole) {
    setRole(nextRole);
    setErrors([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrors([]);

    try {
      const user = await registerUser({
        role,
        email,
        password,
        password_confirmation: passwordConfirmation,
        ...(role === "company" ? { company_name: companyName } : {}),
      });
      router.replace(user.role === "intern" ? "/profile/edit" : "/interns");
    } catch (error) {
      setErrors(toErrors(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!role) {
    return (
      <div className={styles.choices}>
        <button
          className={styles.primary}
          type="button"
          onClick={() => chooseRole("intern")}
        >
          インターン生として登録
        </button>
        <button
          className={styles.secondary}
          type="button"
          onClick={() => chooseRole("company")}
        >
          企業担当者として登録
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {demoMode && (
        <p className={styles.notice}>
          公開デモです。実在する個人情報は入力せず、メールアドレスは.exampleで終わる架空のものを使用してください。
        </p>
      )}
      <p className={styles.muted}>
        {role === "intern" ? "インターン生" : "企業担当者"}として登録します
      </p>
      <button
        className={styles.textButton}
        type="button"
        onClick={() => setRole(null)}
      >
        利用者種別を変更
      </button>

      {errors.length > 0 && (
        <div
          className={styles.summary}
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
        >
          入力内容を確認してください
          <ul>
            {errors.map((error, index) => (
              <li key={`${error.field ?? error.code}-${index}`}>
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.fields}>
        {role === "company" && (
          <Field
            label="企業名"
            name="company_name"
            value={companyName}
            onChange={setCompanyName}
            errors={fieldErrors(errors, "company_name")}
          />
        )}
        <Field
          label="メールアドレス"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          errors={fieldErrors(errors, "email")}
        />
        <Field
          label="パスワード"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          errors={fieldErrors(errors, "password")}
        />
        <Field
          label="パスワード（確認）"
          name="password_confirmation"
          type="password"
          value={passwordConfirmation}
          onChange={setPasswordConfirmation}
          errors={fieldErrors(errors, "password_confirmation")}
        />
      </div>

      <button className={styles.primary} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "作成中…" : "アカウントを作成"}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  errors: ApiError[];
};

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  errors,
}: FieldProps) {
  const errorId = `${name}-errors`;
  return (
    <label className={styles.field}>
      {label}
      <input
        aria-describedby={errors.length > 0 ? errorId : undefined}
        aria-invalid={errors.length > 0}
        autoComplete={name === "email" ? "email" : "new-password"}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {errors.length > 0 && (
        <span className={styles.error} id={errorId}>
          {errors.map(({ message }) => message).join("、")}
        </span>
      )}
    </label>
  );
}

function fieldErrors(errors: ApiError[], field: string) {
  return errors.filter((error) => error.field === field);
}

function toErrors(error: unknown): ApiError[] {
  if (isApiErrorResponse(error)) return error.errors;
  return [
    {
      code: "request_failed",
      message: "通信に失敗しました。時間をおいてもう一度お試しください",
    },
  ];
}

function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return Boolean(
    error &&
      typeof error === "object" &&
      "errors" in error &&
      Array.isArray(error.errors),
  );
}
