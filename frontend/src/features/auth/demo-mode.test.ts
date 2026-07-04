import { describe, expect, it } from "vitest";

import { isDemoMode } from "./demo-mode";

describe("isDemoMode", () => {
  it("defaults to demo mode when the environment variable is missing", () => {
    expect(isDemoMode(undefined)).toBe(true);
  });

  it("only disables demo mode when explicitly set to false", () => {
    expect(isDemoMode("true")).toBe(true);
    expect(isDemoMode("false")).toBe(false);
  });
});
