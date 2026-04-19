/**
 * Authenticated backend fetch utility.
 *
 * Adds X-Internal-Secret to every request so Spring Boot can verify
 * the call came from the trusted Next.js server, not a direct client.
 *
 * Usage:
 *   const res = await backendFetch("/api/resumes", { headers: { "X-User-Id": userId } });
 */
export function backendFetch(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not configured");
  }

  const BACKEND_URL =
    (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");

  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "X-Internal-Secret": secret,
    },
  });
}
