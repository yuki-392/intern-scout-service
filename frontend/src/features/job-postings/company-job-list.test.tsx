import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanyJobList } from "./company-job-list";

const mocks = vi.hoisted(() => ({ getJobs: vi.fn() }));
vi.mock("./job-posting-api", () => ({ getCompanyJobPostings: mocks.getJobs }));

describe("CompanyJobList", () => {
  afterEach(() => vi.clearAllMocks());

  it("explains the empty state and links to job creation", async () => {
    mocks.getJobs.mockResolvedValue([]);
    render(<CompanyJobList />);

    expect(await screen.findByText("作成した募集はありません")).toBeDefined();
    expect(screen.getByText("募集を公開すると、インターン生からの応募を受け付けられます。")).toBeDefined();
    expect(screen.getByRole("link", { name: "新しい募集を作成" }).getAttribute("href")).toBe("/company/jobs/new");
  });
});
