import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms and conditions for using SEO4AI.',
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: June 22, 2026</p>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-stone-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 [&_h2]:mt-8 [&_h2]:mb-1">
        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of SEO4AI
          (the &ldquo;Service&rdquo;), operated by SEO4AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
          &ldquo;our&rdquo;). By creating an account or using the Service, you agree to these Terms.
          If you do not agree, do not use the Service.
        </p>

        <h2>1. The Service</h2>
        <p>
          SEO4AI helps you measure and improve how AI assistants (such as ChatGPT, Gemini, and
          Perplexity) reference your brand, and provides related content and recommendations. The
          Service relies on third-party AI models whose outputs are probabilistic and change over
          time. We do not control these models.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You are responsible for the information you provide, for activity under your account, and
          for keeping your credentials secure. You must provide a valid email address and use the
          Service only for lawful purposes.
        </p>

        <h2>3. Acceptable use</h2>
        <p>
          You agree not to misuse the Service, including: attempting to disrupt or reverse-engineer
          it, scraping or reselling it without permission, submitting unlawful content, or using it
          to infringe others&apos; rights. We may suspend or terminate accounts that violate these
          Terms.
        </p>

        <h2>4. Plans, billing &amp; payments</h2>
        <p>
          Paid plans are billed in advance on a recurring basis through our payment processor. By
          subscribing, you authorize recurring charges until you cancel. You can cancel at any time;
          your plan remains active until the end of the current billing period. Prices and plan
          features may change with notice.
        </p>

        <h2>5. Refunds</h2>
        <p>
          Refunds are considered on a case-by-case basis rather than guaranteed. If you have a
          problem with a charge, contact{' '}
          <a href="mailto:support@seo4ai.app" className="text-violet-700 underline">support@seo4ai.app</a>{' '}
          and we will review your request and respond. Refunds required by applicable law are always
          provided. See our{' '}
          <a href="/refund" className="text-violet-700 underline">Refund Policy</a> for how we assess
          requests. A free plan is available so you can evaluate the Service before purchasing.
        </p>

        <h2>6. No guarantee of results</h2>
        <p>
          AI visibility depends on many factors outside our control. We do not guarantee any
          specific ranking, mention, score, traffic, or business outcome. Recommendations and
          generated content are provided &ldquo;as is&rdquo; for your judgment and use.
        </p>

        <h2>7. Intellectual property</h2>
        <p>
          The Service, including its software, design, and content, is owned by SEO4AI and protected
          by law. Content you generate using the Service is yours to use; you are responsible for how
          you publish and use it.
        </p>

        <h2>8. Disclaimers &amp; limitation of liability</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind. To the maximum extent permitted by law, SEO4AI is not liable for
          any indirect, incidental, or consequential damages, or for any loss of profits, data, or
          goodwill arising from your use of the Service. Our total liability is limited to the amount
          you paid us in the 3 months preceding the claim.
        </p>

        <h2>9. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you
          breach these Terms or to protect the Service. Sections that by their nature should survive
          termination will survive.
        </p>

        <h2>10. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes will be reflected by updating
          the date above. Continued use after changes means you accept them.
        </p>

        <h2>11. Governing law</h2>
        <p>
          These Terms are governed by applicable law. Any disputes will be handled in the appropriate
          courts of competent jurisdiction.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions about these Terms? Email us at{' '}
          <a href="mailto:support@seo4ai.app" className="text-violet-700 underline">support@seo4ai.app</a>.
        </p>
      </div>
    </div>
  )
}
