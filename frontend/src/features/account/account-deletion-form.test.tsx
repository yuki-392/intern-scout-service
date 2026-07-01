import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountDeletionForm } from "./account-deletion-form";

const mocks = vi.hoisted(() => ({ deleteAccount: vi.fn(), push: vi.fn() }));
vi.mock("./account-api", () => ({ deleteAccount: mocks.deleteAccount }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("AccountDeletionForm", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows irreversible effects and retained shared history", () => {
    render(<AccountDeletionForm />);
    expect(screen.getByText("削除後はログインできず、元に戻せません")).toBeDefined();
    expect(screen.getByText("送信済みメッセージと応募履歴は相手側に残ります")).toBeDefined();
    expect(screen.getByText("企業の公開募集はすべて非公開になります")).toBeDefined();
  });

  it("requires password and confirmation checkbox", () => {
    render(<AccountDeletionForm />);
    const button = screen.getByRole("button", { name: "アカウントを削除" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("現在のパスワード"), { target: { value: "password123" } });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByLabelText("上記を理解しました"));
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("shows invalid password and prevents duplicate submission", async () => {
    mocks.deleteAccount.mockRejectedValue({ errors: [{ code: "invalid_password", field: "password", message: "パスワードが正しくありません" }] });
    render(<AccountDeletionForm />);
    enableDeletion();
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));
    expect(await screen.findByText("パスワードが正しくありません")).toBeDefined();

    mocks.deleteAccount.mockReturnValue(new Promise(() => undefined));
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));
    await waitFor(() => expect(mocks.deleteAccount).toHaveBeenCalledTimes(2));
  });

  it("moves home with completion state after success", async () => {
    mocks.deleteAccount.mockResolvedValue(undefined);
    render(<AccountDeletionForm />);
    enableDeletion();
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/?account_deleted=1"));
  });
});

function enableDeletion() {
  fireEvent.change(screen.getByLabelText("現在のパスワード"), { target: { value: "password123" } });
  fireEvent.click(screen.getByLabelText("上記を理解しました"));
}
