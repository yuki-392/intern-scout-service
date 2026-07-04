import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanyJobList } from "./company-job-list";

const mocks = vi.hoisted(() => ({ getJobs: vi.fn() }));
vi.mock("./job-posting-api", () => ({ getCompanyJobPostings: mocks.getJobs }));

describe("CompanyJobList", () => {
  afterEach(() => vi.clearAllMocks());

  it("explains the empty state and links to job creation", async () => {
    mocks.getJobs.mockResolvedValue({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    render(<CompanyJobList page={1} />);

    expect(await screen.findByText("作成した募集はありません")).toBeDefined();
    expect(screen.getByText("募集を公開すると、インターン生からの応募を受け付けられます。")).toBeDefined();
    expect(screen.getByRole("link", { name: "新しい募集を作成" }).getAttribute("href")).toBe("/company/jobs/new");
  });

  it("reloads the list after a job is created", async () => {
    mocks.getJobs.mockResolvedValue({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    const view = render(<CompanyJobList page={1} refreshKey="initial" />);
    await screen.findByText("作成した募集はありません");

    view.rerender(<CompanyJobList page={1} refreshKey="3" />);

    await vi.waitFor(() => expect(mocks.getJobs).toHaveBeenCalledTimes(2));
  });

  it("shows URL-based pagination links", async () => {
    mocks.getJobs.mockResolvedValue({ data: [{ id: 21, title: "募集21", status: "published" }], meta: { current_page: 2, total_pages: 3, total_count: 41, per_page: 20 } });
    render(<CompanyJobList page={2} />);

    expect(await screen.findByText("2 / 3ページ")).toBeDefined();
    expect(screen.getByRole("link", { name: "前へ" }).getAttribute("href")).toBe("/company/jobs?page=1");
    expect(screen.getByRole("link", { name: "次へ" }).getAttribute("href")).toBe("/company/jobs?page=3");
  });
});
