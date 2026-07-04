import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InternProfileForm } from "./intern-profile-form";

const mocks = vi.hoisted(() => ({
  getInternProfile: vi.fn(),
  saveInternProfile: vi.fn(),
  prefetchCsrfToken: vi.fn(async () => "csrf-token"),
  replace: vi.fn(),
}));

vi.mock("./intern-profile-api", () => ({
  getInternProfile: mocks.getInternProfile,
  saveInternProfile: mocks.saveInternProfile,
}));

vi.mock("../auth/auth-api", () => ({
  prefetchCsrfToken: mocks.prefetchCsrfToken,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

describe("InternProfileForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.prefetchCsrfToken.mockResolvedValue("csrf-token");
  });

  it("shows loading and then an empty profile form", async () => {
    let resolveProfile: ((value: null) => void) | undefined;
    mocks.getInternProfile.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveProfile = resolve;
      }),
    );

    render(<InternProfileForm />);
    expect(screen.getByText("プロフィールを読み込んでいます")).toBeDefined();

    resolveProfile?.(null);
    expect(await screen.findByLabelText("表示名")).toBeDefined();
    expect(screen.getByLabelText("学校名")).toBeDefined();
    expect(screen.getByLabelText("学年")).toBeDefined();
    expect(screen.getByLabelText("経験・制作物")).toBeDefined();
    expect(screen.getByText("これまで取り組んだ開発や制作物、担当した役割を記載してください")).toBeDefined();
    expect(screen.getByLabelText("希望職種")).toBeDefined();
  });

  it("warns demo users not to enter real profile information", async () => {
    mocks.getInternProfile.mockResolvedValue(null);

    render(<InternProfileForm demoMode />);

    expect(await screen.findByText(/実在する氏名・学校名・経歴/)).toBeDefined();
  });

  it("shows an existing profile and the bio character count", async () => {
    mocks.getInternProfile.mockResolvedValue(profileResponse());

    render(<InternProfileForm />);

    expect(await screen.findByDisplayValue("たかし")).toBeDefined();
    expect(screen.getByDisplayValue("Example大学")).toBeDefined();
    expect(screen.getByText("13 / 1,000文字")).toBeDefined();
    expect(screen.getByText("Ruby")).toBeDefined();
  });

  it("adds and removes a technical stack", async () => {
    mocks.getInternProfile.mockResolvedValue(null);
    render(<InternProfileForm />);
    await screen.findByLabelText("表示名");

    fireEvent.change(screen.getByLabelText("技術スタックを追加"), {
      target: { value: "TypeScript" },
    });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByText("TypeScript")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "TypeScriptを削除" }));
    expect(screen.queryByText("TypeScript")).toBeNull();
  });

  it("rejects a normalized duplicate and a twenty first stack", async () => {
    mocks.getInternProfile.mockResolvedValue({
      ...profileResponse(),
      technical_stacks: Array.from({ length: 20 }, (_, index) => `Stack${index}`),
    });
    render(<InternProfileForm />);
    await screen.findByDisplayValue("たかし");

    expect(screen.getByText("20 / 20件")).toBeDefined();
    expect(screen.getByRole("button", { name: "追加" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Stack19を削除" }));
    fireEvent.change(screen.getByLabelText("技術スタックを追加"), {
      target: { value: " ＳＴＡＣＫ０ " },
    });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByText("同じ技術スタックは追加できません")).toBeDefined();
  });

  it("shows all server errors and focuses the summary", async () => {
    mocks.getInternProfile.mockResolvedValue(null);
    mocks.saveInternProfile.mockRejectedValue({
      errors: [
        { code: "validation_error", field: "display_name", message: "表示名を入力してください" },
        { code: "validation_error", field: "grade", message: "学年を選択してください" },
      ],
    });
    render(<InternProfileForm />);
    await screen.findByLabelText("表示名");

    fireEvent.click(screen.getByRole("button", { name: "プロフィールを保存" }));

    const summary = await screen.findByRole("alert");
    expect(screen.getAllByText("表示名を入力してください")).toHaveLength(2);
    expect(screen.getAllByText("学年を選択してください")).toHaveLength(2);
    expect(document.activeElement).toBe(summary);
  });

  it("keeps input after a failed save and can retry", async () => {
    mocks.getInternProfile.mockResolvedValue(null);
    mocks.saveInternProfile
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(profileResponse());
    render(<InternProfileForm />);
    const displayName = await screen.findByLabelText("表示名");
    fireEvent.change(displayName, { target: { value: "たかし" } });

    fireEvent.click(screen.getByRole("button", { name: "プロフィールを保存" }));
    expect(await screen.findByText("通信に失敗しました。もう一度お試しください")).toBeDefined();
    expect((displayName as HTMLInputElement).value).toBe("たかし");

    fireEvent.click(screen.getByRole("button", { name: "プロフィールを保存" }));
    expect(await screen.findByText("プロフィールを保存しました")).toBeDefined();
  });

  it("prevents duplicate submission while saving", async () => {
    mocks.getInternProfile.mockResolvedValue(null);
    mocks.saveInternProfile.mockReturnValue(new Promise(() => undefined));
    render(<InternProfileForm />);
    await screen.findByLabelText("表示名");

    const save = screen.getByRole("button", { name: "プロフィールを保存" });
    fireEvent.click(save);
    fireEvent.click(save);

    await waitFor(() => {
      expect(mocks.saveInternProfile).toHaveBeenCalledTimes(1);
      expect(save.hasAttribute("disabled")).toBe(true);
    });
  });

  it("shows retry when initial loading fails", async () => {
    mocks.getInternProfile.mockRejectedValueOnce(new Error("network error"));
    mocks.getInternProfile.mockResolvedValueOnce(null);
    render(<InternProfileForm />);

    fireEvent.click(await screen.findByRole("button", { name: "再読み込み" }));
    expect(await screen.findByLabelText("表示名")).toBeDefined();
  });
});

function profileResponse() {
  return {
    id: 1,
    display_name: "たかし",
    school_name: "Example大学",
    grade: "3年",
    bio: "Web開発を学んでいます。",
    desired_role: "バックエンドエンジニア",
    technical_stacks: ["Ruby"],
    published: true,
    published_at: "2026-06-30T12:00:00Z",
  };
}
