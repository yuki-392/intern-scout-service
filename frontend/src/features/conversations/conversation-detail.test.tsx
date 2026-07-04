import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversationDetail } from "./conversation-detail";

const mocks = vi.hoisted(() => ({ getConversation: vi.fn(), sendMessage: vi.fn() }));
vi.mock("./conversation-api", () => ({ getConversation: mocks.getConversation, sendMessage: mocks.sendMessage }));

describe("ConversationDetail", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows messages in order with sender names", async () => {
    mocks.getConversation.mockResolvedValue(detail());
    render(<ConversationDetail id={3} page={1} />);
    const messages = await screen.findAllByTestId("message");
    expect(messages.map((item) => item.textContent)).toEqual(["Example Inc.はじめまして", "たかしよろしくお願いします"]);
    expect(screen.queryByRole("link", { name: "過去のメッセージを見る" })).toBeNull();
  });

  it("links to the next history page when older messages remain", async () => {
    mocks.getConversation.mockResolvedValue({ ...detail(), meta: { current_page: 1, total_pages: 2, total_count: 51, per_page: 50 } });
    render(<ConversationDetail id={3} page={1} />);

    expect((await screen.findByRole("link", { name: "過去のメッセージを見る" })).getAttribute("href")).toBe("/conversations/3?page=2");
  });

  it("appends sent message and clears body", async () => {
    mocks.getConversation.mockResolvedValue(detail());
    mocks.sendMessage.mockResolvedValue({ id: 12, sender_name: "Example Inc.", body: "追加です", kind: "normal", created_at: "2026-07-01T00:02:00Z", mine: true });
    render(<ConversationDetail id={3} page={1} />);
    const body = await screen.findByLabelText("返信メッセージ");
    fireEvent.change(body, { target: { value: "追加です" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));
    expect(await screen.findByText("追加です")).toBeDefined();
    expect((body as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps body after failure and prevents duplicate submission", async () => {
    mocks.getConversation.mockResolvedValue(detail());
    mocks.sendMessage.mockReturnValue(new Promise(() => undefined));
    render(<ConversationDetail id={3} page={1} />);
    const body = await screen.findByLabelText("返信メッセージ");
    fireEvent.change(body, { target: { value: "入力中" } });
    const send = screen.getByRole("button", { name: "送信" });
    fireEvent.click(send); fireEvent.click(send);
    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledTimes(1));
    expect((body as HTMLTextAreaElement).value).toBe("入力中");
  });

  it("does not show form for a closed conversation", async () => {
    mocks.getConversation.mockResolvedValue({ ...detail(), can_send: false, counterpart_name: "退会済みユーザー" });
    render(<ConversationDetail id={3} page={1} />);
    expect(await screen.findByText("この相手には新しいメッセージを送信できません")).toBeDefined();
    expect(screen.queryByLabelText("返信メッセージ")).toBeNull();
  });
});

function detail() {
  return { id: 3, counterpart_name: "たかし", can_send: true, messages: [
    { id: 10, sender_name: "Example Inc.", body: "はじめまして", kind: "scout", created_at: "2026-07-01T00:00:00Z", mine: true },
    { id: 11, sender_name: "たかし", body: "よろしくお願いします", kind: "normal", created_at: "2026-07-01T00:01:00Z", mine: false },
  ], meta: { current_page: 1, total_pages: 1, total_count: 2, per_page: 50 } };
}
