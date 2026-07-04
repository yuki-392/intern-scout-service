import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppNavigation } from "./app-navigation";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logoutUser: vi.fn(),
  pathname: "/jobs",
  replace: vi.fn(),
}));

vi.mock("../auth/auth-api", () => ({
  getCurrentUser: mocks.getCurrentUser,
  logoutUser: mocks.logoutUser,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

describe("AppNavigation", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/jobs";
  });

  it("shows intern navigation and logs out", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, email: "intern@example.com", role: "intern", company: null });
    mocks.logoutUser.mockResolvedValue(undefined);
    render(<AppNavigation />);

    const desktop = await screen.findByRole("navigation", { name: "デスクトップナビゲーション" });
    expect(within(desktop).getByRole("link", { name: "募集" })).toBeDefined();
    expect(within(desktop).getByRole("link", { name: "会話" }).getAttribute("href")).toBe("/conversations");
    expect(within(desktop).getByRole("link", { name: "プロフィール" }).getAttribute("href")).toBe("/profile/edit");
    expect(within(desktop).getByRole("link", { name: "アカウント設定" }).getAttribute("href")).toBe("/settings/account");

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await waitFor(() => expect(mocks.logoutUser).toHaveBeenCalledTimes(1));
    expect(mocks.replace).toHaveBeenCalledWith("/login");
    expect(screen.getByRole("button", { name: "ログアウト" }).hasAttribute("disabled")).toBe(false);
  });

  it("shows company navigation", async () => {
    mocks.pathname = "/interns";
    mocks.getCurrentUser.mockResolvedValue({ id: 2, email: "company@example.com", role: "company", company: { id: 1, name: "会社" } });
    render(<AppNavigation />);

    const desktop = await screen.findByRole("navigation", { name: "デスクトップナビゲーション" });
    expect(within(desktop).getByRole("link", { name: "インターン生を探す" })).toBeDefined();
    expect(within(desktop).getByRole("link", { name: "自社募集" }).getAttribute("href")).toBe("/company/jobs");
    expect(within(desktop).queryByRole("link", { name: "プロフィール" })).toBeNull();
  });

  it("separates primary mobile navigation from settings and logout", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, email: "intern@example.com", role: "intern", company: null });
    render(<AppNavigation />);

    const mobile = await screen.findByRole("navigation", { name: "モバイルナビゲーション" });
    expect(within(mobile).getByRole("link", { name: "募集" })).toBeDefined();
    expect(within(mobile).getByRole("link", { name: "会話" })).toBeDefined();
    expect(within(mobile).getByRole("link", { name: "プロフィール" })).toBeDefined();
    expect(within(mobile).queryByRole("link", { name: "アカウント設定" })).toBeNull();

    const menuButton = screen.getByRole("button", { name: "メニューを開く" });
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(menuButton);
    expect(screen.getByRole("button", { name: "メニューを閉じる" }).getAttribute("aria-expanded")).toBe("true");
    const menu = screen.getByRole("menu", { name: "アカウントメニュー" });
    expect(within(menu).getByRole("menuitem", { name: "アカウント設定" })).toBeDefined();
    expect(within(menu).getByRole("menuitem", { name: "ログアウト" })).toBeDefined();
  });

  it("redirects an expired session and preserves the current path", async () => {
    mocks.pathname = "/conversations/12";
    mocks.getCurrentUser.mockRejectedValue({ status: 401 });
    render(<AppNavigation />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(
      "/login?reason=session_expired&return_to=%2Fconversations%2F12",
    ));
  });

  it("does not request a session on public authentication pages", () => {
    mocks.pathname = "/login";
    const { container } = render(<AppNavigation />);
    expect(container.innerHTML).toBe("");
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it.each(["/forgot-password", "/reset-password"])(
    "does not treat the public password reset page %s as an expired session",
    (pathname) => {
      mocks.pathname = pathname;
      const { container } = render(<AppNavigation />);

      expect(container.innerHTML).toBe("");
      expect(mocks.getCurrentUser).not.toHaveBeenCalled();
      expect(mocks.replace).not.toHaveBeenCalled();
    },
  );
});
