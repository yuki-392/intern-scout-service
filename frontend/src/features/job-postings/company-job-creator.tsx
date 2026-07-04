"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "../auth/auth-api";
import type { CurrentUser } from "../auth/auth-types";
import { JobPostingForm } from "./job-posting-form";

export function CompanyJobCreator() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then((result) => { if (active) setUser(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  function retry() {
    setFailed(false);
    void getCurrentUser().then(setUser).catch(() => setFailed(true));
  }

  if (failed) return <button onClick={retry}>企業情報を再読み込み</button>;
  if (!user) return <p role="status">企業情報を読み込んでいます…</p>;
  return <JobPostingForm posting={null} companyProfile={user.company ?? undefined} />;
}
