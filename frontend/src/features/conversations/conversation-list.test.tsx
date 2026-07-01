import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversationList } from "./conversation-list";

const mocks = vi.hoisted(() => ({ getConversations: vi.fn() }));
vi.mock("./conversation-api", () => ({ getConversations: mocks.getConversations }));

describe("ConversationList", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows loading then empty state", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mocks.getConversations.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<ConversationList page={1} />);
    expect(screen.getByText("会話を読み込んでいます")).toBeDefined();
    resolve({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    expect(await screen.findByText("会話はまだありません")).toBeDefined();
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
