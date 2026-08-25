import { createClient } from '@supabase/supabase-js'
import { rowToEntry, type IndexEntry } from '@/lib/index-scan'
import { hasDatabaseUrl, query } from '@/lib/db'
import { categoryMeta, categorySlugFor, type CategoryMeta } from '@/lib/categories'

/**
 * The published AI Visibility Index.
 *
 * Reads from the self-hosted Postgres when DATABASE_URL is set, and otherwise
 * falls back to Supabase. Keeping both paths means the switchover can be rolled
 * back by unsetting one environment variable rather than by redeploying code.
 */

const COLUMNS = `company, industry, score, label, mentions, scored_prompts,
  discovery_prompts, discovery_mentions, top_competitor, top_competitor_mentions,
  competitor_breakdown, missed_prompts, errored_prompts, engines, status, scanned_at`

/**
 * Legacy path. Public pages read with the anon key rather than the service role,
 * so the "completed rows are public" RLS policy is what enforces visibility.
 */
function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase public credentials')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Loads the published index. Reads completed rows only, so a company that has
 * been added but not yet scanned never appears on the site.
 *
 * Returns an empty list rather than throwing when the table is missing or the
 * database is unreachable: a public marketing page should degrade to hiding the
 * index, not to a 500.
 */
export async function getPublishedIndex(): Promise<IndexEntry[]> {
  try {
    if (hasDatabaseUrl()) {
      // No user context needed: completed index rows are public by definition,
      // which is the whole reason this is the first table to move.
      const rows = await query(
        `SELECT ${COLUMNS} FROM public.index_entries
         WHERE status = 'completed'
         ORDER BY score DESC`
      )
      return rows.map(rowToEntry)
    }

    const { data, error } = await publicClient()
      .from('index_entries')
      .select(COLUMNS.replace(/\s+/g, ' '))
      .eq('status', 'completed')
      .order('score', { ascending: false })

    if (error) {
      console.error('getPublishedIndex error:', error.message)
      return []
    }
    return (data || []).map(rowToEntry)
  } catch (err) {
    console.error('getPublishedIndex failed:', err)
    return []
  }
}

/** A category as it appears on the index: its metadata plus the shape of its table. */
export interface CategorySummary {
  meta: CategoryMeta
  entries: number
  averageScore: number
  /** Entries scoring under 26 — the "effectively invisible" band. */
  invisible: number
  /** Highest scorer, which is the only brand safe to name in a post. */
  leader: string | null
  leaderScore: number
  /** Most recent scan across the category. */
  scannedAt: string
}

/**
 * Group the published index by category.
 *
 * Grouping happens here rather than in SQL because the slug rules live in
 * `categories.ts`, and splitting that logic across a query string is how the
 * URL and the page stop agreeing about what a category is. The index is tens of
 * rows, so one query and an in-memory group is cheaper than the alternative.
 */
export async function getIndexCategories(): Promise<CategorySummary[]> {
  const entries = await getPublishedIndex()
  const groups = new Map<string, IndexEntry[]>()

  for (const entry of entries) {
    const slug = categorySlugFor(entry.industry)
    const bucket = groups.get(slug)
    if (bucket) bucket.push(entry)
    else groups.set(slug, [entry])
  }

  const summaries: CategorySummary[] = []
  // Array.from rather than iterating the Map directly: the tsconfig target
  // predates downlevel iteration.
  for (const [slug, rows] of Array.from(groups.entries())) {
    const sorted = [...rows].sort((a, b) => b.score - a.score)
    summaries.push({
      meta: categoryMeta(slug, sorted[0]?.industry),
      entries: sorted.length,
      averageScore: Math.round(sorted.reduce((s, e) => s + e.score, 0) / sorted.length),
      invisible: sorted.filter((e) => e.score < 26).length,
      leader: sorted[0]?.company ?? null,
      leaderScore: sorted[0]?.score ?? 0,
      scannedAt: new Date(
        Math.max(...sorted.map((e) => new Date(e.scannedAt).getTime()))
      ).toISOString(),
    })
  }

  // Most-populated first: a category with fifteen brands is a leaderboard, one
  // with two is a placeholder, and the index should not present them as equals.
  return summaries.sort((a, b) => b.entries - a.entries || a.meta.name.localeCompare(b.meta.name))
}

/**
 * One category's leaderboard, ranked. Empty when the slug has no completed
 * scans, which the page turns into a 404 rather than an empty table — an empty
 * leaderboard indexed by Google is worse than no page at all.
 */
export async function getCategoryEntries(slug: string): Promise<IndexEntry[]> {
  const entries = await getPublishedIndex()
  return entries
    .filter((e) => categorySlugFor(e.industry) === slug)
    .sort((a, b) => b.score - a.score)
}
