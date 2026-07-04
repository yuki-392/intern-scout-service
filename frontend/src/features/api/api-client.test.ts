import { afterEach, describe, expect, it, vi } from "vitest";

const csrfResponse = (token: string) => new Response(
  JSON.stringify({ data: { csrf_token: token } }),
  { status: 200, headers: { "Content-Type": "application/json" } },
);
const invalidCsrfResponse = () => new Response(
  JSON.stringify({ errors: [{ code: "invalid_csrf_token", message: "invalid csrf" }] }),
  { status: 422, headers: { "Content-Type": "application/json" } },
);

describe("api-client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("refreshes csrf and retries a mutation once", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse("old-token"))
      .mockResolvedValueOnce(invalidCsrfResponse())
      .mockResolvedValueOnce(csrfResponse("new-token"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ok: true } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { apiMutate } = await import("./api-client");

    await expect(apiMutate<{ data: { ok: boolean } }>("/api/v1/example", { method: "POST" })).resolves.toEqual({ data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("X-CSRF-Token")).toBe("old-token");
    expect(new Headers(fetchMock.mock.calls[3][1]?.headers).get("X-CSRF-Token")).toBe("new-token");
  });

  it("does not retry a mutation more than once", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse("old-token"))
      .mockResolvedValueOnce(invalidCsrfResponse())
      .mockResolvedValueOnce(csrfResponse("new-token"))
      .mockResolvedValueOnce(invalidCsrfResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { apiMutate } = await import("./api-client");

    await expect(apiMutate("/api/v1/example", { method: "PATCH" })).rejects.toMatchObject({ status: 422, errors: [{ code: "invalid_csrf_token" }] });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("normalizes a non-json error response", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("bad gateway", { status: 502 })));
    const { apiRequest } = await import("./api-client");

    await expect(apiRequest("/api/v1/example")).rejects.toMatchObject({ status: 502, errors: [{ code: "request_failed" }] });
  });
});
