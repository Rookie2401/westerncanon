#!/usr/bin/env node
// Full-text search helper against the archive.org fulltext API for archimedisoperao02arch.
const phrases = JSON.parse(process.argv[2]);
async function search(label, q) {
  const url = `https://ia802800.us.archive.org/fulltext/inside.php?item_id=archimedisoperao02arch&doc=archimedisoperao02arch&path=/4/items/archimedisoperao02arch&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const j = await res.json();
    const matches = (j.matches || []).map(m => ({ page: m.par[0].page, text: m.text.slice(0, 120) }));
    console.log(`=== ${label} ===`);
    console.log(JSON.stringify(matches, null, 0));
  } catch (e) {
    console.log(`=== ${label} === ERROR ${e}`);
  }
}
async function main() {
  for (const [label, q] of Object.entries(phrases)) {
    await search(label, q);
  }
}
main();
