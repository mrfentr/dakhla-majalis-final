# Observations Document - Dakhla Majalis

> Total: **38 changes** across Frontend, Dashboard, Backend, and i18n.
> Source: `observation .docx` received 2026-03-12.

---

## FRONTEND / WEBSITE CHANGES

---

### 1. Price hidden in French & English versions (RTL issue)

**What:** The price is positioned on the right side, which makes it invisible/cut off in French and English (LTR) versions. The number and currency "MAD"/"DH" are in the same `<span>` or adjacent flex elements without `dir="ltr"` isolation, so in Arabic RTL mode the currency can flip before the number, and in LTR mode the price can overflow to the right.

**Where it appears:**
- Checkout recap sidebar (custom majalis)
- Checkout recap sidebar (direct purchase)
- Mobile sticky bottom bar (both checkouts)
- Cart sidebar total
- Thank-you page deposit + total

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/[locale]/checkout/page.tsx` | ~3008-3010, ~2953-2989, ~3116-3123 | Wrap price+currency in `dir="ltr"` span |
| `src/app/[locale]/checkout/direct/page.tsx` | ~448-450, ~633-635, ~736-741 | Wrap price+currency in `dir="ltr"` span |
| `src/components/CartSidebar.tsx` | ~521-528, ~599-606 | Wrap price+currency in `dir="ltr"` span |
| `src/app/[locale]/thank-you/page.tsx` | ~751-757, ~1124-1128, ~1007 | Wrap price+currency in `dir="ltr"` span |

---

### 2. Add new supplement products as individual articles

**What:** Add these as individual purchasable products (same logic as poufs — each with its own stock, photos, price):
- Tapis (carpet)
- Pouf (already exists)
- **Sac de decoration** — unit price 300 DH
- **Petit coussins 40cm x 40cm** — unit price 200 DH (NOT included with ponj/foam)

The 40x40 cushions and sacs should be individual articles (like poufs), NOT part of the custom majalis flow.

**Where:** This is a **data/product creation** task in the dashboard, not a code change. But the product types may need updating.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `convex/schema.ts` | ~29-30 (`productType` union) | Possibly add `"sac_decoration"` and `"petit_coussin"` types, or use existing generic type |
| Dashboard → Products → New | N/A | Create the new products via the admin UI with correct prices, photos, stock |

**Note:** Need photos of the sac and petit coussins from the client.

---

### 3. Replace "6 salons" with "6 majlis"

**What:** In the checkout summary/recap, when showing the count of seating pieces, the text says "salon(s)" in French. Should say "majlis" everywhere.

**Where:** This comes from the translation key `checkout.summary.majlisCount`.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/messages/fr.json` | `checkout.summary.majlisCount` | Change `"{count} salon(s)"` → `"{count} majlis"` |
| `src/messages/fr.json` | Multiple keys using "salon" | Audit and replace "salon" with "majlis" where appropriate (see list below) |

**French keys to audit:**
- `common.cta.designYourMajlis` = `"Créez votre salon"` → `"Créez votre majlis"`
- `common.cta.designNow` = `"Créez votre salon maintenant"` → `"Créez votre majlis maintenant"`
- `common.cta.calculateNow` = `"Calculer votre salon maintenant"` → `"Calculer votre majlis maintenant"`
- `home.products.fullSet` = `"Salon complet"` → `"Majlis complet"`
- `home.roomConfigs.badge` = `"Configurations de salons"` → `"Configurations de majlis"`
- `checkout.step1.selectProductTitle` = `"Choisissez le type de salon"` → `"Choisissez le type de majlis"`
- `thankYou.whatsapp.majlisTypeLabel` = `"Type de salon :"` → `"Type de majlis :"`
- `shipping.methodTitle` = `"Méthode de livraison des salons (Majlis)"` — already has "(Majlis)", keep or simplify

**English key to fix:**
- `contact.subtitle` — contains stray "salon" → should say "majlis"

---

### 4. Add Google Maps localization link

**What:** Update the Google Maps embed on the contact page to use the correct location link: `https://maps.app.goo.gl/1sTqyxkBeMzupPF4A`

**Where:** Contact page — currently has a generic Dakhla embed.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/[locale]/contact/page.tsx` | ~648-660 | Update the iframe `src` to embed the correct Google Maps link |

---

### 5. Remove mention of "coussins supplementaires" (extra cushions)

**What:** The extra cushion count is internal manufacturing info and should NOT be shown to the customer. Remove or hide the "وسادة إضافية" (extra wssada) line from the customer-facing recap.

**Where:** Checkout summary sidebar shows `وسادة إضافية ×{count}` as a separate line item at 300 DH each.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/[locale]/checkout/page.tsx` | ~2953-2970 (summary line items) | Remove or hide the `extraWssada` line from the visible summary. Keep it in the pricing calculation but don't display it separately |
| `src/app/[locale]/thank-you/page.tsx` | Check if extra wssada is shown | Same — hide from customer view |
| `src/app/api/send-order-email/route.ts` | Check email template | Ensure "coussin supplementaire" / "extra wssada" is NOT in the customer email |

---

### 6. Language button on mobile must be more visible

**What:** The language switcher on mobile is not prominent enough. Should be as visible as the desktop version (with flags and full names).

**Where:** Mobile navbar menu.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingNavbar.tsx` | Mobile menu section (LanguageSwitcher compact mode) | Change from `compact` variant to `buttons` variant, or increase size/prominence of the compact switcher |
| `src/components/LanguageSwitcher.tsx` | Compact mode styling | Possibly increase font size, add flags, make more visually prominent |

---

### 7. Add scroll/arrow indicator for product gallery

**What:** Add a visual indicator (arrow or hint) so the client knows they can swipe/scroll horizontally to see more product models in the product rows.

**Where:** Landing page products section — the horizontal scroll product rows.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingProducts.tsx` | Product row scroll area | Add a visible scroll indicator / swipe hint animation, especially on mobile. The desktop already has left/right arrow buttons, but mobile needs a swipe hint |

---

### 8. Add "voir plus" (see more) indication on product sections

**What:** Add a "voir plus" / "see more" text or button to indicate there are more products available beyond what's currently visible.

**Where:** Landing page product category cards and product rows.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingProducts.tsx` | Category cards section + product rows | Add "voir plus" links/buttons. The "Voir tout" button already exists per-category row — may need to make it more prominent or add one to the category cards grid |
| `src/messages/ar.json`, `fr.json`, `en.json` | Add new key if needed | e.g., `common.cta.seeMore` |

---

### 9. Category card backgrounds — change from white to light brown

**What:** The category cards (Majlis sur mesure, Majlis prets, Accessoires, etc.) have white backgrounds that make them invisible. Change to a light brown/coffee color (`9ahwi khfif`).

**Where:** Landing page products section — the category filter/navigation cards.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingProducts.tsx` | Category cards grid styling | Change card background from white/cream to a light brown (e.g., `#D4A574` at 15% opacity, or `#F0E0CC`) |

---

### 10. Sub-products per category (separate listings per model)

**What:** Each product category should allow separate listings for each sub-product/model. Example: clicking "Jelsa Lecture" should show 6 different models, each as an independent product with its own stock, photos, and price.

**Where:** This is a **data/product structure** change. The system already supports multiple products per category. The issue is that products may not be created as individual items in the dashboard.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| Dashboard → Products | N/A | Create individual product entries for each model within each category, each with own stock/photos/price |
| `src/app/[locale]/products/ProductsPageContent.tsx` | N/A | Verify the products grid displays all sub-products correctly per category |

**Note:** This is primarily a content/data task, not a code change. The existing product system already supports this.

---

### 11. Link pouf stock between individual poufs and salon poufs

**What:** Individual pouf stock (sold separately) should be linked to/shared with salon pouf stock (sold as part of custom majalis). Some pouf models will NOT be linked to salons.

**Where:** Stock management system. Currently, `fabricVariants.stock.poufs` (salon poufs) and `products.inventory.stockQuantity` (individual poufs) are completely separate.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `convex/orders.ts` | ~620-623 (pouf stock deduction) | When deducting salon pouf stock, also deduct from the linked individual pouf product |
| `convex/products.ts` | `updateInventory` function | When updating individual pouf stock, also update the linked fabric variant pouf stock |
| `convex/schema.ts` | `fabricVariants` or `products` table | Add a linking field (e.g., `linkedProductId` on fabricVariants, or `linkedFabricVariantId` on products) |
| `src/app/dashboard/stock/page.tsx` | Stock UI | Show the linked stock relationship in the UI |

**Complexity:** HIGH — requires careful bidirectional sync logic to avoid race conditions.

---

### 12. Stock ceiling linked to available stock (max order quantity = available stock)

**What:** The maximum quantity a client can order for any product should be capped at the available stock quantity, not a hardcoded number.

**Where:** Multiple places where quantity is controlled.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/[locale]/checkout/page.tsx` | ~1025 | Change `Math.min(10, poufsStock)` → `poufsStock` (remove the hard cap of 10) |
| `src/components/product/ProductDetails.tsx` | ~216-220 | Add max quantity check: `quantity <= stockQuantity` |
| `src/components/CartSidebar.tsx` | ~502-516 | Add stock check on quantity increment |
| `src/app/[locale]/checkout/direct/page.tsx` | Quantity controls | Cap quantity at stock level |

---

### 13. "Nos produits" text slightly offset in top navbar

**What:** The "Nos produits" nav link text is slightly misaligned/offset in the navigation bar.

**Where:** Desktop navbar.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingNavbar.tsx` | Desktop nav links section | Adjust alignment/padding of the "Nos produits" dropdown trigger |

---

### 14. Update social media links

**What:** Add/update all social media links with correct URLs:
- Facebook: `https://www.facebook.com/profile.php?id=61550496458618`
- Instagram: `https://www.instagram.com/dakhlamajalis/`
- TikTok: `https://www.tiktok.com/@dakhlamajalis`
- YouTube: `https://www.youtube.com/@DakhlaMajalis`

**Where:** Footer currently has generic placeholder links (`https://instagram.com`, `https://facebook.com`). Also need to ADD TikTok and YouTube icons.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingFooter.tsx` | Social icons section (hardcoded URLs) | Update Instagram + Facebook URLs, add TikTok + YouTube icons with correct links |

---

### 15. Add items to navbar dropdown menu

**What:** Add these items to the navigation dropdown:
- Nos realisations (client photos → links to gallery)
- Coup de coeur (featured stories — NEW section, see #18)
- Bloc (unclear — needs clarification)
- About us (links to about us section)

**Where:** Desktop + mobile navigation menu.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingNavbar.tsx` | Nav links array / desktop menu + mobile menu | Add new navigation items linking to the corresponding sections/pages |
| `src/messages/ar.json`, `fr.json`, `en.json` | `common.nav` section | Add translation keys for new nav items |

---

### 16. Change "depuis 1985" to "depuis 2023"

**What:** The footer description says the brand has been active since 1985. Should be 2023.

**Where:** Footer description text — translation key `common.footer.description`.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/messages/ar.json` | `common.footer.description` | Change `منذ 1985` → `منذ 2023` |
| `src/messages/fr.json` | `common.footer.description` | Change `depuis 1985` → `depuis 2023` |
| `src/messages/en.json` | `common.footer.description` | Change `since 1985` → `since 2023` |

---

### 17. Add "Informations" section title in footer with page links

**What:** Add an "Informations" heading in the footer grouping these links:
- Conditions generales de vente → `/conditions-generales-de-ventes`
- Politique de retour → `/politiques-de-retour`
- Livraison → `/shipping`

**Where:** Footer — these links already exist in the "Liens rapides" column. The request is to separate them under their own "Informations" heading.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingFooter.tsx` | Quick links section | Create a separate "Informations" column with the 3 info page links, remove them from "Liens rapides" |
| `src/messages/ar.json`, `fr.json`, `en.json` | `common.footer` section | Add `informations` key for the heading |

---

### 18. Add "Coup de coeur" section (featured stories)

**What:** A new section showcasing 3 featured stories with embedded videos that play on-site (not redirecting to YouTube):

1. **Bohemian Kitchen day in Dakhla** — YouTube embed: `https://youtu.be/bE2o0V7aklE`
   - FR: "Une journee a Dakhla avec Bohemian Kitchen — Decouverte de la cuisine sahraouie"
   - AR: "يوم كامل في الداخلة مع بوهيما كيتشن — اكتشاف المطبخ الصحراوي"

2. **SIAM Meknes 2025** — Google Photos album: `https://photos.app.goo.gl/ZMKcEdvhyerWCbCU6` (photos + video link)
   - FR: "Notre savoir-faire au SIAM Meknes 2025 — Realisation du stand de la region Dakhla Oued Eddahab"
   - AR: "عرض خبرتنا في معرض الفلاحة الدولي بمكناس 2025 — تصميم جناح جهة الداخلة وادي الذهب"

3. **Dragon Island adventure** — YouTube embed: `https://youtu.be/omFoSlLjD54`
   - FR: "Notre aventure a l'Ile du Dragon — Majlis mobile au sommet"
   - AR: "مغامرتنا في جزيرة التنين — المجلس الصحراوي المتنقل على القمة"

**Where:** New landing page section. Should be added to the page layout.

**Files to create/change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/components/landing/LandingCoupDeCoeur.tsx` | NEW FILE | Create new section component with 3 story cards, each with embedded YouTube iframe or photo gallery |
| `src/components/landing/index.ts` | Exports | Add export for new component |
| `src/app/[locale]/page.tsx` | Section order | Add `LandingCoupDeCoeur` to the page |
| `src/messages/ar.json`, `fr.json`, `en.json` | New `coupDeCoeur` namespace | Add all translation keys for the 3 stories |

---

### 19. Display poufs vertically + remove 4-pouf cap

**What:** Show poufs in a vertical layout (not horizontal). Remove the maximum cap on poufs per order (currently hardcoded at 10, doc says 4 — the cap should be removed or set to stock level).

**Where:** Checkout page pouf selection section.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/[locale]/checkout/page.tsx` | ~2409-2504 (pouf UI) + ~1025 (maxPoufsCount) | Change layout to vertical. Remove `Math.min(10, ...)` cap — use stock as the only limit |

---

### 20. Poufs don't display for single-wall (1 mur) configurations

**What:** The pouf toggle/selection doesn't appear when the room layout is "single-wall" (1 wall).

**Where:** Checkout page — the pouf section visibility condition.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/[locale]/checkout/page.tsx` | ~2409 (condition `poufsStock > 0`) | Check if there's an additional condition filtering out single-wall layouts. Ensure poufs show for ALL layout types |

---

### 21. Update "next steps" text on thank-you page

**What:** Update the steps shown after order confirmation:

**For salons and tents (room_measurement orders):**
1. نقوم بمراجعة طلب الزبون
2. نتواصل مع الزبون لتأكيد الطلب وتأكيد طريقة دفع التسبيق
3. بعد استلام التسبيق نبدأ في تصنيع الطلب
4. نقوم بتوصيل الطلب للزبون في مدة ما بين 10 و20 يوماً من تاريخ دفع التسبيق

**For individual articles (direct_purchase orders):**
1. نقوم بمراجعة طلب الزبون
2. نتواصل مع الزبون لتأكيد الطلب وتأكيد طريقة دفع التسبيق
3. بعد استلام التسبيق نبدأ في تصنيع الطلب
4. نقوم بتوصيل الطلب للزبون في مدة ما بين 5-7 يوماً من تاريخ دفع التسبيق

**Also change the deposit confirmation text to:**
`يتم تأكيد الطلب بعد التواصل معكم ودفع تسبيق بنسبة 50%`
Instead of the current: `لتأكيد طلبك، قم بتحويل التسبيق (50%) إلى أحد الحسابات التالية`

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/messages/ar.json` | `thankYou.nextSteps.roomMeasurement.*` | Update all 4 step texts for salons |
| `src/messages/ar.json` | `thankYou.nextSteps.directPurchase.*` | Update all 4 step texts for individual articles (5-7 days) |
| `src/messages/ar.json` | `thankYou.payment.description` | Change deposit instruction text |
| `src/messages/fr.json` | Same keys | Translate to French |
| `src/messages/en.json` | Same keys | Translate to English |

---

## DASHBOARD / ADMIN CHANGES

---

### 22. Order notes not saving/displaying properly

**What:** Notes entered per order don't appear anywhere in the dashboard. The notes field exists in the schema and is saved, but the order detail page only displays notes — there's no inline editing UI.

**Where:** Order detail page.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/orders/[id]/page.tsx` | ~1052-1060 (notes display) | Add an editable text area for notes with save button. Wire it to `updateOrder` mutation with `notes` field |
| `convex/orders.ts` | ~869-897 (`updateOrder`) | Already supports `notes` update — no change needed here |

---

### 23. New order statuses for salon orders

**What:** Add these new statuses specifically for salon/custom orders:
1. Brouillon (Draft) — already exists
2. En attente de paiement — already exists
3. Confirme stock reduit — already exists
4. **En production: tissu et ponj** — NEW (split from current "En production")
5. **Livree - ponj** — NEW (foam delivered, can be step 5 or 6)
6. **En cours de livraison tissu** — NEW (fabric in transit)
7. **Livree - tissu** — NEW (fabric delivered, can be step 6 or 7)

Keep old statuses for individual article orders (`direct_purchase`).

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `convex/schema.ts` | ~432-440 (status union) | Add new status values: `"in_production_tissu_ponj"`, `"delivered_ponj"`, `"shipping_tissu"`, `"delivered_tissu"` |
| `src/app/dashboard/orders/[id]/page.tsx` | ~36-86 (STATUS_CONFIG) + ~185-200 (progression logic) | Add new statuses with labels, icons, colors. Conditionally show salon-specific or individual-article statuses based on `order.orderType` |
| `convex/orders.ts` | ~438-445 (stock deduction triggers) | Update deduction/restoration logic for new statuses |
| `src/app/dashboard/orders/page.tsx` | ~301-304 (status display mapping) | Map new statuses to display categories |
| `src/app/api/send-status-email/route.ts` | Email status text | Add email text for new statuses |

**Complexity:** HIGH — affects stock logic, email templates, and status progression validation.

---

### 24. Allow deleting clients

**What:** Add a delete button to the customers page. The `deleteCustomer` mutation already exists in Convex but there's no UI button for it.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/customers/page.tsx` | ~190-237 (table rows) + ~239-328 (drawer) | Add a delete button (with confirmation dialog) to each customer row or in the customer detail drawer |

---

### 25. Stock minimum threshold — define and filter by low stock

**What:** Allow defining the minimum stock threshold per product and add a filter to show only low-stock items.

**Where:** The `lowStockThreshold` field already exists in the schema. The stock page already shows a low-stock alert strip. Need to add a filter button and the ability to edit the threshold.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/stock/page.tsx` | ~827-843 (low stock alert) | Add a toggle/filter button to show ONLY low-stock items. Add inline editing of `lowStockThreshold` per product |
| `src/app/dashboard/products/[id]/page.tsx` | Product edit form | Ensure `lowStockThreshold` is editable in the product form |

---

### 26. Manual stock input — allow typing the number directly

**What:** In addition to the +/- buttons, allow direct manual entry of stock quantities (typing the number).

**Where:** Stock management page — currently uses step-based +/- buttons only.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/stock/page.tsx` | ~601-656 (fabric variant stock rows) + ~868-954 (product stock rows) | Add a click-to-edit or input mode on the stock number display, allowing direct number entry |

---

### 27. Remove "zerbiya" line if it has no function

**What:** In the stock page, the Zerbiya line appears but may have no current function (the zerbiya feature was deactivated in checkout). Consider removing it or clarifying its purpose.

**Where:** Stock page fabric variant rows.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/stock/page.tsx` | Zerbiya stock rows | Hide or remove the Zerbiya row if the feature is deactivated. Or keep it if the client wants to re-enable later — needs clarification |

**Note:** The zerbiya toggle in the checkout (`src/app/[locale]/checkout/page.tsx` ~2337-2407) is fully commented out. The schema still supports it. Suggest discussing with client whether to remove entirely or keep hidden.

---

### 28. Cushion logic question — models without small cushions

**What:** Sometimes a model doesn't have small cushions (petit coussins). Question: will the system still propose them?

**Answer from codebase:** The cushion (wssada) distribution is mathematically calculated based on wall measurements, not product model. Every wall gets cushions regardless. The client acknowledged they'll manually verify and adjust during order confirmation.

**Action:** No code change needed. This is acknowledged as a manual verification step.

---

### 29. What is "coudoire/zerbiya" in individual stock products?

**What:** Client is asking what the "wssada coudoire zerbiya" items are in the individual stock products list.

**Answer from codebase:** These are the mandatory component products created by `initializeMandatoryProducts()`:
- **Glssa** (assise/seat base)
- **Wssada** (back cushion)
- **Coudoir** (armrest)
- **Zerbiya** (carpet)

These are internal manufacturing components, not customer-facing products. They appear in stock because `trackInventory: true` was set.

**Action:** Clarify with client. If these should be hidden from the individual products stock tab, filter them out.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/stock/page.tsx` | Products tab filtering | Optionally filter out `isMandatory: true` products from the individual products stock view |

---

### 30. Order status only changes for cancelled orders

**What:** In the orders list page, the status dropdown only shows/works for cancelled orders. Other statuses don't display or can't be changed from the list view.

**Where:** Orders list page + order detail page.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/orders/[id]/page.tsx` | ~185-200 (status progression logic) | Debug the progression logic — `canTransitionTo` may be too restrictive. Ensure all valid forward transitions are allowed |
| `src/app/dashboard/orders/page.tsx` | ~301-304 (status display) | Check if the status badge/display is correctly mapping all status values |

---

### 31. Email recap must NOT mention "coussin supplementaire"

**What:** The order confirmation email should not mention extra/supplementary cushions. Show only the total count of jelsa + coussin + coudoire.

**Where:** Order confirmation email template.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/api/send-order-email/route.ts` | Email HTML template section | Remove any "extra wssada" or "supplementary cushion" line items. Show only aggregated totals: total jelsa count, total coussin count, total coudoire count |
| `src/app/api/send-layout-update-email/route.ts` | Email template | Same — remove extra wssada breakdown |

---

### 32. Export orders to Excel

**What:** Add the ability to export client orders to an Excel file from the dashboard.

**Where:** Orders page — new "Export" button.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/orders/page.tsx` | Header section | Add an "Exporter Excel" button |
| `package.json` | Dependencies | Add `xlsx` or `exceljs` library |
| New utility or inline logic | N/A | Create export function that formats order data (ref, client, products, amount, status, date) into Excel format and triggers download |

**Complexity:** MEDIUM — need to add a library and build the export logic.

---

### 33. Minimum cushion size: 80 instead of 83

**What:** Change the minimum regular wssada (cushion) size from 83cm to 80cm.

**Where:** Geometry calculator constants.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/lib/ai-room-visualizer/geometry-calculator.ts` | ~29 (`WSSADA_REGULAR_MIN = 83`) | Change to `WSSADA_REGULAR_MIN = 80` |
| `src/lib/ai-room-visualizer/piece-distributor.ts` | Any hardcoded `83` references | Update to match new minimum |
| `src/lib/ai-room-visualizer/SYSTEM_LOGIC.md` | Documentation | Update the documented minimum |

**Impact:** This widens the valid cushion range from [83-90] to [80-90], which means the zero-void solver has more flexibility. May produce slightly different piece distributions for some room dimensions. Should test with existing orders to verify.

---

### 34. Download invoice button for orders

**What:** Add a button to download a PDF invoice for each order, containing:
- Company info: **STE SUD ACADEMY SARL AU**, RC: 24721, ICE: 003298639000013
- Address: Rue Ouhfrit Hay El Masjid N°20-Dakhla
- Phone: +212657059044
- RIB: 230530518868222102590036
- Article image
- Quantity
- Unit price
- Total price per item
- Grand total
- Payment method (modalite de paiement)

**Where:** Order detail page + orders list page.

**Files to create/change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `package.json` | Dependencies | Add PDF generation library (e.g., `jspdf`, `@react-pdf/renderer`, or `pdfmake`) |
| `src/app/dashboard/orders/[id]/page.tsx` | Header/actions section | Add "Telecharger facture" button |
| New file: `src/lib/invoice-generator.ts` (or similar) | NEW FILE | Create invoice PDF generation logic with all required fields |

**Complexity:** HIGH — requires PDF library, layout design, image embedding, and data formatting.

---

### 35. Dashboard download should include full order package

**What:** When clicking download in the dashboard, the downloaded document should include:
- Photo of the chosen model
- Detail and total price of the order
- The floor plan schema
- Measurements + total articles count
- Company info (same as #34)

**Where:** Order detail page download button. Currently only downloads the layout JPEG.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/orders/[id]/page.tsx` | ~251-268 (`handleDownloadImage`) | Extend or replace with a full PDF download that includes all requested info |

**Note:** This overlaps significantly with #34. Both should be part of the same invoice/PDF generation feature.

---

### 36. Dashboard access for additional email

**What:** Grant dashboard access to: `Tahir.chraiat@gmail.com`

**Where:** Admin email whitelist in environment variables.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `.env.local` | `ADMIN_EMAILS` variable | Add `Tahir.chraiat@gmail.com` to the comma-separated list |

**Note:** Per user instructions, I cannot edit `.env.local`. The user must add this email manually.

---

### 37. Combined cart for custom salon + individual articles

**What:** Allow ordering a custom salon (majlis sur mesure) AND individual articles (table cuivre, jelsa kharajat, tente, etc.) in a single order/cart. Currently, custom salon orders bypass the cart entirely — the client must make two separate orders.

**Where:** This is an architectural change to how the checkout flow works.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/[locale]/checkout/page.tsx` | Step 3 (delivery/submission) | After completing the custom salon config, allow adding individual items before submitting |
| `src/contexts/CartContext.tsx` | Cart logic | Support a "custom salon" item type in the cart alongside regular items |
| `src/components/CartSidebar.tsx` | Cart display | Show both custom salon summary and individual items together |
| `convex/orders.ts` | `createRoomMeasurementOrder` | Accept additional `directPurchaseItems` alongside the room measurement data |
| `convex/schema.ts` | Orders table | Add field for mixed-type orders |

**Complexity:** VERY HIGH — fundamental architectural change affecting cart, checkout, order creation, stock deduction, email, and thank-you page.

---

### 38. Schema/floor plan display issue in dashboard

**What:** Some order schemas/floor plans display incorrectly in the dashboard (squished, rotated, or wrong proportions).

**Where:** Order detail page — design visualization section.

**Files to change:**
| File | Lines | What to fix |
|------|-------|-------------|
| `src/app/dashboard/orders/[id]/page.tsx` | ~451-558 (design visualization) | Debug the image rendering — check if `maxWidth`/`maxHeight` constraints are causing distortion. May need `object-fit: contain` or proper aspect ratio handling |
| `src/lib/ai-room-visualizer/svg-generator.ts` | SVG generation | Check if the SVG viewBox and dimensions are correct for all layout types, especially large U-shapes and 4-wall layouts |

---

## STATUS TRACKER (Updated 2026-03-17)

> **36/38 COMPLETE** — Only 2 data/content tasks remain.

### COMPLETED (34 code changes)
- [x] #1 — Fix RTL price display (`dir="ltr"` spans across 4 files)
- [x] #3 — Replace "salon" with "majlis" (9 FR keys, 2 EN keys)
- [x] #4 — Update Google Maps link (contact page iframe)
- [x] #5 — Hide extra cushion from customer (folded into majlis price)
- [x] #6 — Mobile language button (bigger buttons, flags, 48px tap targets)
- [x] #7 — Scroll/swipe indicators (animated chevron + gradient fade)
- [x] #8 — "Voir tout" more prominent (pill-shaped button with border)
- [x] #9 — Category card backgrounds (changed to `#F0E0CC`)
- [x] #11 — Link pouf stock individual <-> salon (bidirectional sync + badges)
- [x] #12 — Stock ceiling on quantities (caps at available stock)
- [x] #13 — "Nos produits" alignment (3-column navbar layout, tuned for FR/EN/AR)
- [x] #14 — Social media links (FB, IG, TikTok, YT with correct URLs)
- [x] #15 — Navbar dropdown items (gallery, coup de coeur, about us)
- [x] #16 — 1985 to 2023 (all 3 translation files)
- [x] #17 — "Informations" footer section (separate column with 3 links)
- [x] #18 — Coup de Coeur section (new LandingCoupDeCoeur component, 3 stories + YouTube)
- [x] #19 — Poufs vertical + remove cap (vertical layout, stock-based max)
- [x] #20 — Poufs for single-wall (simplified to `poufsStock > 0`)
- [x] #21 — Thank-you page steps (updated AR/FR/EN, correct delivery times)
- [x] #22 — Order notes editing (editable textarea with save/cancel)
- [x] #23 — New order statuses for salons (4 new statuses, separate progression per order type)
- [x] #24 — Delete clients button (trash icon + confirmation dialog)
- [x] #25 — Low stock filter (toggle button)
- [x] #26 — Manual stock input (click-to-edit number input)
- [x] #27 — Hide zerbiya rows (collapsible toggle)
- [x] #29 — Hide mandatory products from stock (filtered out)
- [x] #30 — Fix order status progression (removed hard throws, pre-selects next valid status)
- [x] #31 — Email recap hides extra cushions (aggregated totals + additional items added to email)
- [x] #32 — Excel export (CSV with UTF-8 BOM)
- [x] #33 — Cushion minimum 83 to 80 (updated constant + docs)
- [x] #34 — Invoice PDF (html2pdf.js direct download, Arabic product names, company info)
- [x] #35 — Full order package download (merged with #34: products, pricing, floor plan, measurements)
- [x] #37 — Combined cart salon + individual ("Add More Items" section on step 3)
- [x] #38 — Schema display fix (proper CSS aspect ratio handling)

### NO CODE CHANGE NEEDED (2 items)
- [x] #28 — Cushion logic question (acknowledged as manual verification step)
- [x] #36 — Dashboard access for email (user added to .env.local manually)

### STILL PENDING (2 data/content tasks)
- [ ] #2 — New supplement products (sac de decoration 300 DH, petit coussins 40x40 200 DH) — needs product photos, then create in dashboard
- [ ] #10 — Sub-products per category (create individual product entries per model in dashboard) — data entry task, code already supports it
