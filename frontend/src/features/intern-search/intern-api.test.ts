import { afterEach, describe, expect, it, vi } from "vitest";

describe("intern-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("encodes filters and page when fetching interns", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getInterns } = await import("./intern-api");

    await getInterns({ school_name: "東京 & 大学", desired_role: "backend", technical_stack: "Ruby", page: 2 });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/interns?school_name=%E6%9D%B1%E4%BA%AC+%26+%E5%A4%A7%E5%AD%A6&desired_role=backend&technical_stack=Ruby&page=2",
    );
  });

  it("fetches one intern without caching", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 7 } }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getIntern } = await import("./intern-api");

    await getIntern(7);

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/interns/7", { cache: "no-store", credentials: "same-origin" });
  });
});
