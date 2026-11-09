import "server-only";

/**
 * Client IP, known only behind a proxy we control (`TRUSTED_PROXY`): Next.js route handlers do not
 * expose the socket address. The right-most `x-forwarded-for` entry is the one our proxy appended;
 * earlier entries are client-supplied and must not be trusted. Without a trusted proxy → `null`,
 * and per-IP limits are skipped rather than applied to a spoofable value.
 */
export function clientIp(headers: { get(name: string): string | null }, trustedProxy: boolean): string | null {
  if (!trustedProxy) {
    return null;
  }
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last ? last : null;
}
