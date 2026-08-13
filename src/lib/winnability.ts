/**
 * Winnability classification.
 *
 * We can always tell a customer which pages an AI read. We cannot promise that
 * the owner of a given page will agree to list them. So every missed query is
 * graded by how open its retrieved set actually is, and that grade is shown at
 * scan time rather than discovered after the invoice.
 */

/**
 * Sources where a brand can create its own listing without anyone's approval.
 * A single one of these in the retrieved set makes a query workable, because
 * there is at least one page the customer can get onto by themselves.
 */
const SELF_SERVE = [
  'g2.com',
  'capterra.com',
  'getapp.com',
  'softwareadvice.com',
  'trustradius.com',
  'producthunt.com',
  'alternativeto.net',
  'saashub.com',
  'slant.co',
  'stackshare.io',
  'sourceforge.net',
  'crunchbase.com',
  'clutch.co',
  'goodfirms.co',
  'trustpilot.com',
  'yelp.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'dev.to',
  'linkedin.com',
  'youtube.com',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
]

/**
 * Large editorial publishers. Getting listed means pitching a staff writer, so
 * it is possible but slow and usually paid. Present but not decisive.
 */
const EDITORIAL = [
  'forbes.com',
  'techradar.com',
  'pcmag.com',
  'cnet.com',
  'zdnet.com',
  'wired.com',
  'businessinsider.com',
  'techcrunch.com',
  'theverge.com',
  'nytimes.com',
  'wsj.com',
  'entrepreneur.com',
  'inc.com',
  'fastcompany.com',
  'venturebeat.com',
  'gartner.com',
  'forrester.com',
]

export type Winnability = 'winnable' | 'hard' | 'locked'

export interface WinnabilityVerdict {
  class: Winnability
  /** One sentence a customer can act on, written for display as-is. */
  reason: string
  /** Cited domains a customer can list themselves on. */
  selfServe: string[]
  /** Cited domains owned by a competitor being scanned. */
  competitorOwned: string[]
}

function normalize(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, '')
}

function matches(host: string, list: string[]): boolean {
  const h = normalize(host)
  return list.some((d) => h === d || h.endsWith(`.${d}`))
}

/**
 * A cited domain is treated as competitor-owned when it contains a scanned
 * competitor's name. Rival-owned pages never list the customer, so they are
 * dead weight in the retrieved set no matter how well they rank.
 */
function competitorDomains(citations: string[], competitors: string[]): string[] {
  const slugs = competitors
    .map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((s) => s.length >= 4)
  return citations.filter((host) => {
    const bare = normalize(host).split('.')[0].replace(/[^a-z0-9]/g, '')
    return slugs.some((s) => bare === s || bare.includes(s))
  })
}

/** Below this, the retrieved set is thin enough that a good page can enter it. */
const THIN_SET = 4

export function classifyWinnability(
  citations: string[],
  competitors: string[] = []
): WinnabilityVerdict {
  const hosts = Array.from(new Set(citations.map(normalize))).filter(Boolean)
  const selfServe = hosts.filter((h) => matches(h, SELF_SERVE))
  const competitorOwned = competitorDomains(hosts, competitors)

  // No citations means the answer came from the model's own memory rather than
  // from pages. There is nothing to get listed on, so nothing to sell.
  if (hosts.length === 0) {
    return {
      class: 'locked',
      reason:
        'The AI answered from memory without reading any pages, so there is nothing to get listed on for this question yet.',
      selfServe: [],
      competitorOwned: [],
    }
  }

  if (selfServe.length > 0) {
    return {
      class: 'winnable',
      reason: `The AI read ${selfServe.length} source${
        selfServe.length > 1 ? 's' : ''
      } you can list yourself on (${selfServe.slice(0, 3).join(', ')}). Start there.`,
      selfServe,
      competitorOwned,
    }
  }

  const openHosts = hosts.filter(
    (h) => !matches(h, EDITORIAL) && !competitorOwned.includes(h)
  )

  if (hosts.length < THIN_SET) {
    return {
      class: 'winnable',
      reason: `Only ${hosts.length} source${
        hosts.length > 1 ? 's were' : ' was'
      } read for this question, so a single strong page of your own can enter the set.`,
      selfServe,
      competitorOwned,
    }
  }

  if (openHosts.length === 0) {
    return {
      class: 'locked',
      reason:
        'Every source is a major publication or a competitor-owned page. Outreach here rarely converts, so spend the effort elsewhere.',
      selfServe,
      competitorOwned,
    }
  }

  return {
    class: 'hard',
    reason: `${openHosts.length} of ${hosts.length} sources are independent sites that accept pitches. Possible, but it is outreach work rather than a form you fill in.`,
    selfServe,
    competitorOwned,
  }
}

/** Roll per-query verdicts into the headline split shown on a scan. */
export function summarizeWinnability(verdicts: Winnability[]) {
  return {
    winnable: verdicts.filter((v) => v === 'winnable').length,
    hard: verdicts.filter((v) => v === 'hard').length,
    locked: verdicts.filter((v) => v === 'locked').length,
  }
}
