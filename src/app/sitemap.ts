import { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/site'
import { getIndexCategories } from '@/lib/index-data'

// Category leaderboards appear as they are scanned, so the sitemap has to be
// re-read rather than frozen at build time. Matches the pages' own revalidate.
export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicSiteUrl()

  // Degrades to an empty list when the database is unreachable: a sitemap
  // missing its category pages is recoverable, a failed sitemap is not.
  const categories = await getIndexCategories()

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/ai-visibility-index`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((c) => ({
      url: `${baseUrl}/ai-visibility-index/${c.meta.slug}`,
      lastModified: new Date(c.scannedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/blog/chatgpt-saas-recommendations-study`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/blog/how-to-rank-on-chatgpt`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/blog/ai-seo-guide`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/blog/chatgpt-vs-google`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), priority: 0.7 },
  ]
}
