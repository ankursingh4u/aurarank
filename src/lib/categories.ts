/**
 * Categories for the AI Visibility Index.
 *
 * `index_entries.industry` is free text typed by an admin ("CRM software",
 * "crm", "CRM Software"). The public URL cannot inherit that inconsistency, so
 * every industry string is resolved to a slug here and nowhere else.
 *
 * Two rules make the weekly rhythm cheap:
 *
 *  1. A category listed in CATEGORIES gets editorial copy — the buyer question
 *     the scan actually asked, and a one-line reason the category is worth
 *     reading. That copy is what makes the page quotable by a model rather than
 *     just another table.
 *  2. A category *not* listed still gets a working page, with a title derived
 *     from the industry string. Publishing a new category is therefore a scan,
 *     not a deploy. Add the editorial copy later if the category sticks.
 */

export interface CategoryMeta {
  slug: string
  /** Display name, title case. */
  name: string
  /** The neutral question a buyer asks — printed on the page as the method line. */
  buyerQuestion: string
  /** One sentence on why this category is worth reading. Empty for derived ones. */
  angle: string
  /** Industry strings, normalised, that resolve to this slug. */
  aliases: string[]
  /** True when the category has hand-written copy rather than derived defaults. */
  curated: boolean
}

/** Lowercase, strip punctuation, collapse whitespace. The comparison key for industries. */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** URL-safe slug. Stable across capitalisation and punctuation changes in the source string. */
export function slugify(value: string): string {
  return normalise(value).replace(/\s+/g, '-')
}

/**
 * The six launch categories, in the order the weekly rhythm publishes them:
 * highest-intent buyers first.
 */
const CURATED: Omit<CategoryMeta, 'curated'>[] = [
  {
    slug: 'crm',
    name: 'CRM Software',
    buyerQuestion: 'best CRM software for small business',
    angle:
      'CRM is the most contested category in B2B SaaS and the one where buyers most often ask an assistant before they ask a colleague.',
    aliases: ['crm', 'crm software', 'crm platform', 'customer relationship management'],
  },
  {
    slug: 'project-management',
    name: 'Project Management Software',
    buyerQuestion: 'best project management software for teams',
    angle:
      'Dozens of near-identical tools compete here, so which ones an assistant names looks arbitrary from the buyer’s side — and is entirely decided by retrieval.',
    aliases: [
      'project management',
      'project management software',
      'project management tools',
      'issue tracking',
      'issue tracking tools',
      'issue tracking software',
      'task management',
    ],
  },
  {
    slug: 'email-marketing',
    name: 'Email Marketing Software',
    buyerQuestion: 'best email marketing software',
    angle:
      'A category with enormous affiliate content behind it, which makes the gap between who ranks on Google and who gets named by an assistant unusually wide.',
    aliases: [
      'email marketing',
      'email marketing software',
      'email marketing platform',
      'newsletter software',
      'esp',
    ],
  },
  {
    slug: 'helpdesk',
    name: 'Helpdesk Software',
    buyerQuestion: 'best helpdesk software for customer support',
    angle:
      'Support tooling is bought late and switched rarely, so an assistant naming the wrong three vendors shapes a shortlist that lasts years.',
    aliases: [
      'helpdesk',
      'help desk',
      'helpdesk software',
      'help desk software',
      'customer support software',
      'ticketing software',
    ],
  },
  {
    slug: 'ecommerce-platforms',
    name: 'E-commerce Platforms',
    buyerQuestion: 'best ecommerce platform to sell online',
    angle:
      'The head of this category is owned by two names, which makes everything below them a pure retrieval fight.',
    aliases: [
      'ecommerce',
      'e commerce',
      'ecommerce platform',
      'e commerce platform',
      'ecommerce platforms',
      'e commerce platforms',
      'online store builder',
    ],
  },
  {
    slug: 'accounting',
    name: 'Accounting Software',
    buyerQuestion: 'best accounting software for small business',
    angle:
      'Buyers here ask for a recommendation and act on it immediately, because the switching cost of getting it wrong is felt at tax time.',
    aliases: [
      'accounting',
      'accounting software',
      'bookkeeping',
      'bookkeeping software',
      'invoicing software',
    ],
  },
]

export const CATEGORIES: CategoryMeta[] = CURATED.map((c) => ({ ...c, curated: true }))

/** Slug → curated metadata. Built once. */
const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]))

/** Normalised alias → slug. Built once. */
const BY_ALIAS = new Map<string, string>()
for (const c of CATEGORIES) {
  BY_ALIAS.set(normalise(c.name), c.slug)
  for (const alias of c.aliases) BY_ALIAS.set(normalise(alias), c.slug)
}

/**
 * Resolve an `index_entries.industry` value to a category slug.
 *
 * Falls back to the slugified industry, so an unrecognised industry groups with
 * other rows spelled the same way rather than vanishing from the site.
 */
export function categorySlugFor(industry: string): string {
  const key = normalise(industry)
  return BY_ALIAS.get(key) ?? slugify(industry)
}

/**
 * A display name lowered for use mid-sentence, without flattening acronyms.
 *
 * `"CRM Software".toLowerCase()` gives "crm software", which is what the page
 * headline read before this existed. A word that was already all-caps is a
 * name, not a capitalised ordinary word, so it is left alone.
 */
export function sentenceCaseName(name: string): string {
  return name
    .split(' ')
    .map((w) => (/^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(' ')
}

/** Title Case, used to name categories that have no curated entry. */
function titleCase(value: string): string {
  return normalise(value)
    .split(' ')
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

/**
 * Metadata for a slug. Returns derived defaults for any slug with no curated
 * entry, using a sample industry string when one is available — a category page
 * must never depend on a code change having happened first.
 */
export function categoryMeta(slug: string, sampleIndustry?: string): CategoryMeta {
  const curated = BY_SLUG.get(slug)
  if (curated) return curated

  const name = titleCase(sampleIndustry ?? slug.replace(/-/g, ' '))
  return {
    slug,
    name,
    buyerQuestion: `best ${sentenceCaseName(name)}`,
    angle: '',
    aliases: [],
    curated: false,
  }
}
