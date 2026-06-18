// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = "https://careweavehq.com"

interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

const today = new Date().toISOString().slice(0, 10)

const entries: SitemapEntry[] = [
  { path: "/", lastmod: today, changefreq: "weekly", priority: "1.0" },
  { path: "/pricing", lastmod: today, changefreq: "weekly", priority: "0.9" },
  { path: "/pricing/medicaid", lastmod: today, changefreq: "weekly", priority: "0.8" },
  { path: "/pricing/private-pay", lastmod: today, changefreq: "weekly", priority: "0.8" },
  { path: "/pricing/regional-center", lastmod: today, changefreq: "weekly", priority: "0.8" },
  { path: "/docs", lastmod: today, changefreq: "monthly", priority: "0.7" },
  { path: "/legal", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/legal/terms", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/legal/privacy", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/legal/baa", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/auth", lastmod: today, changefreq: "monthly", priority: "0.6" },
  { path: "/signup", lastmod: today, changefreq: "monthly", priority: "0.8" },
]

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries))
console.log(`sitemap.xml written (${entries.length} entries)`)