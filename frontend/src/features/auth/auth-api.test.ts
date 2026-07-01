import { afterEach, describe, expect, it, vi } from "vitest";

const csrfResponse = (token: string) =>
  new Response(JSON.stringify({ data: { csrf_token: token } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const userResponse = () =>
  new Response(
    JSON.stringify({
      data: {
        id: 1,
        email: "intern@example.com",
        role: "intern",
        company: null,
      },
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );

describe("auth-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("deduplicates csrf prefetch while a request is in flight", async () => {
    const fetchMock = vi.fn(async () => csrfResponse("csrf-token"));
    vi.stubGlobal("fetch", fetchMock);
    const { prefetchCsrfToken } = await import("./auth-api");

    const [first, second] = await Promise.all([
      prefetchCsrfToken(),
      prefetchCsrfToken(),
    ]);

    expect(first).toBe("csrf-token");
    expect(second).toBe("csrf-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/csrf", {
      cache: "no-store",
      credentials: "same-origin",
    });
  });

  it("sends registration with the prefetched csrf token", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse("csrf-token"))
      .mockResolvedValueOnce(userResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { prefetchCsrfToken, registerUser } = await import("./auth-api");

    await prefetchCsrfToken();
    await registerUser({
      role: "intern",
      email: "intern@example.com",
      password: "password123",
      password_confirmation: "password123",
    });

    const request = fetchMock.mock.calls[1];
    const headers = new Headers(request[1]?.headers);
    expect(request[0]).toBe("/api/v1/auth/registrations");
    expect(request[1]?.method).toBe("POST");
    expect(request[1]?.credentials).toBe("same-origin");
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  });

  it("refreshes csrf and retries once after an invalid token response", async () => {
    const invalidCsrf = new Response(
      JSON.stringify({
        errors: [{ code: "invalid_csrf_token", message: "invalid csrf" }],
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse("old-token"))
      .mockResolvedValueOnce(invalidCsrf)
      .mockResolvedValueOnce(csrfResponse("new-token"))
      .mockResolvedValueOnce(userResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { registerUser } = await import("./auth-api");

    await registerUser({
      role: "intern",
      email: "intern@example.com",
      password: "password123",
      password_confirmation: "password123",
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryHeaders = new Headers(fetchMock.mock.calls[3][1]?.headers);
    expect(retryHeaders.get("X-CSRF-Token")).toBe("new-token");
  });
});

describe("getCurrentUser", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it("loads the current session without caching", async () => {
    const user = { id: 1, email: "intern@example.com", role: "intern", company: null };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: user }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getCurrentUser } = await import("./auth-api");

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/me", { cache: "no-store", credentials: "same-origin" });
  });
});
