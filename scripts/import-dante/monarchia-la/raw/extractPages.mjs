import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const xml = readFileSync(process.argv[2], 'utf8');
const dom = new JSDOM(xml, { contentType: 'text/xml' });
const doc = dom.window.document;
const objects = [...doc.querySelectorAll('OBJECT')];

const pages = objects.map((obj, i) => {
  const usemap = obj.getAttribute('usemap');
  const words = [...obj.querySelectorAll('WORD')].map((w) => w.textContent);
  const lines = [];
  let curLine = [];
  for (const line of obj.querySelectorAll('LINE')) {
    const lw = [...line.querySelectorAll('WORD')].map((w) => w.textContent.trim());
    lines.push(lw.join(' '));
  }
  return { leaf: i + 1, usemap, text: lines.join('\n') };
});

writeFileSync(process.argv[3], JSON.stringify(pages, null, 1), 'utf8');
console.log('wrote', pages.length, 'pages');
