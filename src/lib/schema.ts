/**
 * schema.org builders.
 *
 * Structured data is the cheapest way to make a page machine-readable for AI
 * answer engines: a retrieval-time fetcher can lift a fact out of JSON-LD without
 * rendering or guessing at the layout. Every builder here must describe content
 * that is actually visible on the page — schema that claims more than the page
 * shows is both a search-engine policy violation and the exact dishonesty this
 * product exists to measure.
 */
import { absoluteUrl, getPublicSiteUrl, SITE_NAME } from '@/lib/site'

const LOGO = () => absoluteUrl('/logo.png')

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${getPublicSiteUrl()}/#organization`,
    name: SITE_NAME,
    url: getPublicSiteUrl(),
    logo: LOGO(),
    description:
      'SEO4AI measures whether AI assistants such as ChatGPT, Gemini and Claude recommend a brand, and shows which competitors they name instead.',
    email: 'support@seo4ai.app',
  }
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${getPublicSiteUrl()}/#website`,
    name: SITE_NAME,
    url: getPublicSiteUrl(),
    publisher: { '@id': `${getPublicSiteUrl()}/#organization` },
  }
}

/**
 * Describes the product itself. Prices mirror src/lib/payment.ts — if the plans
 * change there, change them here too, because a stale price in structured data
 * is what an AI will quote back to a prospect.
 */
export function softwareApplicationSchema() {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${getPublicSiteUrl()}/#software`,
    name: SITE_NAME,
    url: getPublicSiteUrl(),
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Generative Engine Optimization (GEO) / AI visibility monitoring',
    operatingSystem: 'Web',
    description:
      'Scores how often AI assistants name your brand for the buying questions your customers ask, tracks the competitors named instead, and generates the content and outreach needed to close the gap.',
    publisher: { '@id': `${getPublicSiteUrl()}/#organization` },
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '24.99', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Max', price: '49.99', priceCurrency: 'USD' },
    ],
  }
}

export interface ArticleInput {
  headline: string
  description: string
  slug: string
  /** ISO date the post first went live. */
  datePublished: string
  /** ISO date of the last substantive edit; defaults to datePublished. */
  dateModified?: string
}

export function articleSchema(a: ArticleInput) {
  const url = absoluteUrl(`/blog/${a.slug}`)
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: a.headline,
    description: a.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: a.datePublished,
    dateModified: a.dateModified || a.datePublished,
    author: { '@id': `${getPublicSiteUrl()}/#organization` },
    publisher: { '@id': `${getPublicSiteUrl()}/#organization` },
    isPartOf: { '@id': `${getPublicSiteUrl()}/#website` },
  }
}

export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  }
}

export interface FaqItem {
  question: string
  answer: string
}

/** Only ever call this with Q&A pairs rendered visibly on the same page. */
export function faqSchema(items: FaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

/** Wraps one or more node builders into a single @graph document. */
export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
