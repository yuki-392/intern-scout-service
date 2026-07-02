import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationList } from "./conversation-list";

const mocks = vi.hoisted(() => ({ getConversations: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("./conversation-api", () => ({ getConversations: mocks.getConversations }));
vi.mock("../auth/auth-api", () => ({ getCurrentUser: mocks.getCurrentUser }));

describe("ConversationList", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, email: "intern@example.com", role: "intern", company: null });
  });
  afterEach(() => vi.clearAllMocks());

  it("shows loading then empty state", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mocks.getConversations.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<ConversationList page={1} />);
    expect(screen.getByText("会話を読み込んでいます")).toBeDefined();
    resolve({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    expect(await screen.findByText("会話はまだありません")).toBeDefined();
    expect(screen.getByText("スカウトまたは応募をきっかけに会話が始まります。")).toBeDefined();
    expect(screen.getByRole("link", { name: "プロフィールを充実させる" }).getAttribute("href")).toBe("/profile/edit");
    expect(screen.queryByRole("link", { name: "インターン生を探す" })).toBeNull();
  });

  it("shows only the intern search action to a company", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 2, email: "company@example.com", role: "company", company: { id: 1, name: "会社" } });
    mocks.getConversations.mockResolvedValue({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    render(<ConversationList page={1} />);

    expect(await screen.findByRole("link", { name: "インターン生を探す" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "プロフィールを充実させる" })).toBeNull();
  });

  it("shows counterpart latest message and detail link", async () => {
    mocks.getConversations.mockResolvedValue({ data: [{ id: 3, counterpart_name: "たかし", latest_message_excerpt: "はじめまして", latest_message_kind: "scout", latest_sender_name: "Example Inc.", last_messaged_at: "2026-07-01T00:00:00Z" }], meta: { current_page: 1, total_pages: 1, total_count: 1, per_page: 20 } });
    render(<ConversationList page={1} />);
    expect(await screen.findByText("はじめまして")).toBeDefined();
    expect(screen.getByRole("link", { name: "たかしとの会話を開く" }).getAttribute("href")).toBe("/conversations/3");
  });

  it("offers retry after failure", async () => {
    mocks.getConversations.mockRejectedValueOnce(new Error("network"));
    mocks.getConversations.mockResolvedValueOnce({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    render(<ConversationList page={1} />);
    fireEvent.click(await screen.findByRole("button", { name: "再読み込み" }));
    expect(await screen.findByText("会話はまだありません")).toBeDefined();
  });
});
