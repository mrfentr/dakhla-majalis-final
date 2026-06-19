# Dakhla Majalis — SEO Action Plan & Keyword Strategy

*Last updated: 2026-06-19*

---

## 1. IS THE SITE READY? → YES. Verified live as Googlebot.

I crawled the real live site as Googlebot. It is technically ready to be indexed.
The `noindex` was the only blocker and it is gone.

| Check | Result |
|-------|--------|
| HTTP status (ar/fr/en/products/product) | **200** ✅ |
| Robots meta | **`index, follow`** on every page ✅ |
| Canonical | Correct self-canonical on every page ✅ |
| hreflang | 8 alternate tags per page (ar/fr/en/x-default) ✅ |
| Server-rendered content | **3,800–5,400 words** of real text per page ✅ (not a blank JS shell — Google can read it) |
| Titles | Present, keyword-rich ✅ |
| robots.txt / sitemap.xml | Clean, 156 URLs, hreflang ✅ |

**Minor weaknesses (not blockers):**
- Product & category pages render their `<h1>` client-side (JS), not in raw HTML. Google renders JS so it still sees it, but server-side `<h1>` would be stronger.
- Homepage `<h1>` has a missing space ("من الداخلةإلى كل المغرب"). Cosmetic.

**Conclusion: the site IS "ready ready." Do the Search Console steps in section 2.**

---

## 2. DO THIS IN SEARCH CONSOLE TODAY

1. **Page indexing → "Excluded by 'noindex' tag" → click `VALIDATE FIX`.**
2. **URL Inspection → Request Indexing** for: `/ar`, `/fr`, `/en`, + top 5–7 products (~10/day).
3. **Sitemaps → re-submit** `https://www.dakhlamajalis.com/sitemap.xml`
4. **Wait 1–3 weeks** for the indexed count to climb from 0.

---

## 3. "dakhla majalis" doesn't show the site — why, and the fix

This is a **branded search**. The reason it doesn't show is the SAME `noindex` problem:
the homepage was never indexed, so Google has nothing to return.

- **There is ZERO competition for the term "dakhla majalis."** It is your brand name.
- **The moment Google indexes your homepage, you will rank #1 for it.** Guaranteed.
- So the brand-search problem is solved automatically by section 2. Nothing else needed.

---

## 4. THE KEYWORD TRUTH — you were right, pivot to French

**Arabic "مجالس صحراوية" (Saharan majalis) = 0 search volume in Morocco.** Nobody
searches it. The whole Arabic site is optimized for a term that has no traffic.

**The real traffic is the French "salon marocain" cluster** (Morocco database):

| Keyword | Volume/mo (MA) | Difficulty | Note |
|---------|----------------|-----------|------|
| salon marocain | 3,600 | 29 (easy) | core term |
| salon marocain moderne | 2,400 | 21 (easy) | |
| salon traditionnel marocain | 880 | 19 (easy) | **closest to your product** |
| rideau salon marocain | 590 | 20 | accessory |
| salon moderne marocain | 480 | **12 (very easy)** | quick win |
| table salon marocain | 480 | 19 | |
| tableau salon marocain | 480 | **4 (very easy)** | quick win |
| salon marocain luxe | 320 | **7 (very easy)** | **your positioning** |
| banquette salon marocain | 210 | — | |
| dolidol salon marocain prix | 20 | — | **you use dolidol foam** |

Total cluster volume (Morocco): **~27,000 searches/mo** across 3,240 variations.
Global (FR/CA/BE) is several times larger.

**Strategic takeaway:** Your product IS a "salon marocain" (specifically a *salon
traditionnel marocain sahraoui*). You've been naming it with a term nobody searches.
Re-frame the French pages around **"salon marocain"** while keeping the authentic
**"sahraoui / Dakhla"** angle as your differentiator.

Moroccans search in **French / Latin script** (e.g. "avito salon marocain casablanca",
"dolidol salon marocain prix") far more than Arabic. **French pages = your traffic engine.**

---

## 5. ON-PAGE CHANGES — ✅ DONE (2026-06-19)

Direction chosen: **lead with "Salon Marocain"**, keep Saharan/Dakhla as differentiator.
Implemented in code (deploy to push live):

- ✅ **FR** home/products/5 category titles + descriptions → lead with "Salon Marocain".
  - Home: "Salon Marocain Traditionnel & Sahraoui sur Mesure | Dakhla Majalis"
  - Products: "Salons Marocains Traditionnels & Sahraoui | Dakhla Majalis"
  - Categories: "Salon Marocain sur Mesure", "Salon Marocain Prêt à Livrer", "Salon Marocain d'Extérieur", "Tente Marocaine Traditionnelle en Poil de Chameau", "Accessoires & Décoration Salon Marocain"
- ✅ **EN** titles → lead with "Moroccan Salon (Majlis)".
- ✅ **AR** titles → broadened to "صالون مغربي / مجالس مغربية صحراوية" (was only the 0-volume "صحراوية").
- ✅ **Homepage H1** spacing bug fixed (was "من الداخلةإلى…").
- ✅ **Server-side H1 added** to product detail, /products, and category pages (were missing from raw HTML — now crawlable without JS).

**Files changed:** `src/messages/{fr,en,ar}.json`, `src/components/landing/LandingHero.tsx`,
`src/app/[locale]/product/[slug]/page.tsx`, `src/app/[locale]/products/page.tsx`,
`src/app/[locale]/products/[category]/page.tsx`.

> ⚠️ These are live only after you **deploy** (push / Vercel build). Then re-request
> indexing so Google picks up the new titles.

---

## 6. BLOG — keep what you have; do NOT switch to the Convex blog component

You already have a **better, custom blog CMS**: a Convex `blogs` table + a dashboard
editor (TipTap rich text) with real SEO fields — `seoTitle`, `metaDescription`,
`metaKeywords`, `excerpt`, `slug`, `tags`, `publishedAt`. Article pages
(`/[locale]/blog/[slug]`) are **server-rendered** with full metadata, canonical,
hreflang, and OpenGraph "article" type. That is already strong.

The convex.dev `basic-blog-convex-blog-cms` is a generic English starter. Adopting it
would be a **downgrade** — you'd lose your i18n (ar/fr/en), your schema, and your
existing posts. Don't do it.

**What the blog actually needs (priority order):**
1. **Content.** Write articles targeting the easy, real-volume keywords:
   - "salon marocain traditionnel" (880, KD 19) — pillar article
   - "salon marocain luxe" (320, KD 7) — easy win
   - "salon moderne marocain" (480, KD 12)
   - "salon marocain prix" / "dolidol salon marocain prix" — buyer-intent
   - "comment choisir un salon marocain" — informational
2. **Fix the blog LIST page** (`/[locale]/blog`): it's currently `'use client'` with no
   `generateMetadata` — the post list isn't in raw HTML and the page has no custom title.
   Convert it to a server component (like the article page already is). _(I can do this — say the word.)_

---

## 7. Why your other site indexed in <24h and this one didn't

It's NOT Convex vs hardcoded. Verified: this site's Convex content **is** server-rendered
(3,800–5,400 words in raw HTML). The difference:
- The other site was **clean from day one** — no noindex, instant trust.
- This site served **`noindex` for months**, actively telling Google "don't index me."
  Google obeyed, then has to re-learn to trust the domain. That recovery is the lag —
  not the tech stack.

---

## 7b. SPEED FIX — products now render server-side (✅ DONE 2026-06-19)

**Problem:** products loaded client-side (Convex `useQuery`) → users saw a "جاري تحميل
المنتجات…" spinner, and Google saw a loading message instead of products. Classic
hydrate→fetch→render waterfall.

**Fix:** switched to Convex `preloadQuery` (server) + `usePreloadedQuery` (client) so
products + categories are fetched on the server and ship in the initial HTML — no
spinner, faster LCP, fully crawlable. Applied to **every** product surface:
- Homepage (`LandingProducts`)
- `/products` page
- Category pages (`/products/[category]`)
- Subcategory pages (`/products/[category]/[subcategory]`)
- Product detail pages (`/product/[slug]`)

Verified: `npx tsc --noEmit` → **0 errors** (build is safe to deploy).

---

## 7c. INTERNAL LINKING (✅ DONE 2026-06-19)

Full page inventory is in `docs/SITE-PAGES.md` (65 routes × 3 locales ≈ 195 URLs).

**What existed already (good):** navbar category dropdown → category pages; product
pages have breadcrumbs + a "related products" section; homepage links category & product cards.

**What I added — the big gap:** the **footer** (on all ~195 pages) linked only to dead
`#products` anchors. Added a sitewide **"Shop" column** with keyword-rich anchor text
linking to every category + products + blog:
- "Tous les salons marocains" → /products
- "Salon Marocain sur Mesure" → /products/sets
- "Salon Marocain Prêt à Livrer" → /products/ready
- "Tentes Marocaines" → /products/tents
- "Salon d'Extérieur" → /products/outdoor
- "Accessoires & Déco" → /products/accessories
- "Blog" → /blog

(localized for ar/fr/en). Also fixed the footer "products" link from `#products` →
`/products`. Now every page passes link equity to all category hubs with keyword anchors.
Verified: tsc 0 errors, JSON valid.

**Why "right amount" not "maximum":** more links ≠ better. The footer hub + navbar
dropdown + breadcrumbs + related-products is the correct structure — every important
page is reachable in ≤3 clicks with descriptive anchors, without link spam.

**Breadcrumb fixes (round 2, ✅ DONE):**
- Product breadcrumb "Products" pointed to `/#products-section` (homepage anchor) → now `/products` (real crawlable page).
- Category breadcrumb used a `<button onClick={router.push}>` — **not crawlable by Google** → converted to a real `<Link href="/products">`.

**Blog list page (✅ DONE — SEO need):** `/blog` was `'use client'` with NO metadata
(no title/canonical/hreflang) and client-only post links. Refactored to the server-wrapper
pattern: new server `page.tsx` with `generateMetadata` (title/desc/canonical/hreflang) +
`preloadQuery` so posts render in the HTML; moved the UI to `BlogPageContent.tsx` using
`usePreloadedQuery`. Now /blog is crawlable with proper meta. (tsc 0 errors.)

---

## 7d. ⚠️ NEXT PRIORITY — duplicate slugs (real duplicate-content risk)

From the sitemap, these are LIVE problems (see `docs/SITE-PAGES.md`):
- Case-variant duplicate product slugs: `majlis`/`Majlis`, `pouf-traditionnel`/`Pouf-traditionnel`, `salon-sahraoui`/`Salon-sahraoui` → 2 URLs, same content.
- A subcategory slug with a literal space: `/products/ready/salon sahraoui`.
- Several products appear multiple times in the sitemap → duplicate slugs in Convex DB.

Fix = normalize slugs in Convex to unique, lowercase, hyphenated; add 301 redirects for
the old casing. This needs DB edits — tell me to proceed and I'll script it safely.

---

## 8. Minor cleanup (optional, not blocking)

- 13 "404" + 1 "403": dead URLs from the old site. Google drops them automatically.
  Send the full GSC 404 list if you want 301 redirects (must go in `middleware.ts`).
- "Crawled – not indexed" (3): favicon, a font, /ar/checkout. Non-issues.
