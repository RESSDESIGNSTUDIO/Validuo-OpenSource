import type { EntitySchema } from "@mikro-orm/core";

/**
 * Jawna lista wszystkich encji. Każdą nową encję (zdefiniowaną przez `defineEntity`
 * w osobnym pliku w tym katalogu) dopisz tutaj — nie używamy skanowania katalogów,
 * bo nie działa ono w bundlu Next.js.
 */
export const entities: EntitySchema[] = [];
