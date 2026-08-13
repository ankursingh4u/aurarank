import { queryEnginesAndAnalyze } from '@/lib/engines'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Rate limiting: 3 scans per IP per day, 10 min cooldown between scans
const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes
const DAILY_LIMIT = 3
const rateLimitMap = new Map<string, { lastScan: number; dailyCount: number; dayStart: number }>()

// Global daily budget cap - stop all free scans if exceeded
const DAILY_BUDGET = { count: 0, dayStart: 0, limit: 200 }

function checkRateLimit(ip: string): string | null {
  const now = Date.now()
  const today = Math.floor(now / 86400000)

  // Global budget check
  if (DAILY_BUDGET.dayStart !== today) {
    DAILY_BUDGET.count = 0
    DAILY_BUDGET.dayStart = today
  }
  if (DAILY_BUDGET.count >= DAILY_BUDGET.limit) {
    return 'Free scans are temporarily unavailable. Please sign up for unlimited access.'
  }

  // Per-IP check
  const entry = rateLimitMap.get(ip)
  if (entry) {
    const entryDay = Math.floor(entry.dayStart / 86400000)
    if (entryDay === today) {
      if (entry.dailyCount >= DAILY_LIMIT) {
        return `Daily limit reached (${DAILY_LIMIT} free scans/day). Sign up for more.`
      }
      if (now - entry.lastScan < COOLDOWN_MS) {
        const waitMin = Math.ceil((COOLDOWN_MS - (now - entry.lastScan)) / 60000)
        return `Please wait ${waitMin} minute${waitMin > 1 ? 's' : ''} before scanning again.`
      }
    }
  }

  return null
}

function recordScan(ip: string) {
  const now = Date.now()
  const today = Math.floor(now / 86400000)
  DAILY_BUDGET.count++

  const entry = rateLimitMap.get(ip)
  const entryDay = entry ? Math.floor(entry.dayStart / 86400000) : -1

  if (entry && entryDay === today) {
    entry.lastScan = now
    entry.dailyCount++
  } else {
    rateLimitMap.set(ip, { lastScan: now, dailyCount: 1, dayStart: now })
  }

  // Cleanup old entries every 100 scans
  if (DAILY_BUDGET.count % 100 === 0) {
    const cutoff = now - 86400000
    rateLimitMap.forEach((val, key) => {
      if (val.lastScan < cutoff) rateLimitMap.delete(key)
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { brandName, industry } = await request.json()
    if (!brandName || !industry) {
      return NextResponse.json({ error: 'brandName and industry are required' }, { status: 400 })
    }

    // Validate input lengths
    if (brandName.length > 100 || industry.length > 100) {
      return NextResponse.json({ error: 'Input too long' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    const rateLimitError = checkRateLimit(ip)
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 })
    }

    recordScan(ip)

    // Discovery prompts only: no brand-echo questions, which inflate scores.
    //
    // Six rather than three. Generic head terms alone are a badly skewed sample:
    // Linear is genuinely named in half of a twenty-question scan, yet appears
    // in none of the three broadest ones, so a three-question scan reported it
    // as invisible. Mixing head terms with buyer-intent and comparison phrasing
    // gives a result that survives someone checking it.
    const prompts = [
      `best ${industry} tools`,
      `top ${industry} companies`,
      `recommended ${industry} for small business`,
      `best ${industry} for startups`,
      `${industry} comparison`,
      `most popular ${industry}`,
    ]

    // Grounded, not parametric. Asking the model with no web access measures
    // what it absorbed in training, which is not what a visitor sees when they
    // ask ChatGPT the same question today. Measured 2026-08-13: Linear scored 0
    // parametrically and 44 grounded, so the parametric number would have told
    // a real brand it was invisible when it plainly is not.
    const results = await Promise.allSettled(
      prompts.map(async (prompt) => {
        const r = await queryEnginesAndAnalyze(prompt, ['openai'], brandName, [], 'grounded')
        return {
          prompt,
          brandMentioned: r.analysis.brandMentioned,
          citations: r.citations,
        }
      })
    )

    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ prompt: string; brandMentioned: boolean; citations: string[] }> => r.status === 'fulfilled')
      .map(r => r.value)

    const mentionCount = successful.filter(r => r.brandMentioned).length
    const totalPrompts = successful.length
    const score = totalPrompts > 0 ? Math.round((mentionCount / totalPrompts) * 100) : 0

    // The pages the AI read to answer, deduped across prompts. This is the part
    // a visitor cannot get anywhere else, and the part worth screenshotting.
    const sources = Array.from(new Set(successful.flatMap(r => r.citations)))

    return NextResponse.json({
      score,
      mentionCount,
      totalPrompts,
      sources,
      prompts: successful.map(r => ({
        prompt: r.prompt,
        mentioned: r.brandMentioned,
        sources: r.citations,
      })),
      // Claims are scoped to what was actually measured. "Invisible to AI search"
      // from a handful of questions is an overclaim, and the first person to ask
      // ChatGPT a different question can disprove it.
      message: mentionCount > 0
        ? `${brandName} was named in ${mentionCount} of ${totalPrompts} questions we tested, across ${sources.length} pages the AI read. A full scan runs 20+ questions and shows which pages name your competitors instead of you.`
        : `${brandName} was not named in any of the ${totalPrompts} questions we tested. The AI read ${sources.length} pages to answer them and none of those pages mentioned you. A full scan runs 20+ questions and shows which of those pages you can realistically get onto.`,
    })
  } catch (error) {
    console.error('Free scan error:', error)
    return NextResponse.json({ error: 'Scan failed. Please try again.' }, { status: 500 })
  }
}
