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
  });
  it("shows company title stacks and applied state", async () => {
    mocks.getJobs.mockResolvedValue({ data: [{ id: 3, company_name: "Example", title: "Rails募集", technical_stacks: ["Ruby"], applied: true }], meta: { current_page: 1, total_pages: 1, total_count: 1, per_page: 20 } });
    render(<PublicJobList page={1} />);
    expect(await screen.findByText("Rails募集")).toBeDefined();
    expect(screen.getByText("応募済み")).toBeDefined();
    expect(screen.getByRole("link", { name: "募集詳細を見る" }).getAttribute("href")).toBe("/jobs/3");
  });
});
