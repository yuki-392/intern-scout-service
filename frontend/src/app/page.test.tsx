import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("サービスの価値と主要な認証導線を表示する", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "学生の挑戦と、企業の未来をつなぐ",
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

  it("学生と企業を同等の選択肢としてメリットとともに案内する", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { level: 2, name: "学生の方" })).toBeDefined();
    expect(screen.getByText("プロフィールを公開し、スカウトを受け取ったり募集へ応募できます。")).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "採用担当者の方" })).toBeDefined();
    expect(screen.getByText("技術スタックから学生を探し、スカウトや募集掲載を始められます。")).toBeDefined();

    const internLink = screen.getByRole("link", { name: "インターン生として登録" });
    const companyLink = screen.getByRole("link", { name: "企業担当者として登録" });
    expect(internLink.className).toBe(companyLink.className);
  });
});
