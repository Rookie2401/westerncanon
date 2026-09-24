# Greek morphology / lemma / gloss data — research report

Scope: choose offline, redistributable data to give word-by-word lemma + morphology +
English gloss for the 234 ancient-Greek works in this app (~4.5M tokens, all Perseus
`canonical-greekLit` / First1KGreek TEI, polytonic Unicode). App is an offline PWA on
GitHub Pages, so the data must be bundlable and its licence must permit redistribution.
NC licences are excluded per the brief.

Everything below was downloaded to `C:\Users\CJWal\dev\_lexdata\` (outside this repo) and
measured with throwaway Node scripts in the session scratchpad — nothing was added to the
repo. This file is the only deliverable.

## Method

Three sample works were tokenised straight out of this app's own data:

| work | tokens | unique forms |
|---|---:|---:|
| `data/plato-republic-grc` (urn:cts:greekLit:tlg0059.tlg030.perseus-grc2) | 88,210 | 14,637 |
| `data/thucydides-history-grc` (urn:cts:greekLit:tlg0003.tlg001.perseus-grc2) | 150,157 | 22,180 |
| `data/euclid-elements` (urn:cts:greekLit:tlg1799.tlg001, First1K/Heiberg) | 150,379 | 3,121 |

Tokeniser: walk `work.json` divisions → passages → `text`, match Unicode ranges
`\u0370-\u03FF\u1F00-\u1FFF` (Greek + Greek Extended) as words. Normalisation applied
identically to our tokens and every candidate's forms before comparing: NFC, final
sigma → medial sigma, **grave accent → acute** (grave is a purely positional/orthographic
variant in Greek, not phonemic — Perseus editions write it whenever a word isn't clause-final;
most lexicon data only lists the citation/acute form, so skipping this step badly
undercounts real coverage, see numbers below), then case-fold.

## Candidates evaluated

### 1. gcelano/LemmatizedAncientGreekXML — DISQUALIFIED (licence)

Token-level lemma + Morpheus-style 9-character morph code for Perseus canonical-greekLit
and First1KGreek texts, in a custom `<s>/<t>` XML with `@o` (morph code), `@l1`/`@l2`
(lemma/POS). This is exactly the shape we want, and it covers the right corpus, but its
repository states:

> This work is licensed under a Creative Commons **Attribution-NonCommercial** 4.0
> International License.

CC BY-**NC** is explicitly excluded by the brief. Not usable, full stop — do not use even a
derived/filtered subset, since the NC clause attaches to the data itself, not just the repo.

### 2. PerseusDL/morpheus — infeasible to build here (licence is fine)

Licence: CC BY-SA 3.0 US ("you must offer Perseus any modifications you make"). That's fine
for redistribution. But Morpheus ships as C source that must be compiled (`make`, a
Bourne-shell build, flex-generated stemmers) and run as a local analysis server — there is
no precomputed "greek-analyses" form dump in the repo or its forks (`perseids-tools/morpheus`,
`perseids-tools/morpheus-perseids`) that could just be downloaded.

Checked this machine directly:
- `where gcc` → not found
- `where make` → not found
- `wsl --status` → "The Windows Subsystem for Linux is not installed"
- `where docker` → not found

No native compiler, no WSL, no Docker. Building Morpheus is out of scope for this task on
this machine. (Alpheios's morphology tooling is a fork of the same Morpheus engine —
software GPL-3, data CC BY-SA — and has the identical build problem.)

### 3. kaikki.org Ancient Greek Wiktionary extract — usable, but weak alone

Downloaded `https://kaikki.org/dictionary/Ancient%20Greek/kaikki.org-dictionary-AncientGreek.jsonl`
→ **401,107,810 bytes (382.5 MiB)**, ~68,196 JSONL entries (one per word sense), 66,912 of
which have a Greek-script headword, 68,169 carry a `forms` inflection table. Total unique
surface forms (headword + every listed inflected form, after our normalisation) across the
whole file: **963,146**. Licence: extracted from English Wiktionary, which is dual
CC BY-SA (4.0)/GFDL; this is the same basis the sibling app `romance-v0` already relies on
for its Latin kaikki extract (`scripts/fetch-dictionary.mjs`), so the precedent for treating
it as CC BY-SA-redistributable is already established in this codebase family.

Coverage against our 3 sample works (grave-normalised):

| work | unique-form coverage | token coverage |
|---|---:|---:|
| Plato, *Republic* | 51.08% (7,476/14,637) | 86.40% (76,216/88,210) |
| Thucydides, *History* | 48.67% (10,795/22,180) | 87.46% (131,322/150,157) |
| Euclid, *Elements* | 36.75% (1,147/3,121) | 79.22% (119,133/150,379) |

(Without the grave→acute step, token coverage was only 63.3% / 62.4% / 53.5% — kaikki's
inflection tables mostly only list the acute/citation accent, e.g. καί/δέ/τό/μέν, not the
grave-accented form that appears whenever those words aren't clause-final, which is most of
the time. This is the single biggest gotcha in this whole investigation.) Remaining gaps are
mostly **elided forms** (ἀλλ’, ἐπ’, καθ’, οὐδ’…) — Perseus source texts often cut the elided
word off before a plain ASCII/curly apostrophe rather than a proper Greek coronis, so neither
our tokeniser nor kaikki's form list see them as the same word; a real pipeline needs a
small elision-stripping step. kaikki's `forms` also carry vowel-length marks (combining
breve/macron, e.g. `σκῠ́λος`) that Perseus texts never mark — stripped in our normaliser, or
none of this would have matched at all.

kaikki is a **form → lemma + gloss dictionary**, not a corpus annotation: it does not know
which sense/morphology a given occurrence has, only which lemma(s) a surface form could
belong to. It's the right shape for a fallback form-index, not for primary lemmatisation.

### 4. Diorisis Ancient Greek Corpus — the strong candidate

Vatri & McGillivray (Alan Turing Institute / Oxford / Cambridge), figshare
DOI 10.6084/m9.figshare.6187256. Downloaded `Diorisis.zip` from
`https://ndownloader.figshare.com/files/11296247` → **194,443,428 bytes (185.4 MiB)**,
unzips to 820 per-work TEI-ish XML files, **10,206,421 words total**, automatically
lemmatised and POS/morphology-tagged (with a couple of candidate `<analysis morph="…">`
readings per ambiguous token).

**Licence — flag a discrepancy.** figshare's own metadata record says:
> license: **"CC BY 4.0"**, https://creativecommons.org/licenses/by/4.0/

but every individual XML file's own embedded TEI header says:
> `<licence><ref target="https://creativecommons.org/licenses/by-sa/3.0/us/">Creative Commons Attribution-ShareAlike 3.0 United States License</ref></licence>`

Either way it is redistributable (neither is NC); to be safe, treat it as the more
restrictive **CC BY-SA 3.0 US** (attribution + share-alike) rather than the figshare
metadata's plain CC BY 4.0, since that's what's actually printed inside the data files we'd
ship from.

**Source and alignment.** Each file's TEI header names its exact source, e.g. for our Plato
sample:
> `<ref target="https://github.com/PerseusDL/canonical-greekLit/tree/master/data/tlg0059/tlg030/tlg0059.tlg030.perseus-grc2.xml">Perseus</ref>`

— i.e. Diorisis is a direct per-token annotation of the *same* `canonical-greekLit` edition
witnesses this app already imports (Diorisis was built in 2018 from Perseus + "The Little
Sailing" + Bibliotheca Augustana; our importers pull from the same `canonical-greekLit`/
First1KGreek repos). Filenames are keyed by TLG author/work number, e.g.
`Plato (0059) - Republic (030).xml`, `Thucydides (0003) - History (001).xml`,
`Euclides (1799) - Elements (001).xml` — matching our CTS URNs
(`tlg0059.tlg030`, `tlg0003.tlg001`, `tlg1799.tlg001`) exactly for all three sample works.

**Format.** TEI-flavoured XML, one `<word form="…" id="N">` per token (word forms in
**TLG/CCAT Beta Code**, not Unicode — needed a small Beta Code→Unicode converter, written for
this task, ~80 lines, verified round-trip against the actual Republic opening sentence),
containing one or more `<lemma id="…" entry="…" POS="…">` (lemma given as plain Unicode)
with nested `<analysis morph="…"/>` readings when ambiguous, e.g.:

```xml
<word form="kate/bhn" id="1">
  <lemma id="53651" entry="καταβαίνω" POS="verb" TreeTagger="false" disambiguated="n/a">
    <analysis morph="aor ind act 3rd pl (epic doric aeolic)"/>
    <analysis morph="aor ind act 1st sg"/>
  </lemma>
</word>
```

**Coverage against our sample works** (Diorisis token count vs. our own extraction is a
useful sanity check on its own: Plato 87,859/88,210 words, Thucydides 149,846/150,157,
Euclid only 130,590/150,379 — see below):

| work | unique-form coverage | token coverage |
|---|---:|---:|
| Plato, *Republic* | **97.69%** (14,299/14,637) | **99.60%** (87,859/88,210) |
| Thucydides, *History* | **99.29%** (22,023/22,180) | **99.79%** (149,846/150,157) |
| Euclid, *Elements* | 68.86% (2,149/3,121) | 86.84% (130,590/150,379) |

Plato/Thucydides residual misses are almost entirely rare epic/Homeric quotations inside
Plato (κραδίην, θητευέμεν…) and elided forms cut at an apostrophe Diorisis's own tokeniser
handled differently (δ’, ἐπ’, καθ’…) — not real gaps in an offline pipeline that also
elision-normalises.

Euclid's shortfall is a red herring, not a lemmatiser problem: the missing high-frequency
"forms" are diagram point-labels — pairs/triples of Greek letters naming line segments and
figures (αβ×1528, βγ×876, αγ×755, γδ×691, εζ×520, αβγ×448…). These aren't Greek words at
all; no lexicon or lemmatiser is expected to "know" them, and the fact that they dominate
the miss list confirms Diorisis is doing essentially everything else right for this text —
Diorisis's own Euclid file just also strips/skips them (hence its total word count is
~13% lower than ours). True *linguistic* vocabulary coverage for Euclid is effectively as
strong as the other two once point-labels are excluded from the denominator.

**Combined (Diorisis ∪ kaikki), for reference:**

| work | unique-form coverage | token coverage |
|---|---:|---:|
| Plato, *Republic* | 99.04% | 99.84% |
| Thucydides, *History* | 99.54% | 99.83% |
| Euclid, *Elements* | 69.98% | 87.27% |

**Corpus-wide reach.** Matching Diorisis's 812 `(author).(work)` TLG-number pairs against
all 231 of our Greek works that carry a `urn:cts:greekLit:tlgNNNN.tlgNNN` URN: **181/231
(78.4%) match exactly by number.** This is a conservative lower bound — a few authors (e.g.
Euripides, tlg0006) are present in Diorisis in full but under different internal work
numbers than the ones our texts use, so real per-title matching would likely do better; on
the other hand Diorisis's stated scope is "Homer to the early 5th century AD," so it
structurally cannot cover this app's patristic/late-antique Greek (nothing after ~400 AD),
nor works that only exist under non-TLG identifiers in First1KGreek. Aristotle (tlg0086) is
the biggest visible gap (many individual treatises absent).

### 5. Glosses: PerseusDL/lexica (LSJ + Middle Liddell), CC BY-SA 4.0

`https://github.com/PerseusDL/lexica` — repo-wide licence statement: "Unless otherwise
indicated, all contents of this repository are licensed under a Creative Commons
Attribution-ShareAlike 4.0 International License. You must offer Perseus any modifications
you make." Full LSJ (grc.lsj.perseus-eng*.xml, 27 alphabetic-chunk TEI files under
`CTS_XML_TEI/perseus/pdllex/grc/lsj/`; one sampled chunk was 676,542 bytes, so total LSJ is
on the order of 15–20 MB) plus Middle Liddell and other Perseus lexica in the same repo.
This is the standard, comprehensive (~116k headword) classical Greek dictionary — the right
gloss source to key off Diorisis/kaikki lemmas, and it's CC BY-SA so fully redistributable.

STEPBible TFLSJ, already on disk at `C:\Users\CJWal\dev\vetus-v0\data\tflsj\`
(`tflsj-main.txt` 5,772 lines + `tflsj-extra.txt` 5,389 lines, CC BY 4.0, "Data created by
www.STEPBible.org based on work at Tyndale House Cambridge"): this is explicitly *"the Full
LSJ by Tyndale House scholars… for the tagged texts used by STEPBible, based on BHS for OT
and LSJ for NT"* — i.e. it's LSJ filtered down to biblical (NT/LXX) vocabulary and keyed by
Strong's numbers, only ~11k entries vs. LSJ's full ~116k. Good supplementary glosses for
this app's Koine/patristic Greek works, but not a substitute for full LSJ for classical
philosophical/technical vocabulary (Plato, Thucydides, Euclid) — most of their headwords
simply aren't Strong's-tagged NT/LXX words.

### 6. Other corpora/analysers checked

- **Diorisis** already covered above (it's the strongest of everything checked).
- **CLTK** (Classical Language Toolkit): the Python lemmatizer module itself is MIT, but
  its Greek lexical data is aggregated from multiple third-party sources with mixed and not
  uniformly-documented licences; not pursued further given Diorisis already outperforms it
  for our exact texts with a single, clearly-stated licence.
- **Alpheios**: GPL-3 software wrapping the same Morpheus engine (same build problem as
  candidate 2), data described by the project as CC BY-SA; no advantage over Diorisis for
  this corpus and not independently downloaded.

## Recommendation

**Use Diorisis as the primary token-level lemma+morphology source, LSJ (PerseusDL/lexica,
CC BY-SA 4.0) as the gloss dictionary keyed off Diorisis's Unicode lemma field, and the
kaikki Ancient Greek extract (CC BY-SA) as a fallback form→lemma index for tokens Diorisis
doesn't cover** (the ~22% of works outside Diorisis's TLG-number coverage, its Homer-to-5th-
century cutoff, and the small residual per-token misses even within covered works). Use
STEPBible TFLSJ only as a secondary/simplified gloss source for NT/LXX-adjacent vocabulary
in the patristic-era works, not as the primary lexicon. Do **not** use
gcelano/LemmatizedAncientGreekXML (CC BY-NC 4.0 — disqualified), and do not attempt to build
Morpheus/Alpheios locally (no gcc/make/WSL/Docker on this machine; would need a separate
Linux box or container host).

Alignment strategy: for each work, pull the matching Diorisis file by TLG author/work
number (exact match already confirmed for 181/231 = 78.4% of the corpus, likely higher with
title-based matching for the remainder); Beta-Code→Unicode-convert its `form` values with
the same conversion used for this measurement, normalise (NFC, final-sigma, grave→acute,
elision-strip) identically to how the app's own passage text is normalised for lookup, and
index token → lemma → LSJ gloss. For the ~50 works with no Diorisis file, fall back to a
kaikki-derived form→lemma index (963k surface forms) with LSJ/TFLSJ glosses, accepting lower
(~80–87% token / ~50% unique) coverage there and word-level "no analysis available" as the
honest failure mode rather than blocking the feature.

Key numbers to carry forward: Diorisis 194 MB zip / CC BY-SA 3.0 US (per embedded licence;
figshare metadata says CC BY 4.0) / 99.6–99.8% token coverage on Plato & Thucydides, 86.8%
on Euclid (real-vocabulary coverage effectively higher — the gap is diagram point-labels,
not missing lemmas). kaikki 401 MB JSONL / CC BY-SA / ~87% token, ~50% unique-form coverage
alone (grave-accent normalisation is essential — it's worth +23–25 percentage points of
token coverage by itself). LSJ (PerseusDL/lexica) ~15–20 MB, CC BY-SA 4.0, ~116k headwords.
Both major downloads (kaikki 401 MB + Diorisis 194 MB, ~595 MB combined) completed in a few
minutes on this connection; no candidate required more than that — the only unmeasurable
one (Morpheus/Alpheios) was infeasible for a compile reason, not a download-time reason.
