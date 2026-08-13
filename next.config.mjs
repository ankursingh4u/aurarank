/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // The AI Visibility Index used to live at /index. That URL sat in the
        // published sitemap for over a week, so crawlers and any AI retrieval
        // that picked it up need sending to the real page rather than silently
        // resolving to the homepage, which is what /index does otherwise.
        source: '/index',
        destination: '/ai-visibility-index',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
