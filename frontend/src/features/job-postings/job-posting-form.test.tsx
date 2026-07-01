import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobPostingForm } from "./job-posting-form";

const mocks = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn() }));
vi.mock("./job-posting-api", () => ({ saveCompanyJobPosting: mocks.save }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("JobPostingForm", () => {
  afterEach(() => vi.clearAllMocks());
  it("submits fields stacks and published status", async () => {
    mocks.save.mockResolvedValue({ id: 3 });
    render(<JobPostingForm posting={null} />);
    fireEvent.change(screen.getByLabelText("タイトル"), { target: { value: "Rails募集" } });
    fireEvent.change(screen.getByLabelText("業務内容"), { target: { value: "開発" } });
    fireEvent.change(screen.getByLabelText("勤務条件"), { target: { value: "週3日" } });
    fireEvent.change(screen.getByLabelText("技術スタックを追加"), { target: { value: "Ruby" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    fireEvent.click(screen.getByLabelText("公開する"));
    fireEvent.click(screen.getByRole("button", { name: "募集を保存" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(null, expect.objectContaining({ title: "Rails募集", status: "published", technical_stacks: ["Ruby"] })));
  });
  it("shows all errors and prevents duplicate submission", async () => {
    mocks.save.mockReturnValue(new Promise(() => undefined));
    render(<JobPostingForm posting={null} />);
    const save = screen.getByRole("button", { name: "募集を保存" });
    fireEvent.click(save); fireEvent.click(save);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(save.hasAttribute("disabled")).toBe(true);
  });
});
