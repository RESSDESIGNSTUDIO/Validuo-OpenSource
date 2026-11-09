import "server-only";

import type { Clock } from "@validuo/core/ports/security";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
