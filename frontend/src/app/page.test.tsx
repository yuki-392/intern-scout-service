import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("サービスの価値と主要な認証導線を表示する", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "挑戦したい学生と、未来をつくる企業をつなぐ",
      }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "インターン生として登録" })
        .getAttribute("href"),
    ).toBe("/signup?role=intern");
    expect(
      screen
        .getByRole("link", { name: "企業担当者として登録" })
        .getAttribute("href"),
    ).toBe("/signup?role=company");
    expect(
      screen.getByRole("link", { name: "ログイン" }).getAttribute("href"),
    ).toBe("/login");
  });

  it("アカウント削除後に完了メッセージを表示する", async () => {
    render(await Home({ searchParams: Promise.resolve({ account_deleted: "1" }) }));

    expect(screen.getByRole("status").textContent).toContain("アカウントを削除しました");
  });
});
