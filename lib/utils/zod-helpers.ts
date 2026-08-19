// ============================================================
// lib/utils/zod-helpers.ts
// Shared Zod field helpers to close a recurring bug class:
// z.string().url() rejects an empty string outright (it is not
// a valid URL), so any admin form that sends '' for "not set"
// instead of omitting the key fails schema.safeParse() for the
// WHOLE payload — not just that field — and the route returns a
// generic 400 with nothing saved. Confirmed live in the Payment
// Settings QR-code field and the Bulk Notifications link field.
// ============================================================

import { z } from 'zod'

/**
 * An optional URL field that also tolerates an empty string.
 * @param nullable  true  → '' becomes null (field explicitly cleared in DB)
 *                  false → '' becomes undefined (field left untouched)
 */
export function optionalUrl({ nullable = true }: { nullable?: boolean } = {}) {
  if (nullable) {
    return z.preprocess(
      (v) => (v === '' ? null : v),
      z.string().url().nullable().optional()
    )
  }
  return z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().url().optional()
  )
}
