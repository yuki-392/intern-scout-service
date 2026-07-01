export const SESSION_EXPIRED_EVENT = "intern-scout:session-expired";

export function notifyIfSessionExpired(response: Response): void {
  if (response.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

export function sessionExpiredLoginPath(pathname: string): string {
  const params = new URLSearchParams({
    reason: "session_expired",
    return_to: pathname,
  });
  return `/login?${params.toString()}`;
}
