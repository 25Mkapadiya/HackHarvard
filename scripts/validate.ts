import type { ZodType } from 'zod';

/** Validates every output against its zod schema and throws with a readable summary on failure. */
export function validate(checks: [label: string, schema: ZodType, value: unknown][]) {
  const errors: string[] = [];
  for (const [label, schema, value] of checks) {
    const r = schema.safeParse(value);
    if (!r.success) {
      const issues = r.error.issues.slice(0, 10).map((i) => `  - ${i.path.join('.')}: ${i.message}`);
      errors.push(`${label}: ${r.error.issues.length} issue(s)\n${issues.join('\n')}`);
    }
  }
  if (errors.length) throw new Error(`Validation failed:\n${errors.join('\n')}`);
}
