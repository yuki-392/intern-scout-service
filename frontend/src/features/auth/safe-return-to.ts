import type { UserRole } from "./auth-types";

const defaultPath: Record<UserRole, string> = {
  intern: "/jobs",
  company: "/interns",
};

const commonPaths = ["/conversations", "/settings/account"];
const rolePaths: Record<UserRole, string[]> = {
  intern: ["/profile/edit", "/jobs"],
  company: ["/interns", "/company/jobs"],
};

export function safeReturnTo(
  candidate: string | null,
  role: UserRole,
  origin: string,
): string {
  const fallback = defaultPath[role];
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, origin);
    if (url.origin !== new URL(origin).origin) return fallback;

    const permitted = [...commonPaths, ...rolePaths[role]].some(
      (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
    );
    return permitted ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}
