/**
 * Navigation helpers for Admin layouts.
 */

export function shouldHideBorderFrame(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/admin");
}
