import { z } from "zod";

import { ValidationError } from "../errors/app-error";

/**
 * Parses untrusted input with a Zod schema. Failures become a `ValidationError` carrying field
 * messages only — never the offending values.
 */
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const { fieldErrors } = z.flattenError(result.error);
  throw new ValidationError("Popraw zaznaczone pola formularza.", fieldErrors as Record<string, string[]>);
}
