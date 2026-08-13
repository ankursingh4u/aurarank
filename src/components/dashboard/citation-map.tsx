'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { Winnability } from '@/lib/winnability'

/**
 * The citation map: which pages an AI actually read to answer a question, and
 * which of them name a competitor instead of the customer.
 *
 * This is the product. A score tells a brand it is losing; this tells it the
 * specific pages to go and get listed on, which is the only part of the work
 * that is genuinely actionable.
 */

const ENGINE_LABEL: Record<string, string> = {
  openai: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

const WINNABILITY_STYLE: Record<Winnability, { label: string; className: string; blurb: string }> = {
  winnable: {
    label: 'Winnable',
    className: 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-600/20',
    blurb: 'Work on this one.',
  },
  hard: {
    label: 'Hard',
    className: 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-600/20',
    blurb: 'Possible, but it is outreach.',
  },
  locked: {
    label: 'Locked',
    className: 'bg-stone-500/15 text-stone-600 ring-1 ring-stone-500/20',
    blurb: 'Do not spend money here.',
  },
}

export function WinnabilityChip({ value }: { value: Winnability }) {
  const s = WINNABILITY_STYLE[value]
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.className}`}
      title={s.blurb}
    >
      {s.label}
    </span>
  )
}

/** Headline split shown above the missed-search list. */
export function WinnabilitySummary({
  split,
}: {
  split: { winnable: number; hard: number; locked: number }
}) {
  const total = split.winnable + split.hard + split.locked
  if (total === 0) return null

  const parts = [
    { key: 'winnable' as const, n: split.winnable, bar: 'bg-emerald-500' },
    { key: 'hard' as const, n: split.hard, bar: 'bg-amber-500' },
    { key: 'locked' as const, n: split.locked, bar: 'bg-stone-400' },
  ].filter((p) => p.n > 0)

  return (
    <div className="rounded-lg bg-stone-100 px-3 py-2.5 mb-3">
      <p className="text-xs text-stone-700">
        Of {total} question{total === 1 ? '' : 's'} we graded,{' '}
        <span className="font-semibold text-emerald-700">{split.winnable} can realistically be won</span>
        {split.hard > 0 && <>, {split.hard} would take sustained outreach</>}
        {split.locked > 0 && <>, and {split.locked} are held by pages that will not list you</>}.
      </p>
      <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {parts.map((p) => (
          <div key={p.key} className={p.bar} style={{ flex: p.n }} />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-stone-500">
        We can always tell you which pages the AI read. We cannot promise their owners will list you,
        so the ones worth your time are marked before you spend any.
      </p>
    </div>
  )
}

export function CitationMap({
  citations,
  citationsByEngine,
  brandName,
  competitorsFound,
}: {
  citations: string[]
  citationsByEngine?: Record<string, string[]>
  brandName: string
  competitorsFound: string[]
}) {
  const engines = Object.keys(citationsByEngine || {}).filter(
    (k) => (citationsByEngine?.[k]?.length ?? 0) > 0
  )
  // Default to the merged view; per-engine matters because the engines overlap
  // far less than people expect, so a brand can win on one and be absent on another.
  const [view, setView] = useState<string>('all')
  const [open, setOpen] = useState(false)

  if (!citations || citations.length === 0) return null

  const shown = view === 'all' ? citations : citationsByEngine?.[view] || []

  return (
    <div className="mt-2 rounded-lg border border-stone-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[11px] font-medium text-stone-700 transition-colors hover:text-stone-900"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        The AI read {citations.length} page{citations.length === 1 ? '' : 's'} to answer this
        <span className="ml-auto font-normal text-stone-400">
          {brandName} on 0 of them
        </span>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-3 pb-3 pt-2">
          {engines.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1">
              <EngineTab active={view === 'all'} onClick={() => setView('all')} label="All" count={citations.length} />
              {engines.map((e) => (
                <EngineTab
                  key={e}
                  active={view === e}
                  onClick={() => setView(e)}
                  label={ENGINE_LABEL[e] || e}
                  count={citationsByEngine?.[e]?.length ?? 0}
                />
              ))}
            </div>
          )}

          <ul className="space-y-1">
            {shown.map((domain) => (
              <li key={domain} className="flex items-center gap-2 text-[11px]">
                <ExternalLink className="h-3 w-3 shrink-0 text-stone-300" />
                <span className="font-mono text-stone-700">{domain}</span>
              </li>
            ))}
          </ul>

          {competitorsFound.length > 0 && (
            <p className="mt-2.5 border-t border-stone-100 pt-2 text-[10px] leading-relaxed text-stone-500">
              These pages are where {competitorsFound.slice(0, 2).join(' and ')}
              {competitorsFound.length > 2 && ` and ${competitorsFound.length - 2} more`} got named and
              you did not. Getting onto them is the work.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EngineTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
        active
          ? 'bg-stone-900 text-white'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  )
}
