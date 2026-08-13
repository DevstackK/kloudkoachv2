// A 401 here almost always means the short-lived access-token cookie
// expired, not that the user is actually logged out - the refresh-token
// cookie is still valid. Silently reissue it and retry once before
// surfacing anything to the caller.
export async function fetchWithAuthRetry(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, options);
  if (res.status === 401) {
    await fetch("/api/auth/me", { credentials: "include" }).catch(() => {});
    res = await fetch(url, options);
  }
  return res;
}
