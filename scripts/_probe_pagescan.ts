/** TEMPORARY probe (deleted after use): report what the page-scan parser finds. */
import { readFileSync } from 'node:fs';
import { parsePageScanHtml, type ChapterMarkerShape, type BekkerContainer } from './import-aristotle-rest-en-shared/pagescan.ts';

const EE_FURNITURE = ['ETHICA EUDEMIA', 'DE VIRTUTIBUS ET VITIIS', 'BOOK I', 'BOOK II', 'BOOK III', 'BOOK VII', 'BOOKS IV, V, VI = ETH. N. BKS. V, VI, VII.', 'ANALYTICA PRIORA'];

const cases: { file: string; shape: ChapterMarkerShape; bek: BekkerContainer; bookRe?: RegExp; front?: boolean }[] = [
  { file: 'import-eudemian-ethics-en/raw/eudemian-ethics-book-1.parse.json', shape: 'leading-bold', bek: 'span.wst-verse' },
  { file: 'import-eudemian-ethics-en/raw/eudemian-ethics-book-2.parse.json', shape: 'leading-bold', bek: 'span.wst-verse' },
  { file: 'import-eudemian-ethics-en/raw/eudemian-ethics-book-3.parse.json', shape: 'leading-bold', bek: 'span.wst-verse' },
  { file: 'import-eudemian-ethics-en/raw/eudemian-ethics-book-7.parse.json', shape: 'leading-bold', bek: 'span.wst-verse' },
  { file: 'import-virtues-and-vices-en/raw/virtues-and-vices.parse.json', shape: 'leading-bold', bek: 'span.wst-verse' },
  { file: 'import-prior-analytics-en/raw/prior-analytics-book-1.parse.json', shape: 'wst-anchor', bek: 'span.wst-bekker' },
  { file: 'import-prior-analytics-en/raw/prior-analytics-book-2.parse.json', shape: 'wst-anchor', bek: 'span.wst-bekker' },
  { file: 'import-de-plantis-en/raw/on-plants.parse.json', shape: 'sidenote-number', bek: 'span.wst-sidenote', bookRe: /^BOOK\s+[IVX]+$/i, front: true },
];

for (const c of cases) {
  const html = (JSON.parse(readFileSync(`scripts/${c.file}`, 'utf8')) as { parse: { text: { '*': string } } }).parse.text['*'];
  const r = parsePageScanHtml(html, {
    where: c.file, markerShape: c.shape, bekkerContainer: c.bek, bookHeadingRe: c.bookRe,
    startAtFirstBookHeading: c.front, furnitureExact: EE_FURNITURE,
  });
  process.stdout.write(`\n### ${c.file}  blocks=${r.blockCount} synthetic=${r.syntheticParagraphs}\n`);
  process.stdout.write(`  chapters: ${r.chapters.map((x) => `${x.book ?? '-'}:${x.number}`).join(' ')}\n`);
  const chars = r.chapters.reduce((n, x) => n + x.passages.reduce((m, p) => m + p.text.length, 0), 0);
  process.stdout.write(`  footnotes=${r.footnoteRefsStripped} truncated=${JSON.stringify(r.truncated)} chars=${chars}\n`);
  const f = r.chapters[0];
  const l = r.chapters[r.chapters.length - 1];
  process.stdout.write(`  first: ${JSON.stringify((f?.passages[0]?.text ?? '').slice(0, 65))}\n`);
  process.stdout.write(`  last : ${JSON.stringify((l?.passages[l.passages.length - 1]?.text ?? '').slice(-65))}\n`);
}
