import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordResetForm, PasswordResetRequestForm } from "./password-reset-form";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  reset: vi.fn(),
  prefetch: vi.fn(async () => "csrf-token"),
}));

vi.mock("./auth-api", () => ({
  requestPasswordReset: mocks.request,
  resetPassword: mocks.reset,
  prefetchCsrfToken: mocks.prefetch,
}));

describe("password reset forms", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests a reset without revealing account existence", async () => {
    mocks.request.mockResolvedValue(undefined);
    render(<PasswordResetRequestForm />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "intern@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "再設定メールを送信" }));

    await screen.findByText("該当するアカウントがある場合、再設定メールを送信しました");
    expect(mocks.request).toHaveBeenCalledWith("intern@example.com");
  });

  it("submits matching passwords with the token", async () => {
    mocks.reset.mockResolvedValue(undefined);
    window.location.hash = "token=reset-token";
    render(<PasswordResetForm token="" />);

    fireEvent.change(screen.getByLabelText("新しいパスワード"), {
      target: { value: "new-password123" },
    });
    fireEvent.change(screen.getByLabelText("新しいパスワード（確認）"), {
      target: { value: "new-password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "パスワードを変更" }));

    await waitFor(() =>
      expect(mocks.reset).toHaveBeenCalledWith(
        "reset-token",
        "new-password123",
        "new-password123",
      ),
    );
    expect(
      (await screen.findByRole("link", { name: "ログインへ" })).getAttribute("href"),
    ).toBe("/login");
  });
});
