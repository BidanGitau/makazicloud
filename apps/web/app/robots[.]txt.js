import { SITE_URL } from "@/app/_lib/seo";

export function loader() {
  const body = `# Makazicloud robots.txt
User-agent: *
Allow: /
Allow: /properties
Allow: /properties/
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /terms

# Auth + user-only surfaces — not useful to crawlers
Disallow: /api/
Disallow: /dashboard
Disallow: /tenants
Disallow: /units
Disallow: /payments
Disallow: /arrears
Disallow: /maintenance
Disallow: /utility
Disallow: /reports
Disallow: /refunds
Disallow: /settings
Disallow: /propertylisting
Disallow: /tenant-portal
Disallow: /login
Disallow: /management-signup
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /accept-invite
Disallow: /accept-tenant-invite
Disallow: /auth/

# Crawl politeness
Crawl-delay: 1

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
