import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { getPublicSiteUrl } from '@/lib/site'
import { JsonLd } from '@/components/seo/json-ld'
import {
  graph,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from '@/lib/schema'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

// Crawler-facing: never resolves to localhost in a production build.
const appUrl = getPublicSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'SEO4AI - AI Visibility & Brand Intelligence',
    template: '%s | SEO4AI',
  },
  description: 'See which pages AI assistants read before recommending a brand, which of them name your competitors instead of you, and which you can realistically get listed on.',
  keywords: ['AI SEO', 'AI visibility', 'brand intelligence', 'ChatGPT ranking', 'AI search optimization', 'AI search', 'brand monitoring', 'ChatGPT SEO'],
  alternates: {
    canonical: appUrl,
  },
  openGraph: {
    title: 'SEO4AI - AI Visibility & Brand Intelligence',
    description: 'See which pages AI assistants read before recommending a brand, which of them name your competitors instead of you, and which you can realistically get listed on.',
    url: appUrl,
    siteName: 'SEO4AI',
    type: 'website',
    images: [
      {
        url: `${appUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'SEO4AI - AI Visibility & Brand Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEO4AI - AI Visibility & Brand Intelligence',
    description: 'See which pages AI assistants read before recommending a brand, which of them name your competitors instead of you, and which you can realistically get listed on.',
    images: [`${appUrl}/og-image.png`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Site-wide identity graph: who publishes this and what the product is.
            Page-level schema (Article, FAQPage, Dataset) references these by @id
            instead of restating them. */}
        <JsonLd data={graph(organizationSchema(), websiteSchema(), softwareApplicationSchema())} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-[#FBF8F4] text-stone-900`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
