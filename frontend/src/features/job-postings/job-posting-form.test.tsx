import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobPostingForm } from "./job-posting-form";

const mocks = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn(), replace: vi.fn() }));
vi.mock("./job-posting-api", () => ({ saveCompanyJobPosting: mocks.save }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }));

describe("JobPostingForm", () => {
  afterEach(() => vi.clearAllMocks());
  it("submits fields stacks and published status", async () => {
    mocks.save.mockResolvedValue({ id: 3 });
    render(<JobPostingForm posting={null} />);
    fireEvent.change(screen.getByLabelText("タイトル"), { target: { value: "Rails募集" } });
    fireEvent.change(screen.getByLabelText("業務内容"), { target: { value: "開発" } });
    fireEvent.change(screen.getByLabelText("勤務条件"), { target: { value: "週3日" } });
    fireEvent.change(screen.getByLabelText("企業紹介"), { target: { value: "自社サービスを開発しています。" } });
    fireEvent.change(screen.getByLabelText("企業ホームページ"), { target: { value: "https://example.com" } });
    fireEvent.change(screen.getByLabelText("技術スタックを追加"), { target: { value: "Ruby" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    fireEvent.click(screen.getByLabelText("公開する"));
    fireEvent.click(screen.getByRole("button", { name: "募集を保存" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(null, expect.objectContaining({ title: "Rails募集", status: "published", technical_stacks: ["Ruby"], company_description: "自社サービスを開発しています。", company_website_url: "https://example.com" })));
    expect(mocks.replace).toHaveBeenCalledWith("/company/jobs?created=3");
  });
  it("shows all errors and prevents duplicate submission", async () => {
    mocks.save.mockReturnValue(new Promise(() => undefined));
    render(<JobPostingForm posting={null} />);
    const save = screen.getByRole("button", { name: "募集を保存" });
    fireEvent.click(save); fireEvent.click(save);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(save.hasAttribute("disabled")).toBe(true);
  });

  it("announces a successful update without navigating away", async () => {
    mocks.save.mockResolvedValue({ id: 7 });
    render(<JobPostingForm posting={{ id: 7, company_name: "Example", company_description: "企業紹介", company_website_url: "https://example.com", title: "募集", description: "開発", work_conditions: "週3日", status: "draft", technical_stacks: [] }} />);

    fireEvent.click(screen.getByRole("button", { name: "募集を保存" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(7, expect.any(Object)));
    expect((await screen.findByRole("status")).textContent).toContain("募集を更新しました");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "募集を保存" }).hasAttribute("disabled")).toBe(false);
  });
});
