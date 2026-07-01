import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignupForm } from "./signup-form";

const mocks = vi.hoisted(() => ({
  prefetchCsrfToken: vi.fn(async () => "csrf-token"),
  registerUser: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("./auth-api", () => ({
  prefetchCsrfToken: mocks.prefetchCsrfToken,
  registerUser: mocks.registerUser,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

describe("SignupForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.prefetchCsrfToken.mockResolvedValue("csrf-token");
  });

  it("shows role choices and prefetches csrf when a form is shown", async () => {
    render(<SignupForm initialRole={null} />);

    expect(
      screen.getByRole("button", { name: "インターン生として登録" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "企業担当者として登録" }),
    ).toBeDefined();
    expect(mocks.prefetchCsrfToken).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "インターン生として登録" }),
    );

    expect(screen.getByLabelText("メールアドレス")).toBeDefined();
    expect(screen.getByLabelText("パスワード")).toBeDefined();
    expect(screen.getByLabelText("パスワード（確認）")).toBeDefined();
    await waitFor(() => {
      expect(mocks.prefetchCsrfToken).toHaveBeenCalledTimes(1);
    });
  });

  it("does not cause an unhandled rejection when csrf prefetch fails", async () => {
    const prefetch = Promise.resolve("csrf-token");
    const catchHandler = vi.spyOn(prefetch, "catch");
    mocks.prefetchCsrfToken.mockReturnValueOnce(prefetch);

    render(<SignupForm initialRole="intern" />);

    await waitFor(() => {
      expect(catchHandler).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByLabelText("メールアドレス")).toBeDefined();
  });

  it("preserves role inputs but omits company name from intern registration", async () => {
    mocks.registerUser.mockResolvedValue({
      id: 1,
      email: "intern@example.com",
      role: "intern",
      company: null,
    });
    render(<SignupForm initialRole="company" />);

    fireEvent.change(screen.getByLabelText("企業名"), {
      target: { value: "Example Inc." },
    });
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "intern@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("パスワード（確認）"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "利用者種別を変更" }));
    fireEvent.click(
      screen.getByRole("button", { name: "インターン生として登録" }),
    );

    expect(
      (screen.getByLabelText("メールアドレス") as HTMLInputElement).value,
    ).toBe("intern@example.com");
    expect(screen.queryByLabelText("企業名")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "アカウントを作成" }));

    await waitFor(() => {
      expect(mocks.registerUser).toHaveBeenCalledWith({
        role: "intern",
        email: "intern@example.com",
        password: "password123",
        password_confirmation: "password123",
      });
    });
    expect(mocks.replace).toHaveBeenCalledWith("/profile/edit");

    fireEvent.click(screen.getByRole("button", { name: "利用者種別を変更" }));
    fireEvent.click(
      screen.getByRole("button", { name: "企業担当者として登録" }),
    );
    expect((screen.getByLabelText("企業名") as HTMLInputElement).value).toBe(
      "Example Inc.",
    );
  });

  it("shows all field errors and focuses the error summary", async () => {
    mocks.registerUser.mockRejectedValue({
      errors: [
        {
          code: "validation_error",
          field: "email",
          message: "メールアドレスはすでに使用されています",
        },
        {
          code: "validation_error",
          field: "password",
          message: "パスワードは8文字以上で入力してください",
        },
      ],
    });
    render(<SignupForm initialRole="intern" />);
    fillCommonFields();

    fireEvent.click(screen.getByRole("button", { name: "アカウントを作成" }));

    const summary = await screen.findByRole("alert");
    expect(screen.getAllByText("メールアドレスはすでに使用されています")).toHaveLength(2);
    expect(screen.getAllByText("パスワードは8文字以上で入力してください")).toHaveLength(2);
    expect(document.activeElement).toBe(summary);
  });

  it("prevents duplicate submission while registration is pending", async () => {
    let resolveRegistration: ((value: unknown) => void) | undefined;
    mocks.registerUser.mockReturnValue(
      new Promise((resolve) => {
        resolveRegistration = resolve;
      }),
    );
    render(<SignupForm initialRole="intern" />);
    fillCommonFields();

    const submit = screen.getByRole("button", { name: "アカウントを作成" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mocks.registerUser).toHaveBeenCalledTimes(1);
      expect(submit.hasAttribute("disabled")).toBe(true);
    });
    resolveRegistration?.({
      id: 1,
      email: "intern@example.com",
      role: "intern",
      company: null,
    });
  });
});

function fillCommonFields() {
  fireEvent.change(screen.getByLabelText("メールアドレス"), {
    target: { value: "intern@example.com" },
  });
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("パスワード（確認）"), {
    target: { value: "password123" },
  });
}
