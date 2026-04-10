#!/usr/bin/env node
/**
 * i18n Migration Script
 *
 * Reads ar.json, builds a reverse map (Arabic text → translation key),
 * then scans each component/page file and replaces hardcoded Arabic strings
 * with t('key') calls. Also adds the necessary imports.
 */

import fs from 'fs';
import path from 'path';

// ─── Load Arabic translations ───
const arJson = JSON.parse(fs.readFileSync('src/messages/ar.json', 'utf-8'));

// Build flat reverse map: Arabic text → key path
function buildReverseMap(obj, prefix = '') {
  const map = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      // Normalize whitespace for matching
      const normalized = value.trim();
      if (normalized && /[\u0600-\u06FF]/.test(normalized)) {
        map[normalized] = fullKey;
      }
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(map, buildReverseMap(value, fullKey));
    }
  }
  return map;
}

const arabicToKey = buildReverseMap(arJson);

// Sort by length (longest first) to prevent partial matches
const sortedEntries = Object.entries(arabicToKey).sort((a, b) => b[0].length - a[0].length);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── File → namespace mapping ───
// Each file maps to which namespace(s) its strings come from
const fileConfig = {
  // Landing components
  'src/components/landing/LandingHero.tsx': {
    namespaces: ['home', 'common'],
    type: 'client',
  },
  'src/components/landing/LandingNavbar.tsx': {
    namespaces: ['common'],
    type: 'client',
  },
  'src/components/landing/LandingFooter.tsx': {
    namespaces: ['common'],
    type: 'client',
  },
  'src/components/landing/LandingCTA.tsx': {
    namespaces: ['home', 'common'],
    type: 'client',
  },
  'src/components/landing/LandingFAQ.tsx': {
    namespaces: ['home'],
    type: 'client',
  },
  'src/components/landing/LandingGallery.tsx': {
    namespaces: ['home'],
    type: 'client',
  },
  'src/components/landing/LandingHowItWorks.tsx': {
    namespaces: ['home'],
    type: 'client',
  },
  'src/components/landing/LandingMeasurementTool.tsx': {
    namespaces: ['home', 'common'],
    type: 'client',
  },
  'src/components/landing/LandingProducts.tsx': {
    namespaces: ['home', 'common'],
    type: 'client',
  },
  'src/components/landing/LandingRoomConfigs.tsx': {
    namespaces: ['home', 'common'],
    type: 'client',
  },
  // Product / Cart components
  'src/components/product/ProductDetails.tsx': {
    namespaces: ['productDetail'],
    type: 'client',
  },
  'src/components/CartSidebar.tsx': {
    namespaces: ['cart'],
    type: 'client',
  },
  'src/components/FloatingButtons.tsx': {
    namespaces: ['cart'],
    type: 'client',
  },
  // Pages
  'src/app/[locale]/products/ProductsPageContent.tsx': {
    namespaces: ['products'],
    type: 'client',
  },
  'src/app/[locale]/checkout/page.tsx': {
    namespaces: ['checkout'],
    type: 'client',
  },
  'src/app/[locale]/checkout/direct/page.tsx': {
    namespaces: ['directCheckout'],
    type: 'client',
  },
  'src/app/[locale]/thank-you/page.tsx': {
    namespaces: ['thankYou'],
    type: 'client',
  },
  'src/app/[locale]/contact/page.tsx': {
    namespaces: ['contact'],
    type: 'client',
  },
  'src/app/[locale]/privacy/page.tsx': {
    namespaces: ['privacy'],
    type: 'client',
  },
  'src/app/[locale]/terms/page.tsx': {
    namespaces: ['terms'],
    type: 'client',
  },
  'src/app/[locale]/blog/page.tsx': {
    namespaces: ['blog'],
    type: 'client',
  },
  'src/app/[locale]/blog/[slug]/page.tsx': {
    namespaces: ['blog'],
    type: 'client',
  },
  'src/app/[locale]/not-found.tsx': {
    namespaces: ['notFound'],
    type: 'client',
  },
};

// ─── Replacement logic ───
function replaceArabicInFile(filePath, config) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  const replacements = [];
  const usedNamespaces = new Set();

  // Track which keys we use to determine namespaces
  for (const [arabicText, keyPath] of sortedEntries) {
    if (!content.includes(arabicText)) continue;

    const topNamespace = keyPath.split('.')[0];
    const restKey = keyPath.substring(topNamespace.length + 1);

    // Determine which variable name to use for this namespace
    let tVar;
    if (config.namespaces.length === 1) {
      tVar = 't';
    } else if (topNamespace === config.namespaces[0]) {
      tVar = 't';
    } else {
      tVar = 'tc'; // secondary namespace
    }
    usedNamespaces.add(topNamespace);

    const escaped = escapeRegex(arabicText);

    // 1. Replace JSX text content (between > and <, possibly with whitespace/newlines)
    //    Pattern: >  \n  Arabic text  \n  <
    //    But be careful not to match inside attributes

    // Simple JSX text: the Arabic text is the main content between tags
    // Match: whitespace + Arabic text + whitespace between > ... <
    const jsxRegex = new RegExp(
      `(>)(\\s*?)${escaped}(\\s*?)(<)`,
      'g'
    );
    const jsxBefore = content;
    content = content.replace(jsxRegex, (match, open, ws1, ws2, close) => {
      replacements.push({ key: keyPath, type: 'jsx' });
      return `${open}${ws1}{${tVar}('${restKey}')}${ws2}${close}`;
    });

    // 2. Replace inside string literals (single or double quotes)
    //    "Arabic text" → t('key')
    //    'Arabic text' → t('key')
    const singleQuoteRegex = new RegExp(`'${escaped}'`, 'g');
    content = content.replace(singleQuoteRegex, (match) => {
      replacements.push({ key: keyPath, type: 'string-single' });
      return `${tVar}('${restKey}')`;
    });

    const doubleQuoteRegex = new RegExp(`"${escaped}"`, 'g');
    content = content.replace(doubleQuoteRegex, (match) => {
      replacements.push({ key: keyPath, type: 'string-double' });
      return `${tVar}('${restKey}')`;
    });

    // 3. Replace in template literals (backtick strings)
    //    `Arabic text` → t('key') — only if the whole template is just this text
    const backtickRegex = new RegExp('`' + escaped + '`', 'g');
    content = content.replace(backtickRegex, (match) => {
      replacements.push({ key: keyPath, type: 'template' });
      return `${tVar}('${restKey}')`;
    });

    // 4. Replace Arabic text inside template literal expressions ${...}Arabic text${...}
    //    This catches embedded Arabic in template literals
    const templateEmbedRegex = new RegExp(escaped, 'g');
    // Only run this if we still have remaining occurrences
    if (content.includes(arabicText)) {
      // Check context — only replace if it appears to be in a value context
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(arabicText)) {
          const line = lines[i];
          // Check if it's inside a JSX attribute value: key="Arabic"
          const attrRegex = new RegExp(`(=\\s*)(["'])([^"']*?)${escaped}([^"']*?)\\2`, 'g');
          lines[i] = lines[i].replace(attrRegex, (match, eq, quote, before, after) => {
            replacements.push({ key: keyPath, type: 'attr' });
            if (!before && !after) {
              return `${eq}{${tVar}('${restKey}')}`;
            }
            return match; // Don't replace partial attribute values
          });

          // Check if it's raw text in JSX (not between quotes, not in attributes)
          // This catches multiline text that wasn't caught by the jsxRegex above
          if (lines[i].includes(arabicText)) {
            const trimmedLine = lines[i].trim();
            // If the line is JUST the Arabic text (standalone JSX text node)
            if (trimmedLine === arabicText) {
              lines[i] = lines[i].replace(arabicText, `{${tVar}('${restKey}')}`);
              replacements.push({ key: keyPath, type: 'jsx-standalone' });
            }
          }
        }
      }
      content = lines.join('\n');
    }
  }

  if (replacements.length === 0) {
    console.log(`  ⏭  ${filePath} — no Arabic strings matched`);
    return { changed: false, replacements: 0 };
  }

  // ─── Add imports and hook ───
  const isClient = content.includes("'use client'") || config.type === 'client';
  const primaryNs = config.namespaces[0];
  const secondaryNs = config.namespaces.length > 1 ? config.namespaces[1] : null;
  const usesSecondary = secondaryNs && usedNamespaces.has(secondaryNs);

  // Add useTranslations import
  const importLine = `import {useTranslations} from 'next-intl';`;

  if (!content.includes('useTranslations')) {
    // Add import after the last import line
    const importRegex = /^(import\s.+from\s+['"].+['"];?\s*\n?)(?!import)/m;
    // Find the position after all imports
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
        lastImportIndex = i;
      }
    }
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importLine);
      content = lines.join('\n');
    }
  }

  // Add Link import from i18n/navigation (replace next/link)
  content = content.replace(
    /import\s+Link\s+from\s+['"]next\/link['"];?/,
    "import {Link} from '@/i18n/navigation';"
  );

  // Add useTranslations hook call inside the component function
  // Find the component function and add the hook after the opening
  if (!content.includes("useTranslations(")) {
    // Find pattern: function ComponentName() { or export function ... or export default function ...
    // Also handle: const ComponentName = () => {
    const funcPatterns = [
      // export function Foo() {
      /(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/,
      // export default function({
      /(export\s+default\s+function\s*\([^)]*\)\s*\{)/,
      // function Foo() {
      /((?:^|\n)function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)/,
    ];

    let hookInserted = false;
    for (const pattern of funcPatterns) {
      const match = content.match(pattern);
      if (match) {
        const insertPos = content.indexOf(match[0]) + match[0].length;
        let hookCode = `\n  const t = useTranslations('${primaryNs}');`;
        if (usesSecondary) {
          hookCode += `\n  const tc = useTranslations('${secondaryNs}');`;
        }
        content = content.slice(0, insertPos) + hookCode + content.slice(insertPos);
        hookInserted = true;
        break;
      }
    }

    // Try arrow function components if no match
    if (!hookInserted) {
      // export const Foo = () => {  or  export default () => {
      const arrowPattern = /((?:export\s+(?:default\s+)?)?(?:const\s+\w+\s*=\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*=>\s*\{)/;
      const match = content.match(arrowPattern);
      if (match) {
        const insertPos = content.indexOf(match[0]) + match[0].length;
        let hookCode = `\n  const t = useTranslations('${primaryNs}');`;
        if (usesSecondary) {
          hookCode += `\n  const tc = useTranslations('${secondaryNs}');`;
        }
        content = content.slice(0, insertPos) + hookCode + content.slice(insertPos);
      }
    }
  }

  // Write back
  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`  ✅ ${filePath} — ${replacements.length} replacements`);
  for (const r of replacements.slice(0, 5)) {
    console.log(`     ${r.type}: ${r.key}`);
  }
  if (replacements.length > 5) {
    console.log(`     ... and ${replacements.length - 5} more`);
  }

  return { changed: true, replacements: replacements.length };
}

// ─── Run ───
console.log('🌍 i18n Migration Script');
console.log(`   Loaded ${Object.keys(arabicToKey).length} Arabic → key mappings\n`);

let totalFiles = 0;
let totalReplacements = 0;

for (const [filePath, config] of Object.entries(fileConfig)) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  ${filePath} — file not found, skipping`);
    continue;
  }
  totalFiles++;
  const result = replaceArabicInFile(filePath, config);
  totalReplacements += result.replacements;
}

console.log(`\n🏁 Done! Processed ${totalFiles} files, made ${totalReplacements} replacements.`);
console.log('\n⚠️  Manual review needed:');
console.log('   - Check multi-line text replacements');
console.log('   - Verify template literal replacements');
console.log('   - Check dynamic strings with variables (e.g., `${count} items`)');
console.log('   - Ensure useTranslations hook is inside React component body');
console.log('   - Verify Link imports are from @/i18n/navigation');
