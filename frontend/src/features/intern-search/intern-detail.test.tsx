import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InternDetail } from "./intern-detail";

vi.mock("../conversations/scout-form", () => ({
  ScoutForm: () => <div data-testid="scout-form" />,
}));

const mocks = vi.hoisted(() => ({ getIntern: vi.fn() }));
vi.mock("./intern-api", () => ({ getIntern: mocks.getIntern }));

describe("InternDetail", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows public profile fields and preserves the return path", async () => {
    mocks.getIntern.mockResolvedValue({ id: 7, display_name: "たかし", school_name: "Example大学", grade: "3年", bio: "Webアプリの画面実装を担当しました", desired_role: "Backend", technical_stacks: ["Ruby"], published_at: "2026-07-01T00:00:00Z", conversation_id: null });
    render(<InternDetail id={7} returnTo="/interns?school_name=東京&page=2" />);

    expect(await screen.findByRole("heading", { name: "たかし" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "経験・制作物" })).toBeDefined();
    expect(screen.getByText("Webアプリの画面実装を担当しました")).toBeDefined();
    expect(screen.getByText("Ruby")).toBeDefined();
    expect(screen.getByRole("link", { name: "一覧へ戻る" }).getAttribute("href")).toBe("/interns?school_name=東京&page=2");
  });

  it("links to the existing conversation instead of showing the scout form", async () => {
    mocks.getIntern.mockResolvedValue({ id: 7, display_name: "たかし", school_name: "Example大学", grade: "3年", bio: "自己紹介", desired_role: null, technical_stacks: [], published_at: "2026-07-01T00:00:00Z", conversation_id: 12 });
    render(<InternDetail id={7} returnTo={null} />);

    expect(await screen.findByText("この学生とはすでにやり取りしています。")).toBeDefined();
    expect(screen.getByRole("link", { name: "会話を見る" }).getAttribute("href")).toBe("/conversations/12");
    expect(screen.queryByTestId("scout-form")).toBeNull();
  });

  it("shows not found with a list link", async () => {
    mocks.getIntern.mockRejectedValue({ status: 404, errors: [{ code: "not_found", message: "not found" }] });
    render(<InternDetail id={999} returnTo={null} />);

    expect(await screen.findByText("プロフィールが見つかりません")).toBeDefined();
    expect(screen.getByRole("link", { name: "一覧へ戻る" }).getAttribute("href")).toBe("/interns");
  });

  it("offers retry after a communication failure", async () => {
    mocks.getIntern.mockRejectedValueOnce(new Error("network"));
    mocks.getIntern.mockResolvedValueOnce({ id: 7, display_name: "たかし", school_name: "Example大学", grade: "3年", bio: "自己紹介", desired_role: null, technical_stacks: [], published_at: "2026-07-01T00:00:00Z", conversation_id: null });
    render(<InternDetail id={7} returnTo={null} />);

    fireEvent.click(await screen.findByRole("button", { name: "再読み込み" }));
    expect(await screen.findByRole("heading", { name: "たかし" })).toBeDefined();
  });
});
