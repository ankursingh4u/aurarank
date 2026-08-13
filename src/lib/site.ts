/**
 * Canonical site identity.
 *
 * Every absolute URL the app emits resolves through here so there is exactly one
 * place that decides what domain SEO4AI lives on.
 */
export const CANONICAL_SITE_URL = 'https://seo4ai.app'

export const SITE_NAME = 'SEO4AI'

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i

/**
 * Base URL for links a human follows back into the app: checkout returns,
 * customer portal returns, auth callbacks, email links.
 *
 * Honors NEXT_PUBLIC_APP_URL as-is so local development keeps working.
 */
export function getAppUrl(): string {
  return normalize(process.env.NEXT_PUBLIC_APP_URL || CANONICAL_SITE_URL)
}

/**
 * Base URL for crawler-facing surfaces: sitemap, robots, canonical tags, OG
 * metadata and JSON-LD.
 *
 * Deliberately refuses to emit a localhost URL from a production build. A
 * production deploy that still carries the development NEXT_PUBLIC_APP_URL would
 * otherwise publish a sitemap of localhost links and point robots.txt at a host
 * no crawler can reach, which silently keeps the whole site out of both search
 * indexes and AI retrieval. Falling back to the canonical domain is always more
 * correct than publishing an unreachable one.
 */
export function getPublicSiteUrl(): string {
  const configured = normalize(process.env.NEXT_PUBLIC_APP_URL || '')
  if (!configured) return CANONICAL_SITE_URL
  if (process.env.NODE_ENV === 'production' && LOCAL_HOST.test(configured)) {
    return CANONICAL_SITE_URL
  }
  return configured
}

/** Absolute, crawler-safe URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return `${getPublicSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
