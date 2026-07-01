export type SupportContact = {
  href: string;
  label: string;
};

export function resolveSupportContact(
  value: string | undefined,
  labelValue: string | undefined,
): SupportContact | null {
  const label = labelValue?.trim();
  if (!value || !label) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "mailto:") return null;
    return { href: url.toString(), label };
  } catch {
    return null;
  }
}
