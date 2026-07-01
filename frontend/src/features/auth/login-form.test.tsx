import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

const mocks = vi.hoisted(() => ({
  prefetchCsrfToken: vi.fn(async () => "csrf-token"),
  loginUser: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("./auth-api", () => ({
  prefetchCsrfToken: mocks.prefetchCsrfToken,
  loginUser: mocks.loginUser,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

describe("LoginForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.prefetchCsrfToken.mockResolvedValue("csrf-token");
  });

  it("shows recovery paths and a session expired message", async () => {
    render(
      <LoginForm
        reason="session_expired"
        returnTo="/conversations/12"
        supportContact={{
          href: "mailto:support@example.com",
          label: "運営窓口",
        }}
      />,
    );

    expect(
      screen.getByText("セッションの有効期限が切れました。もう一度ログインしてください"),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "新規登録はこちら" }).getAttribute("href"),
    ).toBe("/signup");
    expect(
      screen.getByRole("link", { name: "運営窓口へ問い合わせる" }).getAttribute("href"),
    ).toBe("mailto:support@example.com");
    await waitFor(() => {
      expect(mocks.prefetchCsrfToken).toHaveBeenCalledTimes(1);
    });
  });

  it("does not cause an unhandled rejection when csrf prefetch fails", async () => {
    const prefetch = Promise.resolve("csrf-token");
    const catchHandler = vi.spyOn(prefetch, "catch");
    mocks.prefetchCsrfToken.mockReturnValueOnce(prefetch);

    render(<LoginForm reason={null} returnTo={null} supportContact={null} />);

    await waitFor(() => {
      expect(catchHandler).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("button", { name: "ログイン" })).toBeDefined();
  });

  it("shows fixed demo guidance when support is not configured", () => {
    render(<LoginForm reason={null} returnTo={null} supportContact={null} />);

    expect(
      screen.getByText(
        "このデモではパスワードを再設定できません。新しいデモ用アカウントをご利用ください",
      ),
    ).toBeDefined();
  });

  it("shows a generic message for invalid credentials", async () => {
    mocks.loginUser.mockRejectedValue({
      errors: [
        {
          code: "invalid_credentials",
          message: "メールアドレスまたはパスワードが正しくありません",
        },
      ],
    });
    render(<LoginForm reason={null} returnTo={null} supportContact={null} />);
    fillLoginFields();

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "新規登録はこちら" })).toBeDefined();
  });

  it("returns to a safe path after login", async () => {
    mocks.loginUser.mockResolvedValue({
      id: 1,
      email: "intern@example.com",
      role: "intern",
      company: null,
    });
    render(
      <LoginForm
        reason="session_expired"
        returnTo="/conversations/12"
        supportContact={null}
      />,
    );
    fillLoginFields();

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/conversations/12");
    });
  });
});

function fillLoginFields() {
  fireEvent.change(screen.getByLabelText("メールアドレス"), {
    target: { value: "intern@example.com" },
  });
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: "password123" },
  });
}
