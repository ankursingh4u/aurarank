import { describe, it, expect } from 'vitest'
import { classifyWinnability, summarizeWinnability } from '@/lib/winnability'

describe('classifyWinnability', () => {
  it('treats a self-serve source as winnable even in a crowded set', () => {
    const v = classifyWinnability([
      'g2.com',
      'forbes.com',
      'techradar.com',
      'pcmag.com',
      'cnet.com',
    ])
    expect(v.class).toBe('winnable')
    expect(v.selfServe).toContain('g2.com')
  })

  it('strips www so the same domain is not counted twice', () => {
    const v = classifyWinnability(['www.g2.com', 'g2.com'])
    expect(v.selfServe).toEqual(['g2.com'])
  })

  it('matches subdomains of a self-serve source', () => {
    expect(classifyWinnability(['old.reddit.com']).class).toBe('winnable')
  })

  it('calls a thin retrieved set winnable', () => {
    const v = classifyWinnability(['someblog.com', 'anotherblog.com'])
    expect(v.class).toBe('winnable')
    expect(v.reason).toMatch(/2 sources were read/)
  })

  it('locks a set that is entirely major editorial', () => {
    const v = classifyWinnability([
      'forbes.com',
      'techradar.com',
      'pcmag.com',
      'cnet.com',
      'wired.com',
    ])
    expect(v.class).toBe('locked')
  })

  it('locks a set held by competitors, since rivals never list you', () => {
    const v = classifyWinnability(
      ['profound.com', 'otterly.ai', 'peec.ai', 'scrunch.com'],
      ['Profound', 'Otterly', 'Peec', 'Scrunch']
    )
    expect(v.class).toBe('locked')
    expect(v.competitorOwned).toHaveLength(4)
  })

  it('calls a set of independent sites hard, not locked', () => {
    const v = classifyWinnability([
      'someblog.com',
      'anotherblog.com',
      'thirdblog.com',
      'fourthblog.com',
    ])
    expect(v.class).toBe('hard')
  })

  it('locks a question the AI answered without reading anything', () => {
    const v = classifyWinnability([])
    expect(v.class).toBe('locked')
    expect(v.reason).toMatch(/from memory/)
  })

  it('ignores competitor names too short to match safely', () => {
    // "Hey" would otherwise match hostnames like heyworld.com by substring.
    const v = classifyWinnability(['heyworld.com', 'g2.com'], ['Hey'])
    expect(v.competitorOwned).toHaveLength(0)
  })

  it('does not treat a competitor-named page as self-serve', () => {
    const v = classifyWinnability(['linear.app', 'jira.com'], ['Linear', 'Jira'])
    expect(v.competitorOwned).toEqual(['linear.app', 'jira.com'])
  })
})

describe('summarizeWinnability', () => {
  it('counts each class', () => {
    expect(
      summarizeWinnability(['winnable', 'winnable', 'hard', 'locked', 'locked', 'locked'])
    ).toEqual({ winnable: 2, hard: 1, locked: 3 })
  })

  it('returns zeroes for an empty scan', () => {
    expect(summarizeWinnability([])).toEqual({ winnable: 0, hard: 0, locked: 0 })
  })
})
