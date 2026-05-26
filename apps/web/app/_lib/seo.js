


export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://makazicloud.com"
).replace(/\/$/, "");

export const SITE_NAME = "Makazicloud";

export const DEFAULT_DESCRIPTION =
  "Makazicloud is Kenya's property operating system — rent collection, tenant management, maintenance, and financial reporting in one M-Pesa-ready platform.";

export const DEFAULT_KEYWORDS = [
  "property management Kenya",
  "rent collection software",
  "M-Pesa rent payment",
  "landlord software Kenya",
  "tenant management system",
  "real estate software Nairobi",
  "lease management",
  "Makazicloud",
];

const OG_IMAGE = `${SITE_URL}/hero-illustration.png`;

export function canonical(pathname = "/") {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${path === "/" ? "" : path}`;
}


export function buildMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  keywords,
  image = OG_IMAGE,
  type = "website",
  noIndex = false,
  jsonLd,
} = {}) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Property Operating System for Kenya`;
  const url = canonical(path);
  const kw = Array.isArray(keywords)
    ? keywords
    : keywords
      ? [keywords]
      : DEFAULT_KEYWORDS;

  const tags = [
    { title: fullTitle },
    { name: "description", content: description },
    { name: "keywords", content: kw.join(", ") },
    { name: "robots", content: noIndex ? "noindex, nofollow" : "index, follow" },
    { name: "author", content: SITE_NAME },
    { tagName: "link", rel: "canonical", href: url },

    { property: "og:type", content: type },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:locale", content: "en_KE" },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];

  if (jsonLd) {
    const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    for (const item of items) {
      tags.push({
        "script:ld+json": item,
      });
    }
  }

  return tags;
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: DEFAULT_DESCRIPTION,
  areaServed: { "@type": "Country", name: "Kenya" },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@makazicloud.com",
    telephone: "+254-700-123-456",
    areaServed: "KE",
    availableLanguage: ["English", "Swahili"],
  },
  sameAs: [],
};

export const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KES",
    description: "30-day free trial",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "120",
  },
};

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}
