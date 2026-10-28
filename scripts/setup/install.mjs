/**
 * npm refreshes `node_modules/.package-lock.json` on every install, so a hidden lockfile that is
 * missing or older than `package-lock.json` means dependencies may be stale or an install was
 * interrupted. Any doubt means "install": a redundant `npm install` is cheap, a skipped one is not.
 * @param {{ lockMtimeMs: number | null; installedLockMtimeMs: number | null }} times
 */
export function needsInstall({ lockMtimeMs, installedLockMtimeMs }) {
  if (lockMtimeMs === null || installedLockMtimeMs === null) {
    return true;
  }
  return installedLockMtimeMs < lockMtimeMs;
}
