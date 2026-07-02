import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthPageGuard } from "./auth-page-guard";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), replace: vi.fn() }));
vi.mock("./auth-api", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));

describe("AuthPageGuard", () => {
  afterEach(() => vi.clearAllMocks());

  it("redirects an authenticated intern to the jobs page", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, email: "intern@example.com", role: "intern", company: null });
    render(<AuthPageGuard returnTo={null} />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/jobs"));
  });

  it("uses a safe return path for an authenticated company", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 2, email: "company@example.com", role: "company", company: { id: 1, name: "会社" } });
    render(<AuthPageGuard returnTo="/conversations/3" />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/conversations/3"));
  });

  it("keeps the authentication page visible when signed out", async () => {
    mocks.getCurrentUser.mockRejectedValue({ status: 401 });
    render(<AuthPageGuard returnTo={null}><p>ログインフォーム</p></AuthPageGuard>);

    await waitFor(() => expect(document.body.textContent).toContain("ログインフォーム"));
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("announces a card-sized loading state while checking authentication", () => {
    mocks.getCurrentUser.mockReturnValue(new Promise(() => undefined));
    render(<AuthPageGuard returnTo={null}><p>ログインフォーム</p></AuthPageGuard>);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.className).toContain("loadingState");
    expect(status.textContent).toContain("ログイン状態を確認しています");
    expect(screen.queryByText("ログインフォーム")).toBeNull();
  });
});
