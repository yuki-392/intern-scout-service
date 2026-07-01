import { describe, expect, it } from "vitest";

import { safeReturnTo } from "./safe-return-to";

const origin = "https://intern-scout.example";

describe("safeReturnTo", () => {
  it("allows an internal path permitted for the role", () => {
    expect(
      safeReturnTo("/conversations/12?from=notice", "intern", origin),
    ).toBe("/conversations/12?from=notice");
    expect(safeReturnTo("/company/jobs/3/edit", "company", origin)).toBe(
      "/company/jobs/3/edit",
    );
  });

  it("uses the role default for an external or protocol-relative URL", () => {
    expect(safeReturnTo("https://evil.example/jobs", "intern", origin)).toBe(
      "/jobs",
    );
    expect(safeReturnTo("//evil.example/jobs", "company", origin)).toBe(
      "/interns",
    );
  });

  it("uses the role default for unsafe or unknown paths", () => {
    const candidates = [
      "javascript:alert(1)",
      "/login",
      "/signup?role=company",
      "/admin",
      "/\\evil.example",
      "/jobs\n/unsafe",
    ];

    for (const candidate of candidates) {
      expect(safeReturnTo(candidate, "intern", origin)).toBe("/jobs");
    }
  });

  it("does not allow a path owned by another role", () => {
    expect(safeReturnTo("/company/jobs", "intern", origin)).toBe("/jobs");
    expect(safeReturnTo("/profile/edit", "company", origin)).toBe(
      "/interns",
    );
  });
});
