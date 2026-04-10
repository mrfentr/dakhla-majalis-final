import fs from 'fs';

const a = JSON.parse(fs.readFileSync('src/messages/ar.json','utf-8'));
const e = JSON.parse(fs.readFileSync('src/messages/en.json','utf-8'));
const f = JSON.parse(fs.readFileSync('src/messages/fr.json','utf-8'));

function countKeys(obj) {
  let c = 0;
  for (const k in obj) {
    if (typeof obj[k] === 'string') c++;
    else c += countKeys(obj[k]);
  }
  return c;
}

function getKeys(obj, prefix = '') {
  let r = [];
  for (const k in obj) {
    const fp = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'string') r.push(fp);
    else r.push(...getKeys(obj[k], fp));
  }
  return r;
}

console.log('ar:', countKeys(a), 'keys');
console.log('fr:', countKeys(f), 'keys');
console.log('en:', countKeys(e), 'keys');

const arKeys = getKeys(a);
const enKeys = getKeys(e);
const frKeys = getKeys(f);

const missingEn = arKeys.filter(k => !enKeys.includes(k));
const missingFr = arKeys.filter(k => !frKeys.includes(k));

console.log('\n--- Missing from en.json:', missingEn.length, '---');
if (missingEn.length > 0) {
  // Group by top namespace
  const groups = {};
  for (const k of missingEn) {
    const ns = k.split('.')[0];
    if (!groups[ns]) groups[ns] = [];
    groups[ns].push(k);
  }
  for (const [ns, keys] of Object.entries(groups)) {
    console.log(`  ${ns}: ${keys.length} missing`);
  }
}

console.log('\n--- Missing from fr.json:', missingFr.length, '---');
if (missingFr.length > 0) {
  const groups = {};
  for (const k of missingFr) {
    const ns = k.split('.')[0];
    if (!groups[ns]) groups[ns] = [];
    groups[ns].push(k);
  }
  for (const [ns, keys] of Object.entries(groups)) {
    console.log(`  ${ns}: ${keys.length} missing`);
  }
}
