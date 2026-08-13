import { getAppUrl } from '@/lib/site'

const RESEND_API_KEY = process.env.RESEND_API_KEY

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.log('Email skipped (no RESEND_API_KEY):', { to, subject })
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Switch to 'SEO4AI <noreply@seo4ai.app>' once seo4ai.app is verified in
      // Resend, just set EMAIL_FROM in Vercel, no code change needed.
      from: process.env.EMAIL_FROM || 'SEO4AI <noreply@bolddev.live>',
      to,
      subject,
      html,
    }),
  })
}

export interface DigestData {
  brandName: string
  score: number
  prevScore: number | null
  mentions: number
  opportunities: number
  competitorAlerts: string[]
  topActions: string[]
}

export function weeklyDigestEmail(d: DigestData) {
  const delta = d.prevScore !== null ? d.score - d.prevScore : null
  const deltaLabel =
    delta === null
      ? 'First scan'
      : delta > 0
      ? `▲ +${delta} points this week`
      : delta < 0
      ? `▼ ${delta} points this week`
      : 'No change this week'
  const deltaColor = delta === null ? '#94a3b8' : delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#94a3b8'
  const scoreColor = d.score >= 60 ? '#10b981' : d.score >= 30 ? '#f59e0b' : '#ef4444'

  const alertsHtml = d.competitorAlerts.length
    ? `<div style="background:#1e293b;border-left:3px solid #f59e0b;border-radius:6px;padding:14px;margin-bottom:16px;">
        <p style="font-size:12px;color:#f59e0b;margin:0 0 8px;font-weight:bold;">COMPETITOR MOVEMENT</p>
        ${d.competitorAlerts.map((a) => `<p style="font-size:13px;color:#cbd5e1;margin:4px 0;">${a}</p>`).join('')}
      </div>`
    : ''

  const actionsHtml = d.topActions.length
    ? `<div style="background:#1e293b;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="font-size:12px;color:#818cf8;margin:0 0 10px;font-weight:bold;">3 QUICK ACTIONS</p>
        ${d.topActions
          .slice(0, 3)
          .map((a) => `<p style="font-size:13px;color:#cbd5e1;margin:6px 0;">• ${a}</p>`)
          .join('')}
      </div>`
    : ''

  return {
    subject: `SEO4AI weekly: ${d.brandName}, ${d.score}/100 (${deltaLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h1 style="color: #818cf8; font-size: 20px; margin-bottom: 8px;">Your Weekly AI Visibility Digest</h1>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:24px;">${d.brandName}</p>
        <div style="background: #1e293b; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 16px;">
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">AI VISIBILITY SCORE</p>
          <p style="font-size: 48px; font-weight: bold; color: ${scoreColor}; margin: 0;">${d.score}</p>
          <p style="font-size: 13px; color: ${deltaColor}; margin: 4px 0 0; font-weight:bold;">${deltaLabel}</p>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div style="flex:1;background:#1e293b;border-radius:8px;padding:12px;text-align:center;">
            <p style="font-size:11px;color:#94a3b8;">Mentions</p>
            <p style="font-size:24px;font-weight:bold;color:white;">${d.mentions}</p>
          </div>
          <div style="flex:1;background:#1e293b;border-radius:8px;padding:12px;text-align:center;">
            <p style="font-size:11px;color:#94a3b8;">New Opportunities</p>
            <p style="font-size:24px;font-weight:bold;color:#10b981;">${d.opportunities}</p>
          </div>
        </div>
        ${alertsHtml}
        ${actionsHtml}
        <a href="${getAppUrl()}/dashboard" style="display:block;background:#6366f1;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;text-align:center;font-size:14px;">View Full Report</a>
        <p style="font-size:11px;color:#475569;margin-top:20px;text-align:center;">SEO4AI, AI Visibility Intelligence · <a href="${getAppUrl()}/dashboard/settings" style="color:#64748b;">Manage email preferences</a></p>
      </div>
    `,
  }
}

export function scanCompleteEmail(brandName: string, score: number, mentions: number, opportunities: number) {
  const scoreColor = score >= 60 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444'
  return {
    subject: `SEO4AI: ${brandName} scored ${score}/100 in AI visibility`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h1 style="color: #818cf8; font-size: 20px; margin-bottom: 24px;">SEO4AI Scan Complete</h1>
        <p style="margin-bottom: 16px;">Your AI visibility scan for <strong style="color: white;">${brandName}</strong> is complete.</p>
        <div style="background: #1e293b; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 16px;">
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">AI VISIBILITY SCORE</p>
          <p style="font-size: 48px; font-weight: bold; color: ${scoreColor}; margin: 0;">${score}</p>
          <p style="font-size: 12px; color: #64748b;">out of 100</p>
        </div>
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8;">Mentions</p>
            <p style="font-size: 24px; font-weight: bold; color: white;">${mentions}</p>
          </div>
          <div style="flex: 1; background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8;">Opportunities</p>
            <p style="font-size: 24px; font-weight: bold; color: #10b981;">${opportunities}</p>
          </div>
        </div>
        <a href="${getAppUrl()}/dashboard" style="display: block; background: #6366f1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; text-align: center; font-size: 14px;">View Full Report</a>
        <p style="font-size: 11px; color: #475569; margin-top: 20px; text-align: center;">SEO4AI - AI Visibility Intelligence</p>
      </div>
    `,
  }
}
