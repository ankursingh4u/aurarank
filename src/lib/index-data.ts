import { createClient } from '@supabase/supabase-js'
import { rowToEntry, type IndexEntry } from '@/lib/index-scan'
import { hasDatabaseUrl, query } from '@/lib/db'

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
