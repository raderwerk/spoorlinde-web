/** GitHub Pages project base, always with a trailing slash. */
export function siteBase(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith("/") ? base : `${base}/`;
}

export function sitePath(path = ""): string {
  return siteBase() + path.replace(/^\//, "");
}
