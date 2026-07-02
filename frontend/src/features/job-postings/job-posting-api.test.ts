import { afterEach, describe, expect, it, vi } from "vitest";

describe("job-posting-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("unwraps the saved job posting from the API response", async () => {
    const saved = {
      id: 3,
      company_name: "Example",
      title: "Rails募集",
      description: "開発",
      work_conditions: "週3日",
      status: "published" as const,
      technical_stacks: ["Ruby"],
    };
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrf_token: "token" } }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: saved }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { saveCompanyJobPosting } = await import("./job-posting-api");

    const result = await saveCompanyJobPosting(3, {
      title: "Rails募集",
      description: "開発",
      work_conditions: "週3日",
      status: "published",
      technical_stacks: ["Ruby"],
    });

    expect(result).toEqual(saved);
    expect(fetchMock.mock.calls.some(([path, options]) => path === "/api/v1/company/job_postings/3" && options?.method === "PATCH")).toBe(true);
  });
});
