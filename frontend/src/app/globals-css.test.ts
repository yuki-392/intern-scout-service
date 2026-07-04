import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalCss = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const pageCss = readFileSync(resolve(process.cwd(), "src/app/page.module.css"), "utf8");
const jobPostingCss = readFileSync(
  resolve(process.cwd(), "src/features/job-postings/job-postings.module.css"),
  "utf8",
);
const authCss = readFileSync(
  resolve(process.cwd(), "src/features/auth/auth-form.module.css"),
  "utf8",
);
const conversationCss = readFileSync(
  resolve(process.cwd(), "src/features/conversations/conversations.module.css"),
  "utf8",
);
const internSearchCss = readFileSync(
  resolve(process.cwd(), "src/features/intern-search/intern-search.module.css"),
  "utf8",
);
const componentCss = [
  "src/app/page.module.css",
  "src/features/auth/auth-form.module.css",
  "src/features/conversations/conversations.module.css",
  "src/features/intern-search/intern-search.module.css",
  "src/features/job-postings/job-postings.module.css",
  "src/features/navigation/app-navigation.module.css",
].map((path) => readFileSync(resolve(process.cwd(), path), "utf8")).join("\n");

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

describe("global design tokens", () => {
  it.each([
    ["color-primary", "#276247"],
    ["color-primary-hover", "#1d4d37"],
    ["color-surface", "#fff"],
    ["color-border", "#dce5df"],
    ["radius-control", "10px"],
    ["radius-card", "16px"],
    ["radius-hero", "24px"],
    ["control-height", "48px"],
    ["space-page", "clamp(20px, 4vw, 40px)"],
  ])("defines --%s", (name, value) => {
    expect(globalCss).toContain(`--${name}: ${value};`);
  });

  it("uses shared palette tokens in component styles", () => {
    expect(componentCss).not.toMatch(/#276247|#1d4d37|#dce5df|(?:color|background):\s*(?:#fff|white)\s*;/i);
  });

  it("removes one-off control heights and corner radii", () => {
    expect(componentCss).not.toMatch(/min-height:\s*(?:42|44|52)px/);
    expect(componentCss).not.toMatch(/border-radius:\s*(?:9|12|14|18|22|28)px/);
  });
});

describe("mobile home typography", () => {
  it("uses a restrained responsive heading size on mobile", () => {
    expect(pageCss).toMatch(
      /@media \(max-width: 560px\)[\s\S]*?\.hero h1\s*\{[^}]*font-size:\s*clamp\(2rem, 10vw, 2\.75rem\);/,
    );
  });

  it("keeps the mobile card horizontal padding stable", () => {
    expect(pageCss).toMatch(
      /@media \(max-width: 560px\)[\s\S]*?\.shell\s*\{[^}]*padding-inline:\s*26px;/,
    );
  });
});

describe("job posting empty state", () => {
  it("centers its primary action", () => {
    expect(jobPostingCss).toMatch(
      /\.emptyState \.detailLink\s*\{[^}]*justify-self:\s*center;/,
    );
  });
});

describe("job posting actions", () => {
  it("shows a pointer cursor for clickable buttons", () => {
    expect(jobPostingCss).toMatch(
      /\.button\s*\{[^}]*cursor:\s*pointer;/,
    );
    expect(jobPostingCss).toMatch(
      /\.secondaryButton\s*\{[^}]*cursor:\s*pointer;/,
    );
  });

  it("keeps the cursor unchanged for an applied button", () => {
    expect(jobPostingCss).toMatch(
      /\.appliedButton\s*\{[^}]*cursor:\s*default;/,
    );
  });
});

describe("conversation message boxes", () => {
  it("uses one fixed wide rectangle for replies and scout messages", () => {
    expect(conversationCss).toMatch(
      /\.form textarea\s*\{[^}]*width:\s*100%;[^}]*height:\s*120px;[^}]*resize:\s*none;/,
    );
  });
});

describe("existing conversation action", () => {
  it("keeps the conversation button label visible inside a profile card", () => {
    expect(internSearchCss).toMatch(
      /\.card \.button\s*\{[^}]*color:\s*var\(--color-surface\);[^}]*text-decoration:\s*none;/,
    );
  });
});
