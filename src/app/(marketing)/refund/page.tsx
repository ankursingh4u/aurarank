import type { Metadata } from 'next'
import { LifeBuoy } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'SEO4AI refund policy, billing questions, and how to get in touch.',
}

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">Refund Policy</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: August 4, 2026</p>

      <div className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5 flex gap-3">
        <LifeBuoy className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
        <p className="text-sm text-stone-800">
          <strong>We want you to get value from SEO4AI.</strong> If something isn&apos;t right, email{' '}
          <a href="mailto:support@seo4ai.app" className="text-violet-700 underline">
            support@seo4ai.app
          </a>{' '}
          and we&apos;ll work it out with you.
        </p>
      </div>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-stone-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 [&_h2]:mt-8 [&_h2]:mb-1">
        <h2>1. How we handle refunds</h2>
        <p>
          Refunds are handled individually rather than by a blanket rule. If you&apos;re unhappy with
          your purchase, contact us and tell us what went wrong. We review every request on its
          merits and, where it&apos;s reasonable, we&apos;ll issue a refund or a credit.
        </p>
        <p>
          We&apos;re most likely to refund you when the Service didn&apos;t work as described, you were
          billed unexpectedly or twice, or you reach out shortly after a charge having barely used
          the plan. We&apos;re least likely to refund a plan that has been used heavily over a full
          billing period.
        </p>

        <h2>2. Try it free first</h2>
        <p>
          Our <strong>free plan</strong> lets you run a real scan and see real results before you pay
          anything. We&apos;d rather you confirm SEO4AI is a fit that way than ask for your money back
          later.
        </p>

        <h2>3. Cancellations</h2>
        <p>
          You can cancel your subscription at any time from your billing settings. Cancelling stops
          all future charges. Your plan stays active until the end of the billing period you&apos;ve
          already paid for, and you keep full access until then.
        </p>

        <h2>4. No guarantee of results</h2>
        <p>
          SEO4AI provides measurements, tools, and recommendations. AI visibility depends on many
          factors outside our control, including how AI models change over time, so we can&apos;t
          guarantee a specific score or outcome. Results that fall short of your hopes aren&apos;t by
          themselves a billing error, though you&apos;re always welcome to talk to us about it.
        </p>

        <h2>5. Billing problems and chargebacks</h2>
        <p>
          If you spot a charge you don&apos;t recognise, please email us before filing a dispute with
          your bank. We can almost always resolve billing issues faster and more completely than a
          chargeback can, and it keeps your account in good standing.
        </p>

        <h2>6. Your legal rights</h2>
        <p>
          Nothing in this policy limits any rights you have that cannot be waived under the consumer
          law that applies where you live. Where the law requires a refund, we will provide one.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about billing or a specific charge? Email{' '}
          <a href="mailto:support@seo4ai.app" className="text-violet-700 underline">
            support@seo4ai.app
          </a>{' '}
          and include the email address on your account. We aim to reply within two business days.
        </p>
      </div>
    </div>
  )
}
