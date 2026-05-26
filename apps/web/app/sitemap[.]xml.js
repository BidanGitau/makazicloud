import { SITE_URL } from "@/app/_lib/seo";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/properties", changefreq: "hourly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/management-signup", changefreq: "monthly", priority: "0.8" },
  { path: "/login", changefreq: "monthly", priority: "0.4" },
];

async function fetchPublicPropertyIds() {
  const ids = [];
  let cursor = null;
  let pages = 0;

  while (pages < 50) {
    const url = new URL(`${API_BASE_URL}/public/properties`);
    if (cursor) url.searchParams.set("cursor", cursor);
    let payload;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) break;
      payload = await res.json();
    } catch {
      break;
    }
    for (const p of payload.properties || []) {
      if (p?.id) ids.push({ id: p.id, updatedAt: p.updatedAt });
    }
    cursor = payload.nextCursor || null;
    pages += 1;
    if (!cursor) break;
  }
  return ids;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  if (changefreq)
    parts.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
  if (priority) parts.push(`    <priority>${escapeXml(priority)}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

export async function loader() {
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries = STATIC_ROUTES.map((r) =>
    urlEntry({
      loc: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
      lastmod: today,
      changefreq: r.changefreq,
      priority: r.priority,
    }),
  );

  let dynamicEntries = [];
  try {
    const properties = await fetchPublicPropertyIds();
    dynamicEntries = properties.map((p) =>
      urlEntry({
        loc: `${SITE_URL}/properties/${p.id}`,
        lastmod: p.updatedAt
          ? new Date(p.updatedAt).toISOString().slice(0, 10)
          : today,
        changefreq: "daily",
        priority: "0.8",
      }),
    );
  } catch (err) {
    console.error("sitemap: failed to load property listings", err);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...dynamicEntries].join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
}
