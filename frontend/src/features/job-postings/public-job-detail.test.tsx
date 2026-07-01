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
    expect(screen.getByText("募集『Rails募集』に応募しました。プロフィールをご確認ください。が企業へ送信されます")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "応募を確定" }));
    expect(await screen.findByText("応募しました")).toBeDefined();
    expect(screen.getByRole("link", { name: "会話を開く" }).getAttribute("href")).toBe("/conversations/9");
  });
  it("shows applied state without apply button", async () => {
    mocks.getJob.mockResolvedValue({ ...job(), applied: true });
    render(<PublicJobDetail id={3} />);
    expect(await screen.findByText("応募済み")).toBeDefined();
    expect(screen.queryByRole("button", { name: "応募する" })).toBeNull();
  });
  it("shows not found", async () => {
    mocks.getJob.mockRejectedValue({ status: 404 });
    render(<PublicJobDetail id={99} />);
    expect(await screen.findByText("募集が見つかりません")).toBeDefined();
  });
});

function job() { return { id: 3, company_name: "Example", title: "Rails募集", description: "開発", work_conditions: "週3日", technical_stacks: ["Ruby"], applied: false }; }
