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
    mocks.getIntern.mockResolvedValue({ id: 7, display_name: "たかし", school_name: "Example大学", grade: "3年", bio: "自己紹介", desired_role: "Backend", technical_stacks: ["Ruby"], published_at: "2026-07-01T00:00:00Z" });
    render(<InternDetail id={7} returnTo="/interns?school_name=東京&page=2" />);

    expect(await screen.findByRole("heading", { name: "たかし" })).toBeDefined();
    expect(screen.getByText("自己紹介")).toBeDefined();
    expect(screen.getByText("Ruby")).toBeDefined();
    expect(screen.getByRole("link", { name: "一覧へ戻る" }).getAttribute("href")).toBe("/interns?school_name=東京&page=2");
  });

  it("shows not found with a list link", async () => {
    mocks.getIntern.mockRejectedValue({ status: 404, errors: [{ code: "not_found", message: "not found" }] });
    render(<InternDetail id={999} returnTo={null} />);

    expect(await screen.findByText("プロフィールが見つかりません")).toBeDefined();
    expect(screen.getByRole("link", { name: "一覧へ戻る" }).getAttribute("href")).toBe("/interns");
  });

  it("offers retry after a communication failure", async () => {
    mocks.getIntern.mockRejectedValueOnce(new Error("network"));
    mocks.getIntern.mockResolvedValueOnce({ id: 7, display_name: "たかし", school_name: "Example大学", grade: "3年", bio: "自己紹介", desired_role: null, technical_stacks: [], published_at: "2026-07-01T00:00:00Z" });
    render(<InternDetail id={7} returnTo={null} />);

    fireEvent.click(await screen.findByRole("button", { name: "再読み込み" }));
    expect(await screen.findByRole("heading", { name: "たかし" })).toBeDefined();
  });
});
