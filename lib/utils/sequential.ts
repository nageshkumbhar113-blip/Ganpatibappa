/**
 * Await a list of queries one at a time instead of concurrently.
 *
 * Running several Supabase queries through `Promise.all()` inside a single
 * serverless invocation was observed to intermittently resolve one of them to
 * an empty result with no error — which is what made every shop storefront
 * randomly report "0 products". Awaiting them in sequence makes that go away.
 *
 * A Supabase query builder is lazy: it is a thenable that only issues the
 * request when awaited. So building the array here starts nothing, and this
 * helper genuinely serialises the requests rather than just collecting
 * in-flight promises.
 *
 * Usage is a drop-in for the `Promise.all` destructuring it replaces:
 *
 *   const [a, b] = await sequential([queryA, queryB] as const)
 *
 * This is only for server-side Supabase calls. Ordinary browser `fetch()`
 * concurrency is unaffected by that problem and should keep using Promise.all.
 */
export async function sequential<T extends readonly unknown[]>(
  thenables: readonly [...{ [K in keyof T]: PromiseLike<T[K]> }]
): Promise<T> {
  const results: unknown[] = []
  for (const thenable of thenables) {
    results.push(await thenable)
  }
  return results as unknown as T
}
