// Maps this app's 234 Greek works to their Diorisis file by TLG author/work number.
// Our importers carry the CTS URN as free text inside about.json's `provenance` (occasionally
// `license`) field, e.g. "urn:cts:greekLit:tlg0059.tlg030.perseus-grc2" — extracted here with a
// regex rather than a structured field, because that's how it's actually stored (confirmed by
// direct inspection: about.json has no dedicated `urn` key). Diorisis files carry the same
// numbers both in their filename ("Plato (0059) - Republic (030).xml") and, more reliably, in
// their own teiHeader (<tlgAuthor>0059</tlgAuthor><tlgId>030</tlgId>) — the header is what this
// matcher actually keys off, per work-match.
import fs from 'node:fs';
import path from 'node:path';

const URN_RE = /urn:cts:greekLit:tlg(\d+)\.tlg(\d+)/;

// Three works have no parseable URN in about.json (confirmed by scanning all 234): Homer's
// Iliad/Odyssey (Perseus canonical-greekLit URN omitted from the imported about.json's prose,
// though the text itself is the standard Monro/Allen edition) and Aristotle's Posterior
// Analytics (Wikisource import, no CTS URN at all — Aristotle has no CTS presence for this
// text). Manual overrides based on the standard TLG catalogue numbers.
const MANUAL_URN = {
  'iliad-grc': ['0012', '001'],
  'odyssey-grc': ['0012', '002'],
  // Diorisis's own Aristotle (0086) file "Analytica priora et posteriora (001)" bundles BOTH
  // the Prior and Posterior Analytics as one work-number (001) — there is no clean 1:1 file for
  // Posterior Analytics alone, so per-work ("attested in this work", confidence 1.0) matching is
  // not reliable for it (any token could really be from the Prior half). Left unmapped here
  // deliberately; it still gets corpus-wide (0.9) and kaikki (0.7) coverage. See REPORT-greek.md.
};

export function extractUrn(workId, aboutJson) {
  if (MANUAL_URN[workId]) return MANUAL_URN[workId];
  const text = JSON.stringify(aboutJson);
  const m = URN_RE.exec(text);
  return m ? [m[1], m[2]] : null;
}

/** List every grc workId in data/, with its {tlgAuthor, tlgId} when known. */
export function listGreekWorks(dataDir) {
  const out = [];
  for (const workId of fs.readdirSync(dataDir)) {
    const aboutPath = path.join(dataDir, workId, 'about.json');
    if (!fs.existsSync(aboutPath)) continue;
    const about = JSON.parse(fs.readFileSync(aboutPath, 'utf8'));
    if (about.language !== 'grc') continue;
    const urn = extractUrn(workId, about);
    out.push({ workId, tlgAuthor: urn?.[0] ?? null, tlgId: urn?.[1] ?? null });
  }
  return out;
}

/** Diorisis filename -> { tlgAuthor, tlgId } (fallback only; header is read directly in the
 * corpus builder — this is used by the report for a filename-based sanity cross-check). */
export function parseFilenameNumbers(filename) {
  const m = /\((\d{4})\)\s*-\s*.*\((\d{3})\)\.xml$/.exec(filename);
  return m ? { tlgAuthor: m[1], tlgId: m[2] } : null;
}
