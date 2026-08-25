import { describe, it, expect } from 'vitest'
import { categoryMeta, categorySlugFor, normalise, slugify, CATEGORIES } from './categories'

describe('normalise', () => {
  it('folds case, punctuation and spacing to one key', () => {
    expect(normalise('CRM Software')).toBe('crm software')
    expect(normalise('  crm   software  ')).toBe('crm software')
    expect(normalise('E-Commerce')).toBe('e commerce')
    expect(normalise('Sales & Marketing')).toBe('sales and marketing')
  })
})

describe('slugify', () => {
  it('produces a URL-safe slug', () => {
    expect(slugify('Project Management Software')).toBe('project-management-software')
    expect(slugify('E-Commerce Platforms')).toBe('e-commerce-platforms')
  })

  it('is stable across capitalisation and punctuation', () => {
    expect(slugify('help desk')).toBe(slugify('Help Desk'))
    expect(slugify('e-commerce')).toBe(slugify('E Commerce'))
  })
})

describe('categorySlugFor', () => {
  it('maps known aliases onto one canonical slug', () => {
    // The point of the alias table: an admin typing any of these produces the
    // same URL, so a re-scan never strands the previous week's page.
    expect(categorySlugFor('CRM')).toBe('crm')
    expect(categorySlugFor('CRM software')).toBe('crm')
    expect(categorySlugFor('Customer Relationship Management')).toBe('crm')
  })

  it('maps the display name itself', () => {
    for (const c of CATEGORIES) {
      expect(categorySlugFor(c.name)).toBe(c.slug)
    }
  })

  it('groups issue tracking with project management', () => {
    expect(categorySlugFor('issue tracking tools')).toBe('project-management')
  })

  it('falls back to a derived slug for an unknown industry', () => {
    // An unrecognised industry must still get a page, otherwise publishing a new
    // category would require a deploy rather than a scan.
    expect(categorySlugFor('Applicant Tracking Systems')).toBe('applicant-tracking-systems')
  })

  it('groups unknown industries that differ only in spelling', () => {
    expect(categorySlugFor('applicant tracking systems')).toBe(
      categorySlugFor('Applicant Tracking Systems')
    )
  })
})

describe('categoryMeta', () => {
  it('returns curated copy for a known slug', () => {
    const meta = categoryMeta('crm')
    expect(meta.curated).toBe(true)
    expect(meta.name).toBe('CRM Software')
    expect(meta.buyerQuestion).toContain('CRM')
    expect(meta.angle).not.toBe('')
  })

  it('derives a title from the sample industry for an unknown slug', () => {
    const meta = categoryMeta('applicant-tracking-systems', 'applicant tracking systems')
    expect(meta.curated).toBe(false)
    expect(meta.name).toBe('Applicant Tracking Systems')
    expect(meta.buyerQuestion).toBe('best applicant tracking systems')
  })

  it('derives a title from the slug when no industry is available', () => {
    const meta = categoryMeta('applicant-tracking-systems')
    expect(meta.name).toBe('Applicant Tracking Systems')
  })

  it('never returns an empty name', () => {
    expect(categoryMeta('x').name).not.toBe('')
  })
})

describe('the launch categories', () => {
  it('has six, with unique slugs', () => {
    expect(CATEGORIES).toHaveLength(6)
    expect(new Set(CATEGORIES.map((c) => c.slug)).size).toBe(6)
  })

  it('has no alias claimed by two categories', () => {
    const seen = new Map<string, string>()
    for (const c of CATEGORIES) {
      for (const alias of [c.name, ...c.aliases]) {
        const key = normalise(alias)
        const owner = seen.get(key)
        expect(owner ?? c.slug).toBe(c.slug)
        seen.set(key, c.slug)
      }
    }
  })
})

describe('aliases seen in the live index', () => {
  it('groups "issue tracking software" with project management', () => {
    // The live index had this exact string. Without the alias it produced its
    // own single-row category instead of joining the leaderboard.
    expect(categorySlugFor('issue tracking software')).toBe('project-management')
  })

  it('leaves genuinely distinct industries in their own category', () => {
    expect(categorySlugFor('team communication software')).toBe('team-communication-software')
    expect(categorySlugFor('payment processing platform')).toBe('payment-processing-platform')
  })
})
