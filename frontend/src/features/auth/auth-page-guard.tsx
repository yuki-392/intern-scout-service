"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentUser } from "./auth-api";
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

  if (!checked) return <p role="status">ログイン状態を確認しています…</p>;
  return children;
}
