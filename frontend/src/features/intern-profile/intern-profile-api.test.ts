import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prefetchCsrfToken: vi.fn(async () => "csrf-token"),
  clearCsrfToken: vi.fn(),
}));

vi.mock("../api/csrf", () => ({
  prefetchCsrfToken: mocks.prefetchCsrfToken,
  clearCsrfToken: mocks.clearCsrfToken,
}));

describe("intern-profile-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches the current profile without caching", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getInternProfile } = await import("./intern-profile-api");

    await expect(getInternProfile()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/me/intern_profile", {
      cache: "no-store",
      credentials: "same-origin",
    });
  });

  it("saves the whole profile with a csrf token", async () => {
    const profile = {
      id: 1,
      display_name: "たかし",
      school_name: "Example大学",
      grade: "3年",
      bio: "Web開発を学んでいます。",
      desired_role: "バックエンドエンジニア",
      technical_stacks: ["Ruby"],
      published: true,
      published_at: "2026-06-30T12:00:00Z",
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: profile }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { saveInternProfile } = await import("./intern-profile-api");

    await saveInternProfile({
      display_name: profile.display_name,
      school_name: profile.school_name,
      grade: profile.grade,
      bio: profile.bio,
      desired_role: profile.desired_role,
      technical_stacks: profile.technical_stacks,
    });

    const [path, options] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/v1/me/intern_profile");
    expect(options?.method).toBe("PATCH");
    expect(new Headers(options?.headers).get("X-CSRF-Token")).toBe("csrf-token");
  });
});
