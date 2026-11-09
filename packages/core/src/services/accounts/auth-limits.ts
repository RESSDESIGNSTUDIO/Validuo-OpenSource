const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Accepted product defaults (spec "Security Design"); the one place that defines them. */
export const AUTH_LIMITS = {
  /**
   * Failed sign-ins per (e-mail, IP) pair, so an attacker elsewhere cannot lock the owner out.
   * Without a trusted proxy the IP is unknown and the pair degrades to the e-mail alone.
   */
  loginEmailIp: { max: 5, windowMs: 15 * MINUTE },
  /** Failed sign-ins per client IP (only with a trusted proxy). */
  loginIp: { max: 20, windowMs: 15 * MINUTE },
  /** Registrations per client IP (only with a trusted proxy). */
  registerIp: { max: 5, windowMs: 60 * MINUTE },
  sessionAbsoluteMs: 30 * DAY,
  sessionIdleMs: 7 * DAY,
  /** `last_seen_at` is refreshed at most this often, to avoid a write on every request. */
  sessionTouchIntervalMs: 5 * MINUTE,
} as const;

/** Start of the fixed time window containing `now`. */
export function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}
