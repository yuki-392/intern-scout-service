import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicJobList } from "./public-job-list";

const mocks = vi.hoisted(() => ({ getJobs: vi.fn() }));
vi.mock("./job-posting-api", () => ({ getPublicJobPostings: mocks.getJobs }));

describe("PublicJobList", () => {
  afterEach(() => vi.clearAllMocks());
  it("shows loading then empty state", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mocks.getJobs.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<PublicJobList page={1} />);
    expect(screen.getByText("募集を読み込んでいます")).toBeDefined();
    resolve({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    expect(await screen.findByText("公開中の募集はありません")).toBeDefined();
    expect(screen.getByText("新しい募集が公開されるまで、企業に伝わるプロフィールを準備しましょう。")).toBeDefined();
    expect(screen.getByRole("link", { name: "プロフィールを充実させる" }).getAttribute("href")).toBe("/profile/edit");
  });
  it("shows company title stacks and applied state", async () => {
    mocks.getJobs.mockResolvedValue({ data: [{ id: 3, company_name: "Example", title: "Rails募集", technical_stacks: ["Ruby"], applied: true }], meta: { current_page: 1, total_pages: 1, total_count: 1, per_page: 20 } });
    render(<PublicJobList page={1} />);
    expect(await screen.findByText("Rails募集")).toBeDefined();
    expect(screen.getByText("応募済み")).toBeDefined();
    const detailLink = screen.getByRole("link", { name: "募集詳細を見る" });
    expect(detailLink.getAttribute("href")).toBe("/jobs/3");
    expect(detailLink.getAttribute("class")).toContain("detailLink");
    expect(screen.queryByRole("link", { name: "前へ" })).toBeNull();
    expect(screen.queryByRole("link", { name: "次へ" })).toBeNull();
  });
  it("shows URL-based previous and next page links from metadata", async () => {
    mocks.getJobs.mockResolvedValue({ data: [{ id: 21, company_name: "Example", title: "Next募集", technical_stacks: [], applied: false }], meta: { current_page: 2, total_pages: 3, total_count: 41, per_page: 20 } });
    render(<PublicJobList page={2} />);

    expect(await screen.findByText("2 / 3ページ")).toBeDefined();
    expect(screen.getByRole("link", { name: "前へ" }).getAttribute("href")).toBe("/jobs?page=1");
    expect(screen.getByRole("link", { name: "次へ" }).getAttribute("href")).toBe("/jobs?page=3");
  });
});
