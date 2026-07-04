"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentUser, logoutUser } from "../auth/auth-api";
import { SESSION_EXPIRED_EVENT, sessionExpiredLoginPath } from "../auth/session-expiration";
import type { CurrentUser } from "../auth/auth-types";
import styles from "./app-navigation.module.css";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublic) return;

    const redirect = () => router.replace(sessionExpiredLoginPath(pathname));
    window.addEventListener(SESSION_EXPIRED_EVENT, redirect);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, redirect);
    };
  }, [isPublic, pathname, router]);

  useEffect(() => {
    if (isPublic) return;

    let active = true;
    void getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((reason: unknown) => {
        if (active && hasStatus(reason, 401)) {
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
      });

    return () => {
      active = false;
    };
  }, [isPublic]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");
    try {
      await logoutUser();
      setMenuOpen(false);
      router.replace("/login");
    } catch {
      setError("ログアウトに失敗しました。もう一度お試しください");
    } finally {
      setLoggingOut(false);
    }
  }

  if (isPublic || !user) return null;

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.desktopNav} aria-label="デスクトップナビゲーション">
          <BrandLink role={user.role} />
          <div className={styles.links}>
            {user.role === "intern" ? (
              <>
                <NavLink href="/jobs" pathname={pathname}>募集</NavLink>
                <NavLink href="/profile/edit" pathname={pathname}>プロフィール</NavLink>
              </>
            ) : (
              <>
                <NavLink href="/interns" pathname={pathname}>インターン生を探す</NavLink>
                <NavLink href="/company/jobs" pathname={pathname}>自社募集</NavLink>
              </>
            )}
            <NavLink href="/conversations" pathname={pathname}>会話</NavLink>
            <NavLink href="/settings/account" pathname={pathname}>アカウント設定</NavLink>
            <LogoutButton className={styles.logout} loggingOut={loggingOut} onClick={handleLogout} />
          </div>
        </nav>

        <div className={styles.mobileHeader}>
          <BrandLink role={user.role} />
          <button
            className={styles.menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="account-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "メニューを閉じる" : "メニューを開く"}
          </button>
          {menuOpen ? (
            <div id="account-menu" className={styles.menu} role="menu" aria-label="アカウントメニュー">
              <Link className={styles.menuItem} href="/settings/account" role="menuitem" onClick={() => setMenuOpen(false)}>
                アカウント設定
              </Link>
              <LogoutButton className={styles.menuItem} loggingOut={loggingOut} onClick={handleLogout} menuItem />
            </div>
          ) : null}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </header>

      <nav className={styles.mobileBottom} aria-label="モバイルナビゲーション">
        {user.role === "intern" ? (
          <>
            <NavLink href="/jobs" pathname={pathname}>募集</NavLink>
            <NavLink href="/conversations" pathname={pathname}>会話</NavLink>
            <NavLink href="/profile/edit" pathname={pathname}>プロフィール</NavLink>
          </>
        ) : (
          <>
            <NavLink href="/interns" pathname={pathname}>学生検索</NavLink>
            <NavLink href="/conversations" pathname={pathname}>会話</NavLink>
            <NavLink href="/company/jobs" pathname={pathname}>自社募集</NavLink>
          </>
        )}
      </nav>
      <div className={styles.mobileSpacer} aria-hidden="true" />
    </>
  );
}

function BrandLink({ role }: { role: CurrentUser["role"] }) {
  return <Link className={styles.brand} href={role === "intern" ? "/jobs" : "/interns"}>Intern Scout</Link>;
}

function LogoutButton({ className, loggingOut, onClick, menuItem = false }: { className: string; loggingOut: boolean; onClick: () => void; menuItem?: boolean }) {
  return (
    <button className={className} type="button" role={menuItem ? "menuitem" : undefined} onClick={onClick} disabled={loggingOut}>
      {loggingOut ? "ログアウト中…" : "ログアウト"}
    </button>
  );
}

function NavLink({ href, pathname, children }: { href: string; pathname: string; children: React.ReactNode }) {
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return <Link className={styles.link} href={href} aria-current={current ? "page" : undefined}>{children}</Link>;
}

function hasStatus(value: unknown, status: number): boolean {
  return Boolean(value && typeof value === "object" && "status" in value && value.status === status);
}
