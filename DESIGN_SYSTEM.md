# Dakhla Majalis Design System

This document defines the **exact** styling and branding for Dakhla Majalis. We are building a **premium, elegant event hall booking platform**.
**Goal:** Avoid the "generic AI template" look by strictly adhering to these specific micro-details in typography, color, and interaction design.

## 🎨 Color Palette (Stone & Majalis Brown)

We use **Stone** for neutrals to give a warm, elegant, and natural feel. We use **Majalis Brown** for our primary brand color to signify warmth, luxury, and cultural authenticity.

### 🟤 Primary Brand (Majalis Brown)
- **Primary**: `#A3693E` (Majalis-600 - our hero color)
- **Hover/Active**: Use `bg-majalis-600/90` or `bg-majalis-700`
- **Subtle Backgrounds**: `bg-majalis-50` (or `bg-majalis-brand/10`)
- **Active Nav Text**: `text-majalis-700`
- **Focus Rings**: `ring-majalis-500/20` (Note the `/20` opacity - crucial for a premium feel)

### ⚪️ Neutrals (Stone)
**Do not use Slate, Gray, Neutral, or Zinc. Use Stone.**
- **Primary Text**: `text-stone-900` (Headings, strong values)
- **Secondary Text**: `text-stone-500` (Subtitles, metadata, inactive icons)
- **Tertiary/Labels**: `text-stone-400` (Search icons, menu section headers)
- **Borders**: `border-stone-200`
- **Subtle Backgrounds**: `bg-stone-50` or `bg-stone-50/50` (for empty states)
- **Hover Backgrounds**: `bg-stone-50` or `bg-stone-100`

---

##  Typography "Micro-Details"

The "premium" feel comes from specific tracking and weight choices.

### Headings
- **Page Title**: `text-2xl font-bold text-stone-900 tracking-tight`
    - *Note:* The `tracking-tight` is essential.
- **Card Title**: `font-semibold text-stone-900`

### UI Text
- **Body Default**: `text-sm` (Not `text-base` - this is a dashboard)
- **Subtitles**: `text-sm text-stone-500`
- **Buttons**: `text-sm font-medium`
- **Data Values**: `text-sm font-medium text-stone-900` (e.g., Order Numbers, Prices)
- **Monospace**: `font-mono text-xs` (For financial data, IDs, or precise metrics)

### Sidebar/Section Labels
- **Style**: `text-[10px] font-bold uppercase tracking-wider text-stone-400`
    - *Note:* This specific combo (10px + uppercase + wide tracking) creates a professional hierarchy.

---

## 🧩 Component "Micro-Interactions"

### 1. Inputs & Search Fields
- **Background**: `bg-white`
- **Border**: `border border-stone-200`
- **Text**: `text-sm`
- **Icon**: `text-stone-400` (Left aligned)
- **Focus State**: `focus:outline-none focus:ring-2 focus:ring-majalis-500/20 focus:border-majalis-500`
    - *Why:* The translucent ring + solid border color change creates a sharp, modern focus state.

### 2. Buttons
- **Primary**:
    - `bg-stone-900 hover:bg-stone-800` (For "Create" actions - creates a strong, serious contrast)
    - `text-white font-medium`
    - `shadow-none` (We prefer a flat, border-based look)
    - `rounded-lg`
- **Secondary / Filter**:
    - `bg-white border border-stone-200`
    - `text-stone-700 font-medium`
    - `hover:bg-stone-50`
    - `rounded-lg`

### 3. Navigation Items (Sidebar)
- **Inactive**: `text-stone-500 hover:text-stone-900 hover:bg-stone-100`
- **Active**: `bg-majalis-50 text-majalis-700`
- **Icon**: `w-4 h-4`
    - Active Icon: `text-majalis-600`
    - Inactive Icon: `text-stone-400 group-hover:text-stone-600`
- **Shape**: `rounded-md` (Distinct from the `rounded-lg` used for buttons)

### 4. Status Indicators (The "Pro" Look)
**Avoid generic colored pills.** Use the "Dot + Label" pattern for a cleaner, data-dense look.
- **Pattern**: `flex items-center gap-2`
- **Dot**: `w-2 h-2 rounded-full`
- **Label**: `text-sm text-stone-700 font-medium`
- **Colors**:
    - **Draft**: `bg-stone-400`
    - **Active/Confirmed**: `bg-blue-500`
    - **Processing**: `bg-amber-500`
    - **Success/Done**: `bg-majalis-500`
    - **Error/Cancel**: `bg-red-500`

### 5. Iconography (Monochrome)
**Avoid colored icons.** Use Stone icons to maintain a unified, professional aesthetic.
- **Default**: `text-stone-500`
- **Container**: `p-1.5 bg-stone-50 rounded-md border border-stone-100` (Optional, for emphasis)

### 6. Progress Bars (High Contrast)
- **Track**: `bg-stone-100`
- **Fill**: `bg-stone-900` (Black fill creates a sharp, precise look)
- **Height**: `h-1` (Thinner is more elegant)

---

## 📐 Layout & Spacing

- **Page Container**: `space-y-6`
- **Header Area**: `flex flex-col sm:flex-row sm:items-center justify-between gap-4`
- **Grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- **Card Padding**: `p-4` or `p-6` depending on density.

---

## 🚀 Implementation Checklist for "The Look"

When building new components, ask:
1. [ ] Am I using `tracking-tight` on the main heading?
2. [ ] Is my secondary text `stone-500`?
3. [ ] Have I removed all drop shadows (`shadow-sm`, etc.)?
4. [ ] Are my focus rings using the `/20` opacity (`ring-majalis-500/20`)?
5. [ ] Am I using `text-sm` for the main UI elements?
6. [ ] Are my borders `stone-200`?
7. [ ] **Am I using "Dot" status indicators instead of colored badges?**
8. [ ] **Are my icons monochrome (Stone-500)?**

**Do not deviate from `Stone` and `Majalis Brown`.**
