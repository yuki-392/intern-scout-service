"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { prefetchCsrfToken } from "../auth/auth-api";
import type { ApiError } from "../auth/auth-types";
import styles from "../auth/auth-form.module.css";
import { getInternProfile, saveInternProfile } from "./intern-profile-api";

const grades = ["1年", "2年", "3年", "4年", "5年", "修士1年", "修士2年", "博士課程", "その他"];
const empty = { display_name: "", school_name: "", grade: "", bio: "", desired_role: "", technical_stacks: [] as string[] };

export function InternProfileForm({ demoMode = false }: { demoMode?: boolean }) {
  const [values, setValues] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [stackInput, setStackInput] = useState("");
  const [stackError, setStackError] = useState("");
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true); setLoadFailed(false);
    try {
      const profile = await getInternProfile();
      if (profile) setValues({ ...profile, desired_role: profile.desired_role ?? "" });
    } catch { setLoadFailed(true); } finally { setLoading(false); }
  }

  useEffect(() => {
    void getInternProfile()
      .then((profile) => { if (profile) setValues({ ...profile, desired_role: profile.desired_role ?? "" }); })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
    void prefetchCsrfToken().catch(() => undefined);
  }, []);
  useEffect(() => { if (errors.length) summaryRef.current?.focus(); }, [errors]);

  function change(field: keyof typeof empty, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function addStack() {
    const name = stackInput.trim();
    const normalized = name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
    if (values.technical_stacks.some((item) => item.normalize("NFKC").toLowerCase().replace(/\s+/g, " ") === normalized)) {
      setStackError("同じ技術スタックは追加できません"); return;
    }
    if (!name || values.technical_stacks.length >= 20) return;
    setValues((current) => ({ ...current, technical_stacks: [...current.technical_stacks, name] }));
    setStackInput(""); setStackError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setErrors([]); setMessage("");
    try {
      const profile = await saveInternProfile(values);
      setValues({ ...profile, desired_role: profile.desired_role ?? "" });
      setMessage("プロフィールを保存しました");
    } catch (error) {
      if (error && typeof error === "object" && "errors" in error && Array.isArray(error.errors)) setErrors(error.errors);
      else setMessage("通信に失敗しました。もう一度お試しください");
    } finally { savingRef.current = false; setSaving(false); }
  }

  if (loading) return <p>プロフィールを読み込んでいます</p>;
  if (loadFailed) return <button className={styles.primary} onClick={() => void load()}>再読み込み</button>;

  const fieldErrors = (field: string) => errors.filter((error) => error.field === field);
  return <form className={styles.form} onSubmit={submit} noValidate>
    {demoMode && <p className={styles.notice}>公開デモです。実在する氏名・学校名・経歴などの個人情報は入力しないでください。</p>}
    {errors.length > 0 && <div className={styles.summary} role="alert" tabIndex={-1} ref={summaryRef}>入力内容を確認してください<ul>{errors.map((error, i) => <li key={i}>{error.message}</li>)}</ul></div>}
    {message && <p className={message.startsWith("通信") ? styles.summary : styles.notice}>{message}</p>}
    <TextField label="表示名" value={values.display_name} maxLength={50} errors={fieldErrors("display_name")} onChange={(v) => change("display_name", v)} />
    <TextField label="学校名" value={values.school_name} maxLength={100} errors={fieldErrors("school_name")} onChange={(v) => change("school_name", v)} />
    <label className={styles.field}>学年<select value={values.grade} onChange={(e) => change("grade", e.target.value)}><option value="">選択してください</option>{grades.map((grade) => <option key={grade}>{grade}</option>)}</select>{fieldErrors("grade").map((e, i) => <span className={styles.error} key={i}>{e.message}</span>)}</label>
    <div className={styles.field}><label htmlFor="intern-profile-bio">経験・制作物</label><span className={styles.muted} id="intern-profile-bio-help">これまで取り組んだ開発や制作物、担当した役割を記載してください</span><textarea id="intern-profile-bio" aria-describedby="intern-profile-bio-help" maxLength={1000} value={values.bio} onChange={(e) => change("bio", e.target.value)} /><span>{values.bio.length.toLocaleString()} / 1,000文字</span>{fieldErrors("bio").map((e, i) => <span className={styles.error} key={i}>{e.message}</span>)}</div>
    <TextField label="希望職種" value={values.desired_role} maxLength={100} errors={fieldErrors("desired_role")} onChange={(v) => change("desired_role", v)} />
    <div className={styles.fields}><label className={styles.field}>技術スタックを追加<input value={stackInput} maxLength={50} onChange={(e) => setStackInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStack(); } }} /></label><button className={styles.secondary} type="button" disabled={values.technical_stacks.length >= 20} onClick={addStack}>追加</button><span>{values.technical_stacks.length} / 20件</span>{stackError && <span className={styles.error}>{stackError}</span>}<ul>{values.technical_stacks.map((stack) => <li key={stack}>{stack}<button type="button" aria-label={`${stack}を削除`} onClick={() => setValues((current) => ({ ...current, technical_stacks: current.technical_stacks.filter((item) => item !== stack) }))}>×</button></li>)}</ul></div>
    <button className={styles.primary} disabled={saving} type="submit">{saving ? "保存中…" : "プロフィールを保存"}</button>
  </form>;
}

function TextField({ label, value, maxLength, errors, onChange }: { label: string; value: string; maxLength: number; errors: ApiError[]; onChange: (value: string) => void }) {
  return <label className={styles.field}>{label}<input value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />{errors.map((error, i) => <span className={styles.error} key={i}>{error.message}</span>)}</label>;
}
