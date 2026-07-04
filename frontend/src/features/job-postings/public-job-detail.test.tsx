import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicJobDetail } from "./public-job-detail";

const mocks = vi.hoisted(() => ({ getJob: vi.fn(), apply: vi.fn() }));
vi.mock("./job-posting-api", () => ({ getPublicJobPosting: mocks.getJob, applyToJobPosting: mocks.apply }));

describe("PublicJobDetail", () => {
  afterEach(() => vi.clearAllMocks());
  it("confirms application and links to conversation after success", async () => {
    mocks.getJob.mockResolvedValue(job());
    mocks.apply.mockResolvedValue({ conversation_id: 9 });
    render(<PublicJobDetail id={3} />);
    fireEvent.click(await screen.findByRole("button", { name: "応募する" }));
    const dialog = screen.getByRole("dialog", { name: "応募の確認" });
    expect(dialog.textContent).toContain("Rails募集に応募しますか？");
    expect(mocks.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "はい" }));
    expect(await screen.findByText("応募しました")).toBeDefined();
    expect(screen.getByRole("link", { name: "会話を開く" }).getAttribute("href")).toBe("/conversations/9");
  });
  it("shows company information separately from the job description", async () => {
    mocks.getJob.mockResolvedValue(job());
    render(<PublicJobDetail id={3} />);

    expect(await screen.findByRole("heading", { name: "企業について" })).toBeDefined();
    expect(screen.getByText("自社サービスを開発しています。")).toBeDefined();
    const website = screen.getByRole("link", { name: "企業ホームページを見る" });
    expect(website.getAttribute("href")).toBe("https://example.com");
  });
  it("closes the confirmation without applying", async () => {
    mocks.getJob.mockResolvedValue(job());
    render(<PublicJobDetail id={3} />);

    fireEvent.click(await screen.findByRole("button", { name: "応募する" }));
    fireEvent.click(screen.getByRole("button", { name: "いいえ" }));

    expect(screen.queryByRole("dialog", { name: "応募の確認" })).toBeNull();
    expect(screen.getByRole("button", { name: "応募する" })).toBeDefined();
    expect(mocks.apply).not.toHaveBeenCalled();
  });
  it("shows applied state without apply button", async () => {
    mocks.getJob.mockResolvedValue({ ...job(), applied: true });
    render(<PublicJobDetail id={3} />);
    const appliedButton = await screen.findByRole("button", { name: "応募済み" });
    expect(appliedButton.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "応募する" })).toBeNull();
  });
  it("shows not found", async () => {
    mocks.getJob.mockRejectedValue({ status: 404 });
    render(<PublicJobDetail id={99} />);
    expect(await screen.findByText("募集が見つかりません")).toBeDefined();
  });
  it("announces a card-sized loading state", () => {
    mocks.getJob.mockReturnValue(new Promise(() => undefined));
    render(<PublicJobDetail id={3} />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.className).toContain("loadingPanel");
    expect(status.textContent).toContain("募集を読み込んでいます");
  });
  it("explains a loading failure and retries", async () => {
    mocks.getJob.mockRejectedValueOnce({ status: 500 }).mockResolvedValueOnce(job());
    render(<PublicJobDetail id={3} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("募集情報を読み込めませんでした");
    expect(alert.textContent).toContain("通信状況を確認");
    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));

    expect(await screen.findByText("Rails募集")).toBeDefined();
    expect(mocks.getJob).toHaveBeenCalledTimes(2);
  });
});

function job() { return { id: 3, company_name: "Example", company_description: "自社サービスを開発しています。", company_website_url: "https://example.com", title: "Rails募集", description: "開発", work_conditions: "週3日", technical_stacks: ["Ruby"], applied: false }; }
