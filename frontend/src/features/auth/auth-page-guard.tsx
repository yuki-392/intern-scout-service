"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentUser } from "./auth-api";
import styles from "./auth-form.module.css";
import { safeReturnTo } from "./safe-return-to";

export function AuthPageGuard({
  children,
  returnTo,
}: {
  children?: React.ReactNode;
  returnTo: string | null;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then((user) => {
        if (active) {
          router.replace(safeReturnTo(returnTo, user.role, window.location.origin));
        }
      })
      .catch(() => {
        if (active) setChecked(true);
      });

    return () => {
      active = false;
    };
  }, [returnTo, router]);

  if (!checked) {
    return (
      <div className={styles.loadingState} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.spinner} aria-hidden="true" />
        <p>ログイン状態を確認しています…</p>
        <p className={styles.loadingHint}>確認が終わるとログイン画面を表示します</p>
      </div>
    );
  }
  return children;
}
