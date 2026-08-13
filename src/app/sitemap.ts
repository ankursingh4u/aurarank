import { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicSiteUrl()
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/ai-visibility-index`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/blog/chatgpt-saas-recommendations-study`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/blog/how-to-rank-on-chatgpt`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/blog/ai-seo-guide`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/blog/chatgpt-vs-google`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), priority: 0.7 },
  ]
}
