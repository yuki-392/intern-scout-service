import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyJobCreator } from "./company-job-creator";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("../auth/auth-api", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("./job-posting-form", () => ({
  JobPostingForm: ({ companyProfile }: { companyProfile: { description: string; website_url: string } }) => (
    <p>{companyProfile.description} / {companyProfile.website_url}</p>
  ),
}));

describe("CompanyJobCreator", () => {
  afterEach(() => vi.clearAllMocks());

  it("loads the shared company profile into a new posting form", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, email: "company@example.com", role: "company", company: { id: 2, name: "Example", description: "企業紹介", website_url: "https://example.com" } });

    render(<CompanyJobCreator />);

    expect(await screen.findByText("企業紹介 / https://example.com")).toBeDefined();
  });
});
