import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalCss = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const authCss = readFileSync(
  resolve(process.cwd(), "src/features/auth/auth-form.module.css"),
  "utf8",
);

describe("global focus styles", () => {
  it("defines the shared focus color token", () => {
    expect(globalCss).toMatch(/--color-focus:\s*#d28a33/i);
  });

  it("gives links, buttons, and every form control one focus-visible style", () => {
    expect(globalCss).toMatch(
      /:where\(a, button, input, select, textarea\):focus-visible\s*\{[^}]*outline:\s*3px solid var\(--color-focus\);[^}]*outline-offset:\s*3px;/,
    );
  });

  it("does not override the shared style with an input-only focus rule", () => {
    expect(authCss).not.toMatch(/input:focus(?!-visible)/);
  });
});
