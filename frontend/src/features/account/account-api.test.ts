import { afterEach, describe, expect, it, vi } from "vitest";

describe("account-api", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  it("sends password with csrf using delete", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrf_token: "token" } }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { deleteAccount } = await import("./account-api");
    await deleteAccount("password123");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/me/account");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  });
});
