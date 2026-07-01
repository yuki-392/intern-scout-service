import { afterEach, describe, expect, it, vi } from "vitest";

describe("conversation-api", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it("starts scout with csrf and allowed parameters", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrf_token: "token" } }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { conversation_id: 3 } }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { startScout } = await import("./conversation-api");
    await startScout(7, "hello");
    expect(fetchMock.mock.calls.some(([path]) => path === "/api/v1/conversations")).toBe(true);
  });

  it("fetches own conversation without caching", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: {}, meta: {} }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { getConversation } = await import("./conversation-api");
    await getConversation(3, 1);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/conversations/3?page=1", { cache: "no-store", credentials: "same-origin" });
  });
});
