import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InternSearchPage } from "./intern-search-page";

const mocks = vi.hoisted(() => ({ getInterns: vi.fn(), push: vi.fn() }));
vi.mock("./intern-api", () => ({ getInterns: mocks.getInterns }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("InternSearchPage", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows initial query and loading then empty state", async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    mocks.getInterns.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<InternSearchPage initialQuery={{ school_name: "東京", desired_role: "", technical_stack: "", page: 1 }} />);

    expect((screen.getByLabelText("学校名") as HTMLInputElement).value).toBe("東京");
    expect(screen.getByText("候補者を読み込んでいます")).toBeDefined();
    resolveRequest({ data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } });
    expect(await screen.findByText("条件に一致するインターン生はいません")).toBeDefined();
  });

  it("updates encoded query and resets page when searching", async () => {
    mocks.getInterns.mockResolvedValue(emptyResponse());
    render(<InternSearchPage initialQuery={{ school_name: "", desired_role: "", technical_stack: "", page: 3 }} />);
    fireEvent.change(screen.getByLabelText("学校名"), { target: { value: "東京 & 大学" } });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));

    expect(mocks.push).toHaveBeenCalledWith("/interns?school_name=%E6%9D%B1%E4%BA%AC+%26+%E5%A4%A7%E5%AD%A6&page=1");
  });

  it("clears every filter", async () => {
    mocks.getInterns.mockResolvedValue(emptyResponse());
    render(<InternSearchPage initialQuery={{ school_name: "東京", desired_role: "backend", technical_stack: "Ruby", page: 2 }} />);
    fireEvent.click(screen.getByRole("button", { name: "条件をクリア" }));
    expect(mocks.push).toHaveBeenCalledWith("/interns");
  });

  it("shows cards details links and pagination", async () => {
    mocks.getInterns.mockResolvedValue({
      data: [{ id: 7, display_name: "たかし", school_name: "Example大学", grade: "3年", bio_excerpt: "紹介", desired_role: "Backend", technical_stacks: ["Ruby"], published_at: "2026-07-01T00:00:00Z" }],
      meta: { current_page: 2, total_pages: 3, total_count: 41, per_page: 20 },
    });
    render(<InternSearchPage initialQuery={{ school_name: "東京", desired_role: "", technical_stack: "", page: 2 }} />);

    expect((await screen.findByRole("link", { name: "たかしの詳細を見る" })).getAttribute("href")).toBe("/interns/7?return_to=%2Finterns%3Fschool_name%3D%25E6%259D%25B1%25E4%25BA%25AC%26page%3D2");
    expect(screen.getByText("経験・制作物")).toBeDefined();
    expect(screen.getByText("2 / 3ページ")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "次のページ" }));
    expect(mocks.push).toHaveBeenCalledWith("/interns?school_name=%E6%9D%B1%E4%BA%AC&page=3");
  });

  it("keeps filters and offers retry after failure", async () => {
    mocks.getInterns.mockRejectedValueOnce(new Error("network"));
    mocks.getInterns.mockResolvedValueOnce(emptyResponse());
    render(<InternSearchPage initialQuery={{ school_name: "東京", desired_role: "", technical_stack: "", page: 1 }} />);

    fireEvent.click(await screen.findByRole("button", { name: "再読み込み" }));
    await waitFor(() => expect(mocks.getInterns).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText("学校名") as HTMLInputElement).value).toBe("東京");
  });
});

function emptyResponse() {
  return { data: [], meta: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } };
}
