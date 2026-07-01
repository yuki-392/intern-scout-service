import { describe, expect, it, vi } from "vitest";

import { notifyIfSessionExpired, SESSION_EXPIRED_EVENT } from "./session-expiration";

describe("notifyIfSessionExpired", () => {
  it("notifies only for unauthorized responses", () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    notifyIfSessionExpired(new Response(null, { status: 422 }));
    notifyIfSessionExpired(new Response(null, { status: 401 }));

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });
});
