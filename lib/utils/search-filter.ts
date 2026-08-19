/**
 * Sanitise a user-supplied search term before it is interpolated into a
 * PostgREST `.or()` / `.ilike()` filter expression.
 *
 * PostgREST parses `.or()` as a comma-separated list of `column.op.value`
 * clauses, so a raw comma, dot, or parenthesis in the search box lets a user
 * reshape the filter (or simply break the query with a 400). This is not SQL
 * injection — PostgREST still parameterises the SQL — but it is untrusted
 * input steering the query, so strip the characters that carry meaning and
 * cap the length.
 */
export function sanitizeSearchTerm(term: string, maxLength = 100): string {
  return term
    .replace(/[,().*\\"']/g, ' ')
    .replace(/%/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}
