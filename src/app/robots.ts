import { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/site'

/**
 * AI answer engines are the audience this product is about, so they are allowed
 * explicitly rather than only by the wildcard rule. Two distinct kinds of agent
 * matter and both need access:
 *   - training / index crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot)
 *   - live retrieval fetchers that run at answer time (OAI-SearchBot,
 *     ChatGPT-User, PerplexityBot) — these are what let a brand new site get
 *     cited before it has ever entered a training set.
 * Being named here also means a future wildcard tightening cannot silently lock
 * them out.
 */
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'cohere-ai',
  'YouBot',
]

const DISALLOW = ['/dashboard/', '/api/', '/auth/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${getPublicSiteUrl()}/sitemap.xml`,
    host: getPublicSiteUrl(),
  }
}
