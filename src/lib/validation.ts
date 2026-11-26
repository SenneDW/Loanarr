import type { z } from "zod";

/** First error message per top-level field, for showing next to inputs. */
export function fieldErrors<T>(error: z.ZodError<T>) {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T;
    errors[key] ??= issue.message;
  }
  return errors;
}
