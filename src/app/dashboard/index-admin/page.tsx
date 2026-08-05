'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Play, Plus, Trash2, ExternalLink, AlertCircle, RefreshCw, Download } from 'lucide-react'

interface AdminEntry {
  company: string
  industry: string
  competitors: string[]
  score: number
  label: string
  discoveryPrompts: number
  discoveryMentions: number
  topCompetitor: string | null
  topCompetitorMentions: number
  erroredPrompts: number
  scannedAt: string
  status: string
  errorMessage: string | null
}

function statusStyles(status: string) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (status === 'running') return 'bg-violet-50 text-violet-700 ring-violet-600/20'
  if (status === 'failed') return 'bg-red-50 text-red-700 ring-red-600/20'
  return 'bg-stone-100 text-stone-600 ring-stone-400/20'
}

function scoreStyles(score: number) {
  if (score >= 66) return 'text-emerald-700'
  if (score >= 26) return 'text-amber-700'
  return 'text-red-700'
}

export default function IndexAdminPage() {
  const [entries, setEntries] = useState<AdminEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const [company, setCompany] = useState('')
  const [industry, setIndustry] = useState('')
  const [competitors, setCompetitors] = useState('')
  const [adding, setAdding] = useState(false)

  // Company currently being scanned, so the UI can disable the other buttons.
  const [scanning, setScanning] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/index')
      if (res.status === 401) {
        setForbidden(true)
        return
      }
      const data = await res.json()
      setEntries(data.entries || [])
    } catch {
      toast.error('Could not load the index')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addCompany(e: React.FormEvent) {
    e.preventDefault()
    const list = competitors
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
    if (!company.trim() || !industry.trim() || list.length === 0) {
      toast.error('Fill in the company, industry and at least one competitor')
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/admin/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), industry: industry.trim(), competitors: list }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add company')
      toast.success(`${company.trim()} added. Run a scan to score it.`)
      setCompany('')
      setIndustry('')
      setCompetitors('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add company')
    } finally {
      setAdding(false)
    }
  }

  async function scanOne(name: string) {
    setScanning(name)
    try {
      const res = await fetch('/api/admin/index/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      toast.success(
        `${data.company}: ${data.score}/100 · named in ${data.discoveryMentions}/${data.discoveryPrompts}`
      )
      await load()
      return true
    } catch (err) {
      toast.error(`${name}: ${err instanceof Error ? err.message : 'scan failed'}`)
      await load()
      return false
    } finally {
      setScanning(null)
    }
  }

  /**
   * Scans run one company per request because a single scan takes 60-90s. The
   * queue is walked here rather than server-side so each company's result lands
   * as soon as it finishes instead of after the whole batch.
   */
  async function scanMany(names: string[]) {
    setQueue(names)
    for (const name of names) {
      await scanOne(name)
      setQueue((q) => q.filter((n) => n !== name))
    }
    setQueue([])
  }

  async function importSeed() {
    setImporting(true)
    try {
      const res = await fetch('/api/admin/index/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      toast.success(
        data.imported > 0
          ? `Imported ${data.imported} companies with their existing scores`
          : 'Nothing new to import, everything is already in the index'
      )
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function removeCompany(name: string) {
    if (!confirm(`Remove ${name} from the public index?`)) return
    try {
      const res = await fetch(`/api/admin/index?company=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success(`${name} removed`)
      await load()
    } catch {
      toast.error('Failed to remove company')
    }
  }

  const busy = scanning !== null
  const unscanned = entries.filter((e) => e.status !== 'completed').map((e) => e.company)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading index…
      </div>
    )
  }

  if (forbidden) {
    return (
      <Card className="bg-white border-stone-200 p-8 max-w-lg mx-auto mt-12 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
        <h1 className="mt-4 text-lg font-semibold text-stone-900">Admin access required</h1>
        <p className="mt-2 text-sm text-stone-600">
          Add your account email to the <code className="text-xs bg-stone-100 px-1 py-0.5 rounded">ADMIN_EMAILS</code>{' '}
          environment variable, then reload this page.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">AI Visibility Index</h1>
          <p className="mt-1 text-sm text-stone-500">
            {entries.length} companies · changes appear on the public page within a few minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={load}
            disabled={busy}
            className="border-stone-200 text-stone-600 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Link href="/index" target="_blank">
            <Button variant="outline" className="border-stone-200 text-stone-600 gap-1.5">
              View public page <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Add a company */}
      <Card className="bg-white border-stone-200 p-5">
        <h2 className="text-sm font-semibold text-stone-900">Add a company</h2>
        <p className="mt-1 text-xs text-stone-500">
          Use a plain category for the industry, like &ldquo;CRM software&rdquo; or &ldquo;issue
          tracking software&rdquo;. Competitors are comma separated.
        </p>
        <form onSubmit={addCompany} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.2fr_1.6fr_auto]">
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="bg-white border-stone-300 h-10 text-sm"
          />
          <Input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Industry (e.g. CRM software)"
            className="bg-white border-stone-300 h-10 text-sm"
          />
          <Input
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            placeholder="Competitors, comma separated"
            className="bg-white border-stone-300 h-10 text-sm"
          />
          <Button
            type="submit"
            disabled={adding || busy}
            className="bg-violet-700 hover:bg-violet-800 text-white h-10 gap-1.5"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </form>
      </Card>

      {/* Bulk actions */}
      {entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => scanMany(unscanned)}
            disabled={busy || unscanned.length === 0}
            className="bg-violet-700 hover:bg-violet-800 text-white gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Scan {unscanned.length} unscanned
          </Button>
          <Button
            variant="outline"
            onClick={() => scanMany(entries.map((e) => e.company))}
            disabled={busy}
            className="border-stone-200 text-stone-600 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-scan all {entries.length}
          </Button>
          {busy && (
            <span className="text-xs text-stone-500 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Scanning {scanning}
              {queue.length > 1 ? ` · ${queue.length - 1} queued` : ''} · about 60-90s each, keep
              this tab open
            </span>
          )}
        </div>
      )}

      {/* Entries */}
      <Card className="bg-white border-stone-200 overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm text-stone-500">Nothing in the index yet.</p>
            <p className="mt-1 text-sm text-stone-500">
              Import the ten companies already scanned, or add your own above.
            </p>
            <Button
              onClick={importSeed}
              disabled={importing}
              className="mt-5 bg-violet-700 hover:bg-violet-800 text-white gap-1.5"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Import existing results
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70">
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Company</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Score</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Named in</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Top competitor</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.company} className="border-b border-stone-100 last:border-0">
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{e.company}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{e.industry}</div>
                      {e.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">{e.errorMessage}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles(
                          scanning === e.company ? 'running' : e.status
                        )}`}
                      >
                        {scanning === e.company ? 'scanning…' : e.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm font-semibold tabular-nums ${scoreStyles(e.score)}`}>
                      {e.status === 'completed' ? e.score : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-700 tabular-nums">
                      {e.status === 'completed' ? `${e.discoveryMentions}/${e.discoveryPrompts}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      {e.status === 'completed' && e.topCompetitor
                        ? `${e.topCompetitor} ${e.topCompetitorMentions}/${e.discoveryPrompts}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => scanOne(e.company)}
                          disabled={busy}
                          className="border-stone-200 text-stone-600 h-8 text-xs px-2.5 gap-1"
                        >
                          {scanning === e.company ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          {e.status === 'completed' ? 'Re-scan' : 'Scan'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => removeCompany(e.company)}
                          disabled={busy}
                          className="border-stone-200 text-stone-400 hover:text-red-600 h-8 text-xs px-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
