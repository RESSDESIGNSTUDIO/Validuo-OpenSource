import type { EntitySchema } from "@mikro-orm/core";

/**
 * Explicit list of all entities. Add every new entity (`defineEntity` in its own
 * `<domain>/<name>.entity.ts` file) here — directory scanning does not work in the Next.js bundle.
 */
export const entities: EntitySchema[] = [];
