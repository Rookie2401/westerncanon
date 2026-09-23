/**
 * Builds the per-work `about.json` "sections" prose, shared/templated across
 * all 132 work+language directories (never hand-written per work) - mirrors
 * scripts/import-archimedes-shared/aboutText.ts.
 */

import type { PlutarchWorkEntry } from './workTable.ts';
import type { WorkAboutSection } from './genericTypes.ts';
import type { ConvertStats } from './convert.ts';
import type { WalkStats } from './teiWalker.ts';

export interface AboutInput {
  lang: 'grc' | 'en';
  chapterCount: number;
  passageCount: number;
  totalChars: number;
  convertStats: ConvertStats;
  walkStats: WalkStats;
  isDoubleLife: boolean;
}

function citationExample(entry: PlutarchWorkEntry): string {
  if (entry.parts) {
    const p = entry.parts[0];
    return `"${p.n} 3.2"`;
  }
  return `"${entry.engTitle} 3.2"`;
}

export function buildAboutSections(entry: PlutarchWorkEntry, info: AboutInput): WorkAboutSection[] {
  const { lang, chapterCount, convertStats, walkStats, isDoubleLife } = info;
  const langLabel = lang === 'grc' ? 'Greek text' : 'English translation';
  const witness = lang === 'grc' ? entry.grcWitness : entry.engWitness;
  const file = lang === 'grc' ? entry.grcFile : entry.engFile;
  const partsNote = isDoubleLife
    ? ` This work is one of Plutarch's two "double lives" (the other being ${
        entry.tlg === 'tlg051' ? 'Tiberius and Caius Gracchus' : 'Agis and Cleomenes'
      }): the source text itself splits into ${entry.parts!.length} named parts (${entry.parts!
        .map((p) => p.n)
        .join(', ')}), each with its own chapter numbering restarting at 1 - preserved here as a book-level Division per part (id \`book-<part>\`), rather than flattened, since the source's own chapter numbers repeat across parts.`
    : '';

  return [
    {
      heading: `Plutarch's ${entry.engTitle}`,
      paragraphs: [
        `Part of Plutarch's Parallel Lives (Bioi Parálleloi), the ${lang === 'grc' ? 'original Greek' : 'English translation'} of "${entry.engTitle}"${
          entry.grcTitle && lang === 'en' ? ` (Greek: ${entry.grcTitle})` : ''
        }, presented here in ${chapterCount} chapter${chapterCount === 1 ? '' : 's'}.${partsNote}`,
        `The text here is Bernadotte Perrin's ${langLabel}, verbatim. Nothing is modernised, paraphrased or silently corrected.`,
      ],
    },
    {
      heading: 'The edition',
      paragraphs: [
        `Bernadotte Perrin, ed. and trans., Plutarch's Lives, Loeb Classical Library, Vol. ${entry.volRoman} (Cambridge, MA: Harvard University Press; London: William Heinemann Ltd., ${entry.year}).`,
        'The Loeb Classical Library prints Perrin\'s Greek text and his facing English translation together; both are reproduced here as separate editions of the same underlying work, each verbatim in its own language.',
      ],
    },
    {
      heading: 'Digital source',
      paragraphs: [
        `The machine-readable text is the TEI XML file ${file} (CTS urn:cts:greekLit:tlg0007.${entry.tlg}.${witness}) from the Perseus Digital Library / Open Greek and Latin canonical-greekLit repository. It was fetched once (cached at scripts/import-plutarch/raw/) and is bundled with the app; nothing is loaded from the network at runtime.`,
      ],
    },
    {
      heading: 'How it was imported',
      paragraphs: [
        `Imported by a single table-driven importer (scripts/import-plutarch/index.ts + scripts/import-plutarch-shared/) shared across all 66 works of the corpus (132 language editions), not a per-work script. The importer walks the source's chapter${
          isDoubleLife ? '/book' : ''
        } divisions and, for each chapter, joins every paragraph found anywhere in its subtree - across whatever section divisions the source uses - into that chapter's single Passage (separated by a blank line). Only transport/editorial scaffolding is removed: Perseus's own critical/citation apparatus (every <note> and <bibl>, ${walkStats.noteCount} and ${walkStats.biblCount} respectively in this file - never Perrin's own prose), self-closing page and editorial paragraph markers (<pb>, <milestone>, dropped as zero-width), and purely typographic wrapper tags (<q>, <quote>, <foreign>, <cit>, <gloss>, <emph>, <hi>, <l>, <sp>/<speaker>) are unwrapped or dropped per the rules in the importer's own module docs (see scripts/import-plutarch-shared/teiWalker.ts). Entities are decoded and runs of whitespace collapsed; the words themselves are untouched.`,
      ],
    },
    {
      heading: 'Reference scheme',
      paragraphs: [
        `Citation is by chapter number only (Division.number, e.g. ${citationExample(entry)}${
          isDoubleLife ? ' - section is dropped after the second number is folded into the chapter' : ''
        }), matching how the Lives are traditionally cited (chapter.section, e.g. "Theseus 3.2") - Division id is \`ch-N\`${
          isDoubleLife ? ' inside each part (id `book-<part>-ch-N`)' : ''
        }, and its \`number\` renders as "§ N" in this app (intentional - see src/library/genericCorpus.ts). The source's own section subdivisions are preserved as paragraph breaks within each chapter's single joined Passage, not as separately addressable divisions; Passage.n is '' and Passage.ref is null throughout, and Division.ref is always null (this source carries no page-marker citation scheme independent of the chapter/section numbers already captured in the id).`,
      ],
    },
    {
      heading: 'Known gaps & anomalies',
      paragraphs: [
        `See anomalies.json for the full machine-readable list. In summary: ${chapterCount} chapter${
          chapterCount === 1 ? '' : 's'
        }, a clean 1..N sequence${isDoubleLife ? ' within each part' : ''}, matching the traditionally cited chapter count. ${
          convertStats.gapCount
        } editorial gap(s) (<gap reason="lost"/>), ${convertStats.addCount} editorial supplement(s) (<add>), and ${
          convertStats.sicCorrCount
        } manuscript correction(s) (<choice><sic>/<corr>) were preserved and logged exactly as the source marks them; none are silently smoothed over.`,
      ],
    },
  ];
}
