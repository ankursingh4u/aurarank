'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CitationMap, WinnabilityChip, WinnabilitySummary } from '@/components/dashboard/citation-map'
import type { Winnability } from '@/lib/winnability'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Eye, Scan, Target, Lightbulb, Plus, Loader2, X, TrendingUp,
  MapPin, Globe, ChevronDown, ChevronRight, CheckCircle2, Circle, Sparkles,
  Share2, Link as LinkIcon, Twitter, Trash2, TrendingDown, Minus, AlertCircle,
  ArrowRight, Info, Zap, Copy, ChevronUp, Pencil, Mail, Send,
  FileText, ExternalLink, Upload,
} from 'lucide-react'
import { getScoreLabel } from '@/lib/analyzer'

const INDUSTRIES = [
  'AI SEO', 'SaaS', 'Marketing', 'E-commerce', 'Fintech', 'EdTech',
  'HealthTech', 'Restaurant', 'Hotel', 'Real Estate', 'Fitness',
  'DevTools', 'Analytics', 'Cybersecurity', 'Retail', 'Travel',
]

interface BoostContent {
  faq: Array<{ question: string; answer: string }>
  brandBio: string
  keyFacts: string[]
  jsonLd: Record<string, unknown>
}

interface DashboardData {
  brands: Array<{ id: string; brand_name: string; industry: string; competitors: string[]; website: string | null; market_region?: { type: string; country?: string; state?: string; city?: string } }>
  selectedBrand: { id: string; brand_name: string; industry: string; competitors: string[]; market_region?: { type: string; country?: string; state?: string; city?: string } } | null
  latestScan: { id: string; visibility_score: number; mention_count: number; competitor_mention_count: number; scan_date: string } | null
  totalPrompts: number
  scanHistory: Array<{ scan_date: string; visibility_score: number; mention_count: number; competitor_mention_count: number }>
  competitorAnalysis: Array<{ competitor_name: string; mention_count: number; gap_score: number }>
  promptOpportunities: Array<{
    id: string
    prompt: string
    competitors_found: string[]
    opportunity_score: number
    ai_response?: string | null
    citations?: string[]
    citations_by_engine?: Record<string, string[]>
    winnability?: Winnability | null
    channel?: string
  }>
  winnabilitySplit?: { winnable: number; hard: number; locked: number } | null
  recommendations: Array<{ id: string; task_title: string; task_description: string | null; priority: string; impact_score: number; difficulty: string; completed: boolean; category: string }>
  industryBenchmark?: { avg: number; top10: number }
  competitorAlerts?: string[]
  hasNoBrands?: boolean
}

// The report route and /api/share decode with base64url, so plain btoa() is not
// safe here: its "+" and "/" characters corrupt the URL path and break the link.
function shareToken(scanId: string) {
  return btoa(scanId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function scoreColor(score: number) {
  if (score >= 66) return 'emerald'
  if (score >= 26) return 'amber'
  return 'red'
}

function ScoreRing({ score }: { score: number }) {
  const col = scoreColor(score)
  const color = col === 'emerald' ? '#10b981' : col === 'amber' ? '#f59e0b' : '#ef4444'
  const label = getScoreLabel(score)
  const circumference = 2 * Math.PI * 28
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r="28" stroke="#e7e5e4" strokeWidth="6" fill="none" />
        <circle
          cx="36" cy="36" r="28" stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-stone-900 leading-none">{score}</span>
        <span className="text-[8px] text-stone-500 mt-0.5">{label}</span>
      </div>
    </div>
  )
}

function BoostSection({ brandId, plan }: { brandId: string; plan: string }) {
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<BoostContent | null>(null)
  const [activeTab, setActiveTab] = useState<'faq' | 'bio' | 'facts' | 'schema'>('faq')
  const [copied, setCopied] = useState('')

  async function generate() {
    if (plan !== 'max') {
      toast.error('Upgrade to Max plan to generate AI Visibility Boost content')
      window.location.href = '/dashboard/billing'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed')
      }
      const { content: c } = await res.json()
      setContent(c)
      toast.success('Boost content generated! Add it to your website.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <Card className="bg-white border-violet-500/20 border">
      <CardHeader className="py-3">
        <CardTitle className="text-xs text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-violet-700" />
          <span className="text-violet-700">Boost My AI Score</span>
          <span className="text-stone-400 font-normal normal-case text-[10px]">·ready-made content to improve your next scan</span>
          {plan !== 'max' && <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] ml-1">Max Plan</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {!content ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              AI models learn from web content. We&apos;ll generate 4 types of content you can add to your website today, FAQ, brand bio, key facts, and schema markup. Expected result: <span className="text-violet-700">+15–25 points</span> on your next scan.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['FAQ Section (8–10 Q&As)', 'Brand Bio Paragraph', '10 Key Facts', 'JSON-LD Schema'].map((item, i) => (
                <div key={i} className="bg-stone-100 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-stone-500">{item}</p>
                </div>
              ))}
            </div>
            <Button
              onClick={generate}
              disabled={loading}
              className={`h-9 text-sm px-6 ${plan === 'max' ? 'bg-violet-700 hover:bg-violet-800' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'}`}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
              {loading ? 'Generating...' : plan === 'max' ? 'Generate Boost Content' : 'Upgrade to Generate'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {(['faq', 'bio', 'facts', 'schema'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTab === tab ? 'bg-violet-700 text-white' : 'bg-stone-100 text-stone-500 hover:text-stone-900'}`}
                >
                  {tab === 'faq' ? 'FAQ' : tab === 'bio' ? 'Brand Bio' : tab === 'facts' ? 'Key Facts' : 'Schema'}
                </button>
              ))}
              <button onClick={generate} disabled={loading} className="px-3 py-1 text-xs rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors ml-auto">
                {loading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : '↻ Regenerate'}
              </button>
            </div>

            {activeTab === 'faq' && content.faq && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button onClick={() => copyText(content.faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'), 'faq')} className="text-[10px] text-violet-700 hover:text-violet-700 flex items-center gap-1">
                    <Copy className="h-3 w-3" /> {copied === 'faq' ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
                {content.faq.map((item, i) => (
                  <div key={i} className="bg-stone-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-stone-900 mb-1">{item.question}</p>
                    <p className="text-[11px] text-stone-500">{item.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'bio' && content.brandBio && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button onClick={() => copyText(content.brandBio, 'bio')} className="text-[10px] text-violet-700 hover:text-violet-700 flex items-center gap-1">
                    <Copy className="h-3 w-3" /> {copied === 'bio' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-stone-100 rounded-lg p-4">
                  <p className="text-sm text-stone-700 leading-relaxed">{content.brandBio}</p>
                </div>
                <p className="text-[10px] text-stone-400">Paste this into your About page or footer. AI crawlers index this text.</p>
              </div>
            )}

            {activeTab === 'facts' && content.keyFacts && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button onClick={() => copyText(content.keyFacts.join('\n'), 'facts')} className="text-[10px] text-violet-700 hover:text-violet-700 flex items-center gap-1">
                    <Copy className="h-3 w-3" /> {copied === 'facts' ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
                <div className="bg-stone-100 rounded-lg p-3 space-y-1.5">
                  {content.keyFacts.map((fact, i) => (
                    <p key={i} className="text-[11px] text-stone-700 flex items-start gap-2">
                      <span className="text-violet-600 mt-0.5">•</span>{fact}
                    </p>
                  ))}
                </div>
                <p className="text-[10px] text-stone-400">Add these as a &quot;Quick Facts&quot; section anywhere on your site. Short factual statements are highly citable by AI.</p>
              </div>
            )}

            {activeTab === 'schema' && content.jsonLd && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button onClick={() => copyText(`<script type="application/ld+json">\n${JSON.stringify(content.jsonLd, null, 2)}\n</script>`, 'schema')} className="text-[10px] text-violet-700 hover:text-violet-700 flex items-center gap-1">
                    <Copy className="h-3 w-3" /> {copied === 'schema' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-stone-900 rounded-lg p-3 overflow-x-auto">
                  <pre className="text-[10px] text-green-300 whitespace-pre-wrap">{`<script type="application/ld+json">\n${JSON.stringify(content.jsonLd, null, 2)}\n</script>`}</pre>
                </div>
                <p className="text-[10px] text-stone-400">Paste this inside the <code className="text-stone-500">&lt;head&gt;</code> of your homepage. AI crawlers parse structured data directly.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OutreachTarget {
  source: string
  type: string
  impact: string
  why: string
  action: string
  draft: string
}

function OutreachSection({ scanId, plan }: { scanId: string; plan: string }) {
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState<OutreachTarget[] | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const [copied, setCopied] = useState<number | null>(null)

  async function generate() {
    if (plan !== 'max') {
      toast.error('Upgrade to Max plan to generate outreach drafts')
      window.location.href = '/dashboard/billing'
      return
    }
    if (!scanId) {
      toast.error('Run a scan first to generate targeted outreach')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed')
      }
      const { targets: t } = await res.json()
      setTargets(t)
      toast.success('Outreach drafts ready, send them to get listed.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  function copyDraft(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const impactColor = (impact: string) =>
    impact === 'high' ? 'bg-red-500/20 text-red-400'
    : impact === 'medium' ? 'bg-amber-500/20 text-amber-400'
    : 'bg-stone-200 text-stone-500'

  return (
    <Card className="bg-white border-violet-500/20 border">
      <CardHeader className="py-3">
        <CardTitle className="text-xs text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-violet-700" />
          <span className="text-violet-700">Get Listed, Outreach Drafts</span>
          <span className="text-stone-400 font-normal normal-case text-[10px]">·the off-site fix: get named on the sources AI trusts</span>
          {plan !== 'max' && <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] ml-1">Max Plan</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {!targets ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              The #1 way to get recommended by AI is to be mentioned on the third-party sources it reads, review sites, &ldquo;best of&rdquo; listicles, and communities. We find the highest-impact ones for you and write a <span className="text-violet-700">ready-to-send pitch</span> for each.
            </p>
            <Button
              onClick={generate}
              disabled={loading}
              className={`h-9 text-sm px-6 ${plan === 'max' ? 'bg-violet-700 hover:bg-violet-800' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'}`}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Send className="h-3.5 w-3.5 mr-2" />}
              {loading ? 'Finding sources...' : plan === 'max' ? 'Generate Outreach Drafts' : 'Upgrade to Generate'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button onClick={generate} disabled={loading} className="text-[10px] text-stone-500 hover:text-stone-900 transition-colors">
                {loading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : '↻ Regenerate'}
              </button>
            </div>
            {targets.map((t, i) => (
              <div key={i} className="bg-stone-100 rounded-lg overflow-hidden">
                <button className="w-full text-left p-3 flex items-start gap-2" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-stone-900">{t.source}</span>
                      <Badge className={`text-[9px] ${impactColor(t.impact)}`}>{t.impact} impact</Badge>
                      <span className="text-[9px] text-stone-500">{t.type}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">{t.why}</p>
                  </div>
                  {openIdx === i ? <ChevronUp className="h-3.5 w-3.5 text-stone-500 shrink-0 mt-0.5" /> : <ChevronDown className="h-3.5 w-3.5 text-stone-500 shrink-0 mt-0.5" />}
                </button>
                {openIdx === i && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="bg-stone-50 rounded p-2.5">
                      <p className="text-[10px] text-violet-700 font-medium mb-0.5">Action</p>
                      <p className="text-[11px] text-stone-700">{t.action}</p>
                    </div>
                    <div className="bg-[#FBF8F4] rounded p-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] text-violet-700 font-medium">Ready-to-send draft</p>
                        <button onClick={() => copyDraft(t.draft, i)} className="text-[10px] text-violet-700 hover:text-violet-700 flex items-center gap-1">
                          <Copy className="h-3 w-3" /> {copied === i ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="text-[11px] text-stone-700 whitespace-pre-wrap font-sans">{t.draft}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface GeneratedArticle {
  title: string
  metaDescription: string
  excerpt: string
  contentHtml: string
}

function PublishSection({ brandId, publishLimit, publishesUsed, canPublish, publishResetsAt, generationLimit, generationsUsed, canGenerate }: {
  brandId: string
  publishLimit: number
  publishesUsed: number
  canPublish: boolean
  publishResetsAt: string | null
  generationLimit: number
  generationsUsed: number
  canGenerate: boolean
}) {
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [article, setArticle] = useState<GeneratedArticle | null>(null)
  const [siteUrl, setSiteUrl] = useState('')
  const [username, setUsername] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [status, setStatus] = useState<'draft' | 'publish'>('draft')
  const [publishing, setPublishing] = useState(false)
  const [publishedLink, setPublishedLink] = useState('')
  const [remember, setRemember] = useState(true)
  const [savedConn, setSavedConn] = useState(false)

  const canUse = publishLimit > 0          // Pro or Max may publish at all
  const quotaLeft = canPublish             // has a LIVE publish remaining this period
  const canGen = canGenerate               // has an article generation remaining (OpenAI cost cap)
  const resetLabel = publishResetsAt ? new Date(publishResetsAt).toLocaleDateString() : ''
  const storageKey = brandId ? `seo4ai-wp-${brandId}` : ''

  // Load any saved WordPress connection for this brand (stored locally, per device).
  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const c = JSON.parse(raw)
        setSiteUrl(c.siteUrl || '')
        setUsername(c.username || '')
        setAppPassword(c.appPassword || '')
        setSavedConn(true)
      }
    } catch { /* ignore corrupt local data */ }
  }, [storageKey])

  function forgetConnection() {
    if (storageKey) localStorage.removeItem(storageKey)
    setSiteUrl(''); setUsername(''); setAppPassword('')
    setSavedConn(false)
    toast.success('Saved WordPress connection removed from this device')
  }

  async function generate() {
    if (!canUse) {
      toast.error('Upgrade to Pro or Max to generate & publish articles')
      window.location.href = '/dashboard/billing'
      return
    }
    if (!canGen) {
      toast.error(`You've used all ${generationLimit} article generations this period${resetLabel ? `, resets ${resetLabel}` : ''}`)
      return
    }
    if (!brandId) {
      toast.error('Add a brand first')
      return
    }
    setGenerating(true)
    setPublishedLink('')
    try {
      const res = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, topic: topic.trim() || undefined }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed')
      }
      const { article: a } = await res.json()
      setArticle(a)
      toast.success('Article ready, review it, then publish.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function publish() {
    if (!article) return
    if (!siteUrl || !username || !appPassword) {
      toast.error('Enter your WordPress site URL, username and Application Password')
      return
    }
    setPublishing(true)
    try {
      const res = await fetch('/api/publish/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl, username, appPassword, brandId,
          title: article.title,
          contentHtml: article.contentHtml,
          excerpt: article.excerpt,
          status,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setPublishedLink(d.link || '')
      // Persist (or clear) the connection on this device per the user's choice.
      if (storageKey) {
        if (remember) {
          localStorage.setItem(storageKey, JSON.stringify({ siteUrl, username, appPassword }))
          setSavedConn(true)
        } else {
          localStorage.removeItem(storageKey)
          setSavedConn(false)
        }
      }
      toast.success(status === 'publish' ? 'Published to your site!' : 'Saved as a draft on your site!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card className="bg-white border-violet-500/20 border">
      <CardHeader className="py-3">
        <CardTitle className="text-xs text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-violet-700" />
          <span className="text-violet-700">Write &amp; Publish</span>
          <span className="text-stone-400 font-normal normal-case text-[10px]">·generate an AI-optimized article and post it to your site</span>
          {!canUse
            ? <Badge className="bg-violet-500/20 text-violet-700 text-[9px] ml-1">Pro &amp; Max</Badge>
            : <Badge className="bg-stone-200 text-stone-600 text-[9px] ml-1 normal-case font-normal">{generationsUsed}/{generationLimit} articles{resetLabel ? ` · resets ${resetLabel}` : ''}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-3">
        {!article ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              Generate an article written the way AI assistants like to read, direct answers, clear headings, FAQ, then publish it straight to your WordPress in one click.
            </p>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic (optional), e.g. 'how to choose a CRM for a 5-person team'"
              className="bg-stone-100 border-stone-200 text-stone-900 text-sm h-9"
            />
            <Button
              onClick={generate}
              disabled={generating || (canUse && !canGen)}
              className={`h-9 text-sm px-6 ${canUse && canGen ? 'bg-violet-700 hover:bg-violet-800' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'}`}
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <FileText className="h-3.5 w-3.5 mr-2" />}
              {generating ? 'Writing...' : !canUse ? 'Upgrade to Generate' : !canGen ? 'Article limit reached' : 'Generate Article'}
            </Button>
            {canUse && !canGen && (
              <p className="text-[11px] text-stone-500">
                You&apos;ve used all {generationLimit} article generations this period{resetLabel ? `, resets ${resetLabel}` : ''}.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Article preview */}
            <div className="bg-stone-100 rounded-lg p-4 max-h-72 overflow-y-auto">
              <h3 className="text-base font-semibold text-stone-900 mb-1">{article.title}</h3>
              <p className="text-[11px] text-stone-500 mb-3">{article.metaDescription}</p>
              <div
                className="prose-article text-[12px] text-stone-700 space-y-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-stone-900 [&_h2]:mt-3 [&_h3]:font-medium [&_h3]:text-stone-800 [&_ul]:list-disc [&_ul]:pl-4 [&_strong]:text-stone-900"
                dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setArticle(null)} className="text-[11px] text-stone-500 hover:text-stone-900">↻ Start over</button>
              <button onClick={generate} disabled={generating} className="text-[11px] text-stone-500 hover:text-stone-900 ml-auto">
                {generating ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Regenerate'}
              </button>
            </div>

            {/* WordPress connection */}
            {publishedLink ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-stone-900 font-medium mb-1">{status === 'publish' ? 'Live on your site!' : 'Saved as draft on your site!'}</p>
                <a href={publishedLink} target="_blank" rel="noreferrer" className="text-xs text-violet-700 hover:text-violet-700 inline-flex items-center gap-1">
                  View post <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="bg-stone-100 rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <Upload className="h-3 w-3 text-violet-700" /> Publish to your WordPress
                  </p>
                  {savedConn && (
                    <button onClick={forgetConnection} className="text-[10px] text-stone-500 hover:text-red-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Saved · forget
                    </button>
                  )}
                </div>
                <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="yoursite.com" className="bg-white border-stone-200 text-stone-900 text-sm h-9" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="WP username" className="bg-white border-stone-200 text-stone-900 text-sm h-9" />
                  <Input value={appPassword} onChange={(e) => setAppPassword(e.target.value)} type="password" placeholder="Application Password" className="bg-white border-stone-200 text-stone-900 text-sm h-9" />
                </div>
                <p className="text-[10px] text-stone-400">
                  Create one in WordPress → Users → Profile → Application Passwords.
                </p>
                <label className="flex items-center gap-2 text-[10px] text-stone-500 cursor-pointer select-none">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-violet-700 h-3 w-3" />
                  Remember on this device (stored only in your browser, never on our servers)
                </label>
                <p className="text-[10px] text-stone-500">
                  Live publishes: {publishesUsed}/{publishLimit} this period{resetLabel ? ` · resets ${resetLabel}` : ''}.
                  {!quotaLeft && <span className="text-amber-600"> Limit reached, &ldquo;Save as draft&rdquo; still works.</span>}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'publish')}
                    className="bg-white border border-stone-200 text-stone-700 text-xs rounded-md h-9 px-2"
                  >
                    <option value="draft">Save as draft</option>
                    <option value="publish">Publish live</option>
                  </select>
                  <Button onClick={publish} disabled={publishing} className="bg-violet-700 hover:bg-violet-800 h-9 text-sm flex-1">
                    {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
                    {publishing ? 'Publishing...' : status === 'publish' ? 'Publish to WordPress' : 'Save draft to WordPress'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [generatingFix, setGeneratingFix] = useState(false)
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [showEditBrand, setShowEditBrand] = useState(false)
  const [savingBrand, setSavingBrand] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [showFixPlan, setShowFixPlan] = useState(false)
  const [userPlan, setUserPlan] = useState<{ plan: string; canScan: boolean; canViewCompetitors: boolean; canViewFixPlan: boolean; scansUsed: number; scanLimit: number; brandLimit: number; publishLimit: number; publishesUsed: number; publishesRemaining: number; canPublish: boolean; publishResetsAt: string | null; generationLimit: number; generationsUsed: number; generationsRemaining: number; canGenerate: boolean } | null>(null)
  const [discoveringComps, setDiscoveringComps] = useState(false)
  const [showScoreInfo, setShowScoreInfo] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('aurarank_walkthrough_seen')) {
      setShowWalkthrough(true)
    }
  }, [])

  function dismissWalkthrough() {
    setShowWalkthrough(false)
    if (typeof window !== 'undefined') localStorage.setItem('aurarank_walkthrough_seen', '1')
  }
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null)

  // Brand form
  const [brandName, setBrandName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [customIndustry, setCustomIndustry] = useState('')
  const [regionType, setRegionType] = useState('global')
  const [regionCountry, setRegionCountry] = useState('')
  const [regionState, setRegionState] = useState('')
  const [regionCity, setRegionCity] = useState('')
  const [competitors, setCompetitors] = useState<string[]>([])
  const [compInput, setCompInput] = useState('')

  const fetchDashboard = useCallback(async (brandId?: string) => {
    // Hard timeout so a slow/hung API can never leave the page stuck on the skeleton.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      setLoading(true)
      const [dashRes, planRes] = await Promise.all([
        fetch(`/api/dashboard${brandId ? `?brandId=${brandId}` : ''}`, { signal: ctrl.signal }),
        fetch('/api/user/plan', { signal: ctrl.signal }),
      ])
      if (dashRes.status === 401) { window.location.href = '/login'; return }
      if (dashRes.ok) {
        const json: DashboardData = await dashRes.json()
        setData(json)
        if (json.selectedBrand && !brandId) setSelectedBrandId(json.selectedBrand.id)
        if (json.hasNoBrands) setShowAddBrand(true)
      }
      if (planRes.ok) setUserPlan(await planRes.json())
    } catch { /* network error or timeout */ }
    finally { clearTimeout(timer); setLoading(false) }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  function resetBrandForm() {
    setBrandName(''); setWebsite(''); setIndustry(''); setCustomIndustry('')
    setRegionType('global'); setRegionCountry(''); setRegionState(''); setRegionCity('')
    setCompetitors([]); setCompInput('')
  }

  async function handleAddBrand(e: React.FormEvent) {
    e.preventDefault()
    setSavingBrand(true)
    const finalIndustry = industry === 'custom' ? customIndustry : industry
    const marketRegion = regionType === 'global' ? { type: 'global' as const } :
      { type: regionType, country: regionCountry, state: regionState || undefined, city: regionCity || undefined }
    try {
      const res = await fetch('/api/brands', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, website: website || undefined, industry: finalIndustry, competitors, marketRegion }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      const newBrand = await res.json()
      toast.success('Brand added! Running first scan...')
      setShowAddBrand(false)
      resetBrandForm()
      setSelectedBrandId(newBrand.id)
      await fetchDashboard(newBrand.id)
      triggerScanForBrand(newBrand.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally { setSavingBrand(false) }
  }

  function openEditDialog() {
    if (!brand) return
    setBrandName(brand.brand_name)
    setWebsite(data?.brands.find(b => b.id === brand.id)?.website || '')
    setIndustry(brand.industry || '')
    setCustomIndustry('')
    const r = brand.market_region
    setRegionType(r?.type || 'global')
    setRegionCountry(r?.country || '')
    setRegionState(r?.state || '')
    setRegionCity(r?.city || '')
    setCompetitors(brand.competitors || [])
    setCompInput('')
    setShowEditBrand(true)
  }

  async function handleEditBrand(e: React.FormEvent) {
    e.preventDefault()
    if (!brand) return
    setSavingBrand(true)
    const finalIndustry = industry === 'custom' ? customIndustry : industry
    const marketRegion = regionType === 'global' ? { type: 'global' as const } :
      { type: regionType, country: regionCountry, state: regionState || undefined, city: regionCity || undefined }
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          website: website || undefined,
          industry: finalIndustry,
          competitors,
          marketRegion,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      toast.success('Brand updated! Running new scan...')
      setShowEditBrand(false)
      resetBrandForm()
      await fetchDashboard(brand.id)
      triggerScanForBrand(brand.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally { setSavingBrand(false) }
  }

  async function handleRunScan() {
    const brandId = selectedBrandId || data?.selectedBrand?.id
    if (!brandId) return
    setScanning(true)
    toast.info('Scanning AI... this takes ~20 seconds')
    try {
      const r1 = await fetch('/api/scans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId }) })
      if (!r1.ok) {
        const d = await r1.json()
        throw new Error(d.error || 'Failed to start scan')
      }
      const scan = await r1.json()
      const r2 = await fetch(`/api/scans/${scan.id}/execute`, { method: 'POST' })
      if (!r2.ok) throw new Error('Scan failed')
      const result = await r2.json()
      toast.success(`Scan done! Visibility score: ${result.visibilityScore}/100`)
      fetchDashboard(brandId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally { setScanning(false) }
  }

  async function triggerScanForBrand(brandId: string) {
    setScanning(true)
    toast.info('Scanning AI... this takes ~20 seconds')
    try {
      const r1 = await fetch('/api/scans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId }) })
      if (!r1.ok) {
        const d = await r1.json()
        throw new Error(d.error || 'Failed to start scan')
      }
      const scan = await r1.json()
      const r2 = await fetch(`/api/scans/${scan.id}/execute`, { method: 'POST' })
      if (!r2.ok) throw new Error('Scan failed')
      const result = await r2.json()
      toast.success(`Done! Score: ${result.visibilityScore}/100`)
      fetchDashboard(brandId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally { setScanning(false) }
  }

  async function handleGenerateFix() {
    if (!data?.latestScan) return
    setGeneratingFix(true)
    try {
      const res = await fetch('/api/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanId: data.latestScan.id }) })
      if (!res.ok) throw new Error('Failed')
      toast.success('Fix plan ready!')
      fetchDashboard(selectedBrandId || undefined)
    } catch { toast.error('Failed to generate fix plan') }
    finally { setGeneratingFix(false) }
  }

  async function toggleRec(id: string, completed: boolean) {
    await fetch('/api/recommendations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, completed: !completed }) })
    if (data) setData({ ...data, recommendations: data.recommendations.map(r => r.id === id ? { ...r, completed: !completed } : r) })
  }

  function addComp() {
    const c = compInput.trim()
    if (c && competitors.length < 3 && !competitors.includes(c)) { setCompetitors([...competitors, c]); setCompInput('') }
  }

  async function handleDeleteBrand(brandId: string) {
    if (!confirm('Delete this brand and all its data? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/brands/${brandId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete brand')
      toast.success('Brand deleted')
      setSelectedBrandId(null)
      fetchDashboard()
    } catch { toast.error('Failed to delete brand') }
  }

  const prioColor = (p: string) => p === 'high' ? 'bg-red-500/20 text-red-400' : p === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-stone-100 rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-stone-100 rounded-xl animate-pulse" />)}
      </div>
      <div className="h-56 bg-stone-100 rounded-xl animate-pulse" />
    </div>
  )

  const brand = data?.selectedBrand
  const scan = data?.latestScan
  const region = brand?.market_region
  const totalPrompts = data?.totalPrompts || 1
  const mentionRate = scan ? Math.round((scan.mention_count / totalPrompts) * 100) : 0
  const scoreLabel = scan ? getScoreLabel(scan.visibility_score) : ''
  const col = scan ? scoreColor(scan.visibility_score) : 'red'

  // Competitor comparison
  const topComp = data?.competitorAnalysis?.[0]
  const compStatus = topComp
    ? scan && scan.mention_count > topComp.mention_count ? 'winning'
      : scan && scan.mention_count === topComp.mention_count ? 'tied'
      : 'behind'
    : null

  // Authentic score validation: score > 40 but fewer than 2 genuine mentions
  const showScoreWarning = scan && scan.visibility_score > 40 && scan.mention_count < 2

  // Industry benchmark
  const benchmark = data?.industryBenchmark
  const benchmarkPercentile = benchmark && scan
    ? scan.visibility_score >= benchmark.top10 ? 90
      : scan.visibility_score >= benchmark.avg ? 50 + Math.round(((scan.visibility_score - benchmark.avg) / (benchmark.top10 - benchmark.avg)) * 40)
      : Math.round((scan.visibility_score / benchmark.avg) * 50)
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-violet-50/60 shadow-[0_1px_3px_rgba(28,25,23,0.06)] p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 mb-2.5">AI Visibility Dashboard</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {data?.brands && data.brands.length > 1 ? (
            <select
              value={selectedBrandId ?? brand?.id ?? ''}
              onChange={e => { setSelectedBrandId(e.target.value); fetchDashboard(e.target.value) }}
              className="bg-white border border-stone-200 text-stone-900 h-9 text-sm rounded-md px-3 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-600"
            >
              {data.brands.map(b => (
                <option key={b.id} value={b.id}>{b.brand_name}</option>
              ))}
            </select>
          ) : brand ? (
            <h1 className="text-lg font-bold">{brand.brand_name}</h1>
          ) : null}
          {brand && (
            <>
              <button
                onClick={openEditDialog}
                className="p-1.5 rounded-md text-stone-500 hover:text-violet-700 hover:bg-violet-500/10 transition-colors"
                title="Edit brand"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteBrand(brand.id)}
                className="p-1.5 rounded-md text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete brand"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          {region && region.type !== 'global' && (
            <Badge variant="outline" className="border-violet-500/30 text-violet-700 gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {[region.city, region.state, region.country].filter(Boolean).join(', ')}
            </Badge>
          )}
          {(!region || region.type === 'global') && brand && (
            <Badge variant="outline" className="border-stone-200 text-stone-500 gap-1 text-xs">
              <Globe className="h-3 w-3" /> Global
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-stone-200 text-stone-700 hover:bg-stone-100 h-8 text-xs px-3"
            onClick={() => {
              const brandCount = data?.brands?.length || 0
              const brandLimit = userPlan?.brandLimit || 1
              if (brandCount >= brandLimit) {
                toast.error(`You've reached your brand limit (${brandCount}/${brandLimit}). Upgrade to add more.`)
                return
              }
              setShowAddBrand(true)
            }}>
            <Plus className="h-3 w-3 mr-1" /> Add Brand
          </Button>
          <Button className="bg-violet-700 hover:bg-violet-800 h-8 text-xs px-4"
            onClick={() => {
              if (userPlan && !userPlan.canScan) {
                toast.error(`You've used all ${userPlan.scanLimit} scans this month. Upgrade for more.`)
                window.location.href = '/dashboard/billing'
                return
              }
              handleRunScan()
            }}
            disabled={scanning || !brand}>
            {scanning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Scan className="h-3 w-3 mr-1" />}
            {scanning ? 'Scanning...' : `Run Scan${userPlan ? ` (${userPlan.scansUsed}/${userPlan.scanLimit})` : ''}`}
          </Button>
        </div>
        </div>
      </div>

      {/* Empty state, improved onboarding */}
      {!brand && (
        <Card className="bg-white border-stone-200">
          <CardContent className="pt-10 pb-10 text-center">
            <Eye className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Is AI sending customers to you, or your competitors?</h2>
            <p className="text-stone-500 text-sm mb-2 max-w-md mx-auto">
              We test the exact questions your customers ask ChatGPT, Gemini, and other AI tools, then show you whether your brand comes up in the answers.
            </p>
            <p className="text-stone-500 text-xs mb-6 max-w-sm mx-auto">Takes 30 seconds. No credit card needed to get started.</p>
            <Button className="bg-violet-700 hover:bg-violet-800 h-10" onClick={() => setShowAddBrand(true)}>
              <Plus className="h-4 w-4 mr-2" /> Find Out Now, Add Your Brand
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scan && (
        <>
          {/* First-time results walkthrough */}
          {showWalkthrough && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 relative">
              <button onClick={dismissWalkthrough} className="absolute top-3 right-3 text-stone-500 hover:text-stone-900" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-violet-300 mb-2">👋 How to read your results</p>
              <ul className="text-xs text-stone-700 space-y-1.5 pr-6">
                <li><span className="text-violet-700 font-medium">Visibility Score</span>, how often AI recommends you across real customer questions (0–100).</li>
                <li><span className="text-violet-700 font-medium">Missed Searches</span>, questions where competitors show up but you don&apos;t. Your biggest opportunities. Click &ldquo;See what AI actually said&rdquo; to read the real answer.</li>
                <li><span className="text-violet-700 font-medium">Boost My Score</span>, generate ready-to-paste website content that helps AI learn about you (Max plan).</li>
                <li>Run another scan after making changes to track your progress over time.</li>
              </ul>
              <button onClick={dismissWalkthrough} className="mt-3 text-xs font-medium text-violet-700 hover:text-violet-300">Got it →</button>
            </div>
          )}

          {/* Score Summary Banner */}
          <div className={`rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
            col === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20' :
            col === 'amber' ? 'bg-amber-500/5 border-amber-500/20' :
            'bg-red-500/5 border-red-500/20'
          }`}>
            <ScoreRing score={scan.visibility_score} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-stone-900">
                  {scoreLabel === 'Dominant' || scoreLabel === 'Strong'
                    ? `${brand?.brand_name} has strong AI visibility`
                    : scoreLabel === 'Moderate'
                    ? `${brand?.brand_name} has moderate AI visibility`
                    : `${brand?.brand_name} is ${scoreLabel.toLowerCase()} to AI recommendations`}
                </p>
                <button onClick={() => setShowScoreInfo(!showScoreInfo)} className="text-stone-500 hover:text-stone-700">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm text-stone-500">
                {col === 'emerald'
                  ? `AI recommends you in ${scan.mention_count} out of ${totalPrompts} test questions. You're doing well, keep it up.`
                  : col === 'amber'
                  ? `AI mentioned you in ${scan.mention_count} out of ${totalPrompts} test questions. There's clear room to improve.`
                  : `AI only mentioned you in ${scan.mention_count} out of ${totalPrompts} test questions. Customers searching AI won't find you.`}
              </p>
              {showScoreInfo && (
                <p className="text-[11px] text-stone-500 mt-1.5 bg-stone-50 rounded px-2 py-1.5">
                  Score formula: how often you appear (50%) + how high you rank (30%) + how positively described (20%). Brand-awareness questions excluded. Tested across {totalPrompts} real customer-style discovery prompts.
                </p>
              )}
            </div>
            <div className="shrink-0">
              <p className="text-[10px] text-stone-500 mb-1">Last scanned</p>
              <p className="text-xs text-stone-500">{format(new Date(scan.scan_date), 'MMM d, HH:mm')}</p>
            </div>
          </div>

          {/* Authentic score warning */}
          {showScoreWarning && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                <span className="font-semibold">Heads up:</span> Your brand was not clearly recognized by AI in most tests. This score reflects your industry&apos;s general presence, not active recommendations of your brand specifically. Add more content to your website to help AI learn about you.
              </p>
            </div>
          )}

          {/* Competitor movement alerts */}
          {data?.competitorAlerts && data.competitorAlerts.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-orange-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> Competitor movement since your last scan
              </p>
              {data.competitorAlerts.map((a, i) => (
                <p key={i} className="text-xs text-orange-200/90 pl-6">{a}</p>
              ))}
            </div>
          )}

          {/* 4 Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Metric 1: Score */}
            <Card className={`border ${
              col === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20' :
              col === 'amber' ? 'bg-amber-500/5 border-amber-500/20' :
              'bg-red-500/5 border-red-500/20'
            }`}>
              <CardContent className="pt-4 pb-4">
                <p className={`text-3xl font-bold ${
                  col === 'emerald' ? 'text-emerald-400' :
                  col === 'amber' ? 'text-amber-400' : 'text-red-400'
                }`}>{scan.visibility_score}<span className="text-base text-stone-500">/100</span></p>
                <p className="text-xs font-medium text-stone-700 mt-1">Visibility Score</p>
                <p className="text-[10px] text-stone-500 mt-0.5">{scoreLabel}</p>
              </CardContent>
            </Card>

            {/* Metric 2: Mention Rate */}
            <Card className="bg-white border-stone-200">
              <CardContent className="pt-4 pb-4">
                <p className="text-3xl font-bold text-stone-900">{mentionRate}<span className="text-base text-stone-500">%</span></p>
                <p className="text-xs font-medium text-stone-700 mt-1">AI Mention Rate</p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Found in {scan.mention_count}/{totalPrompts} AI responses
                </p>
              </CardContent>
            </Card>

            {/* Metric 3: vs Competitors */}
            {topComp && userPlan?.canViewCompetitors ? (
              <Card className={`border ${
                compStatus === 'winning' ? 'bg-emerald-500/5 border-emerald-500/20' :
                compStatus === 'tied' ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-red-500/5 border-red-500/20'
              }`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-1.5">
                    {compStatus === 'winning'
                      ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                      : compStatus === 'tied'
                      ? <Minus className="h-4 w-4 text-amber-400" />
                      : <TrendingDown className="h-4 w-4 text-red-400" />}
                    <p className={`text-2xl font-bold ${
                      compStatus === 'winning' ? 'text-emerald-400' :
                      compStatus === 'tied' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {compStatus === 'winning' ? 'Winning' : compStatus === 'tied' ? 'Tied' : 'Behind'}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-stone-700 mt-1">vs {topComp.competitor_name}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    You: {scan.mention_count} · {topComp.competitor_name}: {topComp.mention_count}
                  </p>
                </CardContent>
              </Card>
            ) : !userPlan?.canViewCompetitors && data?.competitorAnalysis && data.competitorAnalysis.length > 0 ? (
              <Card className="bg-white border-stone-200 border-dashed">
                <CardContent className="pt-4 pb-4">
                  <p className="text-2xl font-bold text-stone-400">Locked</p>
                  <p className="text-xs font-medium text-stone-500 mt-1">vs Competitors</p>
                  <button onClick={() => window.location.href = '/dashboard/billing'} className="text-[10px] text-violet-700 hover:text-violet-700 mt-1 flex items-center gap-0.5">
                    Upgrade to see <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-stone-200">
                <CardContent className="pt-4 pb-4">
                  <p className="text-2xl font-bold text-stone-500">–</p>
                  <p className="text-xs font-medium text-stone-700 mt-1">vs Competitors</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">Add competitors when creating brand</p>
                </CardContent>
              </Card>
            )}

            {/* Metric 4: Missed Searches */}
            <Card className={`border ${
              (data?.promptOpportunities?.length || 0) > 0
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-white border-stone-200'
            }`}>
              <CardContent className="pt-4 pb-4">
                <p className={`text-3xl font-bold ${(data?.promptOpportunities?.length || 0) > 0 ? 'text-amber-400' : 'text-stone-500'}`}>
                  {data?.promptOpportunities?.length || 0}
                </p>
                <p className="text-xs font-medium text-stone-700 mt-1">Missed Searches</p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  {(data?.promptOpportunities?.length || 0) > 0
                    ? 'Questions where rivals show, you don\'t'
                    : 'No missed opportunities found'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Industry Benchmark */}
          {benchmark && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-stone-500" /> Industry Benchmark
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                    <span>0</span>
                    <span>Industry avg: {benchmark.avg}</span>
                    <span>Top 10%: {benchmark.top10}</span>
                    <span>100</span>
                  </div>
                  <div className="relative h-2 bg-stone-100 rounded-full">
                    <div className="absolute h-full bg-stone-200 rounded-full" style={{ width: `${benchmark.avg}%` }} />
                    <div className="absolute h-full bg-violet-600/40 rounded-full" style={{ width: `${benchmark.top10}%` }} />
                    <div
                      className={`absolute h-4 w-1 -top-1 rounded-full ${col === 'emerald' ? 'bg-emerald-400' : col === 'amber' ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ left: `${scan.visibility_score}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {benchmarkPercentile !== null && (
                    <p className={`text-sm font-bold ${col === 'emerald' ? 'text-emerald-400' : col === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
                      Top {100 - benchmarkPercentile}%
                    </p>
                  )}
                  <p className="text-[10px] text-stone-500">in {brand?.industry}</p>
                </div>
              </div>
              <p className="text-[10px] text-stone-400 mt-2">
                Your score is {scan.visibility_score}. The average in {brand?.industry} is {benchmark.avg}. Top 10% score {benchmark.top10}+.
              </p>
            </div>
          )}

          {/* MISSED OPPORTUNITIES, always visible, first prominent section */}
          {(data?.promptOpportunities?.length || 0) > 0 ? (
            <Card className="bg-white border-amber-500/20 border">
              <CardHeader className="py-3">
                <CardTitle className="text-xs text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-400">Missed Searches ({data!.promptOpportunities.length})</span>
                  <span className="text-stone-400 font-normal normal-case text-[10px]">·AI recommends competitors here, not you</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3 space-y-2">
                {data?.winnabilitySplit ? (
                  <WinnabilitySummary split={data.winnabilitySplit} />
                ) : (
                  <p className="text-xs text-stone-500 mb-3 bg-stone-100 rounded-lg px-3 py-2">
                    These are real questions customers ask AI. Your competitors appear in the answers, you don&apos;t. Each one is a customer you&apos;re currently losing to AI recommendations.
                  </p>
                )}
                {data!.promptOpportunities.map(opp => (
                  <div key={opp.id} className="p-3 bg-stone-100/30 rounded-lg border border-stone-200">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs text-stone-500">Customer asks AI:</p>
                      {opp.winnability && <WinnabilityChip value={opp.winnability} />}
                    </div>
                    <p className="text-sm text-stone-900 mb-2 font-medium">&ldquo;{opp.prompt}&rdquo;</p>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[10px] text-stone-500">AI recommends:</span>
                      {opp.competitors_found.map(c => (
                        <span key={c} className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                      <span className="text-[10px] text-amber-500">but not {brand?.brand_name}</span>
                    </div>
                    {/* The pages the AI read: the actual fix list */}
                    <CitationMap
                      citations={opp.citations || []}
                      citationsByEngine={opp.citations_by_engine}
                      brandName={brand?.brand_name || 'You'}
                      competitorsFound={opp.competitors_found}
                    />

                    {/* AI Response Viewer */}
                    {opp.ai_response && (
                      <div>
                        <button
                          onClick={() => setExpandedOpp(expandedOpp === opp.id ? null : opp.id)}
                          className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-700 transition-colors"
                        >
                          {expandedOpp === opp.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandedOpp === opp.id ? 'Hide AI response' : 'See what AI actually said'}
                        </button>
                        {expandedOpp === opp.id && (
                          <div className="mt-2 bg-stone-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-stone-500 mb-1">AI response:</p>
                            <p className="text-xs text-stone-500 italic leading-relaxed">
                              &ldquo;{opp.ai_response.length > 300 ? opp.ai_response.substring(0, 300) + '...' : opp.ai_response}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : scan && (
            <Card className="bg-white/30 border-stone-200 border-dashed">
              <CardContent className="py-6 text-center">
                <Target className="h-6 w-6 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-500 mb-1">No missed searches found</p>
                <p className="text-xs text-stone-400">
                  {scan.mention_count > 0
                    ? 'Your brand appears in the same searches as your competitors.'
                    : 'Add competitors to your brand to track where they appear without you.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* What This Means */}
          {(scan.visibility_score < 66 || (data?.promptOpportunities?.length || 0) > 0) && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> What This Means For Your Business
              </p>
              <div className="space-y-1.5">
                {scan.visibility_score < 26 && (
                  <p className="text-sm text-stone-700">
                    When a customer asks AI &ldquo;what&apos;s the best {brand?.industry?.toLowerCase()} option?&rdquo;, your brand is not being mentioned. They&apos;re being sent to your competitors instead.
                  </p>
                )}
                {scan.visibility_score >= 26 && scan.visibility_score < 66 && (
                  <p className="text-sm text-stone-700">
                    AI mentions you sometimes, but not consistently. You&apos;re losing roughly {100 - mentionRate}% of potential customers who discover via AI search.
                  </p>
                )}
                {(data?.promptOpportunities?.length || 0) > 0 && (
                  <p className="text-sm text-stone-500">
                    There are <span className="text-amber-400 font-medium">{data?.promptOpportunities?.length} specific search questions</span> where AI recommends competitors instead of you, each one is a lost customer.
                  </p>
                )}
                {compStatus === 'behind' && topComp && (
                  <p className="text-sm text-stone-500">
                    <span className="text-red-400 font-medium">{topComp.competitor_name}</span> is getting more AI recommendations than you. That means they&apos;re capturing customers you should be winning.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Charts, always rendered, with placeholders when empty */}
          <div className={`grid ${data?.competitorAnalysis && data.competitorAnalysis.length > 0 && data?.scanHistory && data.scanHistory.length > 1 ? 'lg:grid-cols-2' : ''} gap-4`}>
            {/* Competitor chart or locked/placeholder */}
            {data?.competitorAnalysis && data.competitorAnalysis.length > 0 && userPlan?.canViewCompetitors ? (
              <Card className="bg-white border-stone-200">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-violet-700" /> Head-to-Head: AI Mentions
                  </CardTitle>
                  <p className="text-[10px] text-stone-400">How many AI responses mentioned each brand</p>
                </CardHeader>
                <CardContent className="pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={[
                      { name: brand?.brand_name || 'You', mentions: scan.mention_count, fill: '#7c3aed' },
                      ...data!.competitorAnalysis.map(c => ({ name: c.competitor_name, mentions: c.mention_count, fill: '#a8a29e' })),
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="name" tick={{ fill: '#78716c', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#78716c', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '8px', color: '#1c1917', fontSize: 11 }}
                        formatter={(val) => [`${val} AI responses`, 'Mentions']}
                      />
                      <Bar dataKey="mentions" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : data?.competitorAnalysis && data.competitorAnalysis.length > 0 && !userPlan?.canViewCompetitors ? (
              <Card className="bg-white border-stone-200 border-dashed">
                <CardContent className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="relative w-full h-24 overflow-hidden rounded-lg opacity-20 pointer-events-none">
                    <div className="flex gap-3 items-end justify-center h-full pb-2">
                      {[40, 65, 28, 55].map((h, i) => <div key={i} className="w-8 rounded-t" style={{ height: `${h}%`, background: i === 0 ? '#7c3aed' : '#a8a29e' }} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-700">Competitor Comparison Chart</p>
                    <p className="text-xs text-stone-500 mt-1">See exactly who AI recommends instead of you, and by how much</p>
                  </div>
                  <Button className="bg-violet-700 hover:bg-violet-800 h-8 text-xs px-4" onClick={() => window.location.href = '/dashboard/billing'}>
                    Upgrade to Pro <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {/* Trend chart or placeholder */}
            {data?.scanHistory && data.scanHistory.length > 1 ? (
              <Card className="bg-white border-stone-200">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Your Progress Over Time
                  </CardTitle>
                  <p className="text-[10px] text-stone-400">Visibility score trend across scans</p>
                </CardHeader>
                <CardContent className="pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data!.scanHistory.map(s => ({ date: format(new Date(s.scan_date), 'MMM d'), score: s.visibility_score }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="date" tick={{ fill: '#78716c', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#78716c', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e7e5e4', borderRadius: '8px', color: '#1c1917', fontSize: 11 }}
                        formatter={(val) => [`${val}/100`, 'Visibility Score']} />
                      <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/30 border-stone-200 border-dashed">
                <CardContent className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                  <TrendingUp className="h-6 w-6 text-stone-300" />
                  <p className="text-sm font-medium text-stone-500">Progress Chart</p>
                  <p className="text-xs text-stone-400">Run one more scan to see your progress over time</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Boost My Score */}
          <BoostSection brandId={brand?.id || ''} plan={userPlan?.plan || 'free'} />

          {/* Get Listed, off-site outreach drafts */}
          <OutreachSection scanId={data?.latestScan?.id || ''} plan={userPlan?.plan || 'free'} />

          {/* Write & Publish, generate article + 1-click WordPress publish */}
          <PublishSection
            brandId={brand?.id || ''}
            publishLimit={userPlan?.publishLimit ?? 0}
            publishesUsed={userPlan?.publishesUsed ?? 0}
            canPublish={userPlan?.canPublish ?? false}
            publishResetsAt={userPlan?.publishResetsAt ?? null}
            generationLimit={userPlan?.generationLimit ?? 0}
            generationsUsed={userPlan?.generationsUsed ?? 0}
            canGenerate={userPlan?.canGenerate ?? false}
          />

          {/* Fix Plan */}
          <Card className="bg-white border-stone-200">
            <button className="w-full text-left" onClick={() => setShowFixPlan(!showFixPlan)}>
              <CardHeader className="py-3">
                <CardTitle className="text-xs text-stone-500 uppercase tracking-wide flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-violet-700" />
                    AI Fix Plan {data?.recommendations?.length ? `(${data.recommendations.length} actions)` : ''}
                    {userPlan && !userPlan.canViewFixPlan && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] ml-1">Max Plan</Badge>
                    )}
                  </span>
                  {showFixPlan ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </CardTitle>
              </CardHeader>
            </button>
            {showFixPlan && (
              <CardContent className="pt-0 pb-3 space-y-2">
                {userPlan && !userPlan.canViewFixPlan ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-10 w-10 text-emerald-500/30 mx-auto mb-3" />
                    <p className="text-base font-semibold text-stone-900 mb-2">Get Your Personalized Fix Plan</p>
                    <p className="text-sm text-stone-500 mb-1 max-w-sm mx-auto">
                      Our AI analyzes your scan results and tells you exactly what to do to get recommended more often.
                    </p>
                    <p className="text-xs text-stone-500 mb-4">Specific actions, priority order, and expected impact, available on Max plan.</p>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 h-9 text-sm px-6" onClick={() => window.location.href = '/dashboard/billing'}>
                      Upgrade to Max <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                ) : !data?.recommendations?.length ? (
                  <div className="text-center py-6">
                    <Sparkles className="h-7 w-7 text-stone-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-stone-900 mb-1">Generate Your Fix Plan</p>
                    <p className="text-xs text-stone-500 mb-3">AI will analyze your results and create a step-by-step improvement plan.</p>
                    <Button onClick={handleGenerateFix} disabled={generatingFix} className="bg-violet-700 hover:bg-violet-800 h-8 text-xs px-4">
                      {generatingFix ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      {generatingFix ? 'Generating...' : 'Generate Fix Plan'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-stone-500 mb-3">Check off actions as you complete them. Higher priority items have the most impact on your score.</p>
                    {data.recommendations.map(rec => (
                      <div key={rec.id} className={`flex items-start gap-2.5 p-3 bg-stone-100/30 rounded-lg transition-opacity ${rec.completed ? 'opacity-40' : ''}`}>
                        <button onClick={() => toggleRec(rec.id, rec.completed)} className="mt-0.5 shrink-0">
                          {rec.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-stone-400" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <p className={`text-xs font-medium ${rec.completed ? 'line-through text-stone-500' : 'text-stone-900'}`}>{rec.task_title}</p>
                            <Badge className={`${prioColor(rec.priority)} text-[9px] px-1.5 py-0`}>{rec.priority} priority</Badge>
                          </div>
                          {rec.task_description && <p className="text-[10px] text-stone-500 line-clamp-2">{rec.task_description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Footer */}
          <div className="border-t border-stone-200 pt-4 mt-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-stone-400">
                {totalPrompts} AI questions tested &middot; Last scan {format(new Date(scan.scan_date), 'MMM d, yyyy HH:mm')}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 mr-1">Share results:</span>
                <Button
                  variant="outline"
                  className="border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 h-7 text-[10px] px-2.5 gap-1"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/report/${shareToken(scan.id)}`
                    navigator.clipboard.writeText(shareUrl)
                    toast.success('Link copied!')
                  }}
                >
                  <LinkIcon className="h-3 w-3" /> Copy Link
                </Button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My brand scored ${scan.visibility_score}/100 on AI visibility! See how often ChatGPT & AI tools recommend you:`)}&url=${encodeURIComponent(`${window.location.origin}/report/${shareToken(scan.id)}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 h-7 text-[10px] px-2.5 gap-1 rounded-md transition-colors"
                >
                  <Twitter className="h-3 w-3" /> Tweet
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/report/${shareToken(scan.id)}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100 h-7 text-[10px] px-2.5 gap-1 rounded-md transition-colors"
                >
                  <Share2 className="h-3 w-3" /> Share
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* No scan yet */}
      {brand && !scan && !scanning && (
        <Card className="bg-white border-stone-200">
          <CardContent className="pt-10 pb-10 text-center">
            <Scan className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ready to scan {brand.brand_name}</h2>
            <p className="text-stone-500 text-sm mb-2 max-w-sm mx-auto">
              We&apos;ll ask AI the same questions your customers ask, and check if your brand comes up in the answers.
            </p>
            <p className="text-stone-500 text-xs mb-6 max-w-xs mx-auto">We test {'>'}15 real discovery questions. Takes about 20 seconds.</p>
            <Button className="bg-violet-700 hover:bg-violet-800 h-10" onClick={handleRunScan}>
              <Scan className="h-4 w-4 mr-2" /> Run First Scan (~20 seconds)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scanning state with context */}
      {scanning && (
        <Card className="bg-white border-violet-500/20 border">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="h-10 w-10 text-violet-700 mx-auto mb-3 animate-spin" />
            <p className="text-stone-900 font-medium mb-1">Asking AI your customers&apos; questions...</p>
            <p className="text-stone-500 text-sm mb-3">We test real questions like &ldquo;best {brand?.industry?.toLowerCase()} tools&rdquo; and &ldquo;top {brand?.industry?.toLowerCase()} companies&rdquo; to see if you appear.</p>
            <p className="text-stone-400 text-xs">This takes ~20 seconds. Please don&apos;t refresh.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Brand Dialog */}
      <Dialog open={showEditBrand} onOpenChange={setShowEditBrand}>
        <DialogContent className="bg-white border-stone-200 text-stone-900 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-stone-500 -mt-2 mb-1">Update your brand details. Run a new scan after saving to see updated results.</p>
          <form onSubmit={handleEditBrand} className="space-y-3">
            <div>
              <Label className="text-stone-700 text-xs">Brand / Business Name *</Label>
              <Input value={brandName} onChange={e => setBrandName(e.target.value)} required placeholder="e.g. Salty Sea Kitchen" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-stone-700 text-xs">Website <span className="text-stone-400">(optional)</span></Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" type="url" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-stone-700 text-xs">Industry / Category *</Label>
              <Select value={industry} onValueChange={v => setIndustry(v ?? '')}>
                <SelectTrigger className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1">
                  <SelectValue placeholder="What type of business are you?" />
                </SelectTrigger>
                <SelectContent className="bg-stone-100 border-stone-200">
                  {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind} className="text-stone-900 text-sm">{ind}</SelectItem>)}
                  <SelectItem value="custom" className="text-stone-900 text-sm">Other (type your own)</SelectItem>
                </SelectContent>
              </Select>
              {industry === 'custom' && (
                <Input value={customIndustry} onChange={e => setCustomIndustry(e.target.value)} required placeholder="Describe your industry" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1.5" />
              )}
            </div>
            <div>
              <Label className="text-stone-700 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Where are your customers?
              </Label>
              <Select value={regionType} onValueChange={v => setRegionType(v ?? 'global')}>
                <SelectTrigger className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-100 border-stone-200">
                  <SelectItem value="global" className="text-stone-900 text-sm">Worldwide</SelectItem>
                  <SelectItem value="country" className="text-stone-900 text-sm">Specific country</SelectItem>
                  <SelectItem value="state" className="text-stone-900 text-sm">State / Region</SelectItem>
                  <SelectItem value="city" className="text-stone-900 text-sm">City</SelectItem>
                </SelectContent>
              </Select>
              {regionType !== 'global' && (
                <div className="space-y-1.5 mt-1.5">
                  <Input value={regionCountry} onChange={e => setRegionCountry(e.target.value)} placeholder="Country" required className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                  {(regionType === 'state' || regionType === 'city') && (
                    <Input value={regionState} onChange={e => setRegionState(e.target.value)} placeholder="State / Region" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                  )}
                  {regionType === 'city' && (
                    <Input value={regionCity} onChange={e => setRegionCity(e.target.value)} placeholder="City" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="text-stone-700 text-xs">Competitors <span className="text-stone-400 font-normal">(max 3)</span></Label>
              <div className="flex gap-1.5 mt-1">
                <Input value={compInput} onChange={e => setCompInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComp() } }}
                  placeholder="Competitor name" disabled={competitors.length >= 3}
                  className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                <Button type="button" variant="outline" onClick={addComp} disabled={competitors.length >= 3}
                  className="border-stone-200 text-stone-700 h-9 text-xs shrink-0 px-3">Add</Button>
              </div>
              {competitors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {competitors.map((c, i) => (
                    <Badge key={i} variant="secondary" className="bg-stone-100 text-stone-700 gap-0.5 pr-1 text-xs">
                      {c}
                      <button type="button" onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))} className="hover:text-red-400 ml-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={savingBrand || !industry || (!customIndustry && industry === 'custom')} className="w-full bg-violet-700 hover:bg-violet-800 h-9 text-sm">
              {savingBrand ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {savingBrand ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Brand Dialog */}
      <Dialog open={showAddBrand} onOpenChange={setShowAddBrand}>
        <DialogContent className="bg-white border-stone-200 text-stone-900 max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Your Brand</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-stone-500 -mt-2 mb-1">We&apos;ll test if AI recommends you when customers search for what you offer.</p>
          <form onSubmit={handleAddBrand} className="space-y-3">
            <div>
              <Label className="text-stone-700 text-xs">Brand / Business Name *</Label>
              <Input value={brandName} onChange={e => setBrandName(e.target.value)} required placeholder="e.g. Salty Sea Kitchen" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-stone-700 text-xs">Website <span className="text-stone-400">(optional)</span></Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" type="url" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-stone-700 text-xs">Industry / Category *</Label>
              <Select value={industry} onValueChange={v => setIndustry(v ?? '')}>
                <SelectTrigger className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1">
                  <SelectValue placeholder="What type of business are you?" />
                </SelectTrigger>
                <SelectContent className="bg-stone-100 border-stone-200">
                  {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind} className="text-stone-900 text-sm">{ind}</SelectItem>)}
                  <SelectItem value="custom" className="text-stone-900 text-sm">Other (type your own)</SelectItem>
                </SelectContent>
              </Select>
              {industry === 'custom' && (
                <Input value={customIndustry} onChange={e => setCustomIndustry(e.target.value)} required placeholder="Describe your industry" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1.5" />
              )}
            </div>

            <div>
              <Label className="text-stone-700 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Where are your customers? <span className="text-stone-400 font-normal">(helps target local searches)</span>
              </Label>
              <Select value={regionType} onValueChange={v => setRegionType(v ?? 'global')}>
                <SelectTrigger className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-100 border-stone-200">
                  <SelectItem value="global" className="text-stone-900 text-sm">Worldwide (global audience)</SelectItem>
                  <SelectItem value="country" className="text-stone-900 text-sm">Specific country</SelectItem>
                  <SelectItem value="state" className="text-stone-900 text-sm">State / Region</SelectItem>
                  <SelectItem value="city" className="text-stone-900 text-sm">City (local business)</SelectItem>
                </SelectContent>
              </Select>
              {regionType !== 'global' && (
                <div className="space-y-1.5 mt-1.5">
                  <Input value={regionCountry} onChange={e => setRegionCountry(e.target.value)} placeholder="Country" required className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                  {(regionType === 'state' || regionType === 'city') && (
                    <Input value={regionState} onChange={e => setRegionState(e.target.value)} placeholder="State / Region" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                  )}
                  {regionType === 'city' && (
                    <Input value={regionCity} onChange={e => setRegionCity(e.target.value)} placeholder="City" className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-stone-700 text-xs">Competitors to track <span className="text-stone-400 font-normal">(max 3)</span></Label>
                <button type="button" className="text-[10px] text-violet-700 hover:text-violet-700 disabled:text-stone-400 flex items-center gap-0.5"
                  disabled={discoveringComps || !industry}
                  onClick={async () => {
                    setDiscoveringComps(true)
                    try {
                      const finalInd = industry === 'custom' ? customIndustry : industry
                      const regionStr = regionCountry ? [regionCity, regionState, regionCountry].filter(Boolean).join(', ') : ''
                      const res = await fetch('/api/competitors/discover', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ industry: finalInd, region: regionStr || undefined }),
                      })
                      if (res.ok) {
                        const { competitors: suggested } = await res.json()
                        setCompetitors(suggested.slice(0, 3))
                        toast.success(`Found ${suggested.length} competitors`)
                      }
                    } catch { /* ignore */ }
                    finally { setDiscoveringComps(false) }
                  }}>
                  {discoveringComps ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {discoveringComps ? 'Finding...' : 'Auto-suggest'}
                </button>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5 mb-1">Who do customers compare you against?</p>
              <div className="flex gap-1.5">
                <Input value={compInput} onChange={e => setCompInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComp() } }}
                  placeholder="Competitor name (press Enter to add)" disabled={competitors.length >= 3}
                  className="bg-stone-100 border-stone-200 text-stone-900 h-9 text-sm" />
                <Button type="button" variant="outline" onClick={addComp} disabled={competitors.length >= 3}
                  className="border-stone-200 text-stone-700 h-9 text-xs shrink-0 px-3">Add</Button>
              </div>
              {competitors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {competitors.map((c, i) => (
                    <Badge key={i} variant="secondary" className="bg-stone-100 text-stone-700 gap-0.5 pr-1 text-xs">
                      {c}
                      <button type="button" onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))} className="hover:text-red-400 ml-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={savingBrand || !industry || (!customIndustry && industry === 'custom')} className="w-full bg-violet-700 hover:bg-violet-800 h-9 text-sm">
              {savingBrand ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {savingBrand ? 'Adding...' : 'Add Brand & Run First Scan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
