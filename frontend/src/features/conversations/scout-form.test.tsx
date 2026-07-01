import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoutForm } from "./scout-form";

const mocks = vi.hoisted(() => ({ startScout: vi.fn(), push: vi.fn() }));
vi.mock("./conversation-api", () => ({ startScout: mocks.startScout }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("ScoutForm", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows character count and moves to conversation after sending", async () => {
    mocks.startScout.mockResolvedValue({ conversation_id: 12 });
    render(<ScoutForm internProfileId={7} />);
    fireEvent.change(screen.getByLabelText("スカウトメッセージ"), { target: { value: "はじめまして" } });
    expect(screen.getByText("6 / 2,000文字")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "スカウトを送る" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/conversations/12"));
  });

  it("shows validation error and keeps body", async () => {
    mocks.startScout.mockRejectedValue({ errors: [{ code: "validation_error", field: "body", message: "本文を入力してください" }] });
    render(<ScoutForm internProfileId={7} />);
    const body = screen.getByLabelText("スカウトメッセージ");
    fireEvent.change(body, { target: { value: "入力中" } });
    fireEvent.click(screen.getByRole("button", { name: "スカウトを送る" }));
    expect(await screen.findByText("本文を入力してください")).toBeDefined();
    expect((body as HTMLTextAreaElement).value).toBe("入力中");
  });

  it("prevents duplicate submission", async () => {
    mocks.startScout.mockReturnValue(new Promise(() => undefined));
    render(<ScoutForm internProfileId={7} />);
    fireEvent.change(screen.getByLabelText("スカウトメッセージ"), { target: { value: "hello" } });
    const send = screen.getByRole("button", { name: "スカウトを送る" });
    fireEvent.click(send); fireEvent.click(send);
    await waitFor(() => expect(mocks.startScout).toHaveBeenCalledTimes(1));
    expect(send.hasAttribute("disabled")).toBe(true);
  });
});
