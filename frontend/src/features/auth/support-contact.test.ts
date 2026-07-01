import { describe, expect, it } from "vitest";

import { resolveSupportContact } from "./support-contact";

describe("resolveSupportContact", () => {
  it("accepts https and mailto contacts", () => {
    expect(
      resolveSupportContact("https://support.example/help", "サポート窓口"),
    ).toEqual({
      href: "https://support.example/help",
      label: "サポート窓口",
    });
    expect(
      resolveSupportContact("mailto:support@example.com", "運営窓口"),
    ).toEqual({
      href: "mailto:support@example.com",
      label: "運営窓口",
    });
  });

  it("returns null when contact is missing or unsafe", () => {
    expect(resolveSupportContact(undefined, undefined)).toBeNull();
    expect(
      resolveSupportContact("javascript:alert(1)", "危険なリンク"),
    ).toBeNull();
    expect(resolveSupportContact("https://support.example", " ")).toBeNull();
  });
});
