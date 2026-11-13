/**
 * Layout helpers for the TripletButton pathway grid (kept free of React and CSS so they
 * can be unit-tested directly).
 */

/** Number of pathway columns on wide screens. */
export type TripletColumns = 1 | 2 | 3 | 4;

/** True for absolute http(s) URLs, which open in a new tab. */
export function isExternalHref(href?: string): boolean {
  return Boolean(href && /^https?:\/\//i.test(href.trim()));
}

/**
 * Which edge of the grid a card sits on, so its hover card can anchor inward instead of
 * overflowing the viewport: first column "start", last column "end".
 */
export function columnEdge(column: number | undefined, columns: TripletColumns): "start" | "end" | "middle" {
  if (!column || columns === 1) return "middle";
  const position = ((column - 1) % columns) + 1;
  if (position === 1) return "start";
  if (position === columns) return "end";
  return "middle";
}
