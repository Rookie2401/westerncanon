# Isagoge (English, Owen 1853) validation report

Generated: 2026-09-18T00:10:03.483Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions: 17
- passages: 26
- total passage chars: 40220
- ref scheme: chapter (roman numeral) + printed chapter title; no printed paragraph numbers, all ref fields null

## Per-division passage counts

| # | id | number | sourceHeading | passages | chars |
|---|----|--------|---------------|----------|-------|
| 0 | ch-1 | I | Object of the writer, in the present Introduction. | 1 | 1133 |
| 1 | ch-2 | II | Of the Nature of Genus and Species. | 5 | 13772 |
| 2 | ch-3 | III | Of Difference. | 4 | 7651 |
| 3 | ch-4 | IV | Of Property. | 1 | 971 |
| 4 | ch-5 | V | Of Accident. | 2 | 612 |
| 5 | ch-6 | VI | Of Things common and peculiar to the Five Predicates. | 1 | 1236 |
| 6 | ch-7 | VII | Of the Community and Distinction of Genus and Difference. | 2 | 2626 |
| 7 | ch-8 | VIII | Of Community and Difference of Genus and Species. | 1 | 1109 |
| 8 | ch-9 | IX | Of Community and Difference of Genus and Property. | 1 | 1520 |
| 9 | ch-10 | X | Of Community and Difference of Genus and Accident. | 1 | 1085 |
| 10 | ch-11 | XI | Of Community and Difference of Species and Difference. | 1 | 1777 |
| 11 | ch-12 | XII | The same subject continued. | 1 | 1286 |
| 12 | ch-13 | XIII | Of Community and Difference of Property and Difference. | 1 | 868 |
| 13 | ch-14 | XIV | Of Community and Difference of Accident and Differences. | 1 | 862 |
| 14 | ch-15 | XV | Of Community and Difference of Species and Property. | 1 | 1551 |
| 15 | ch-16 | XVI | Of Community and Difference of Species and Accident. | 1 | 1025 |
| 16 | ch-17 | XVII | Of Community and Difference of Property and Accident. | 1 | 1136 |

## Verbatim spot-check

- OK - chapter I passage 1 starts with the opening sentence
  - got: `Since it is necessary, Chrysaorius, both to the doctrine of Aristotle's Categories, to kno`
- OK - final division (ch-17) ends with the closing sentence
  - got: ` but these are sufficient for their distinction, and the setting forth of their agreement.`

## Anomalies (preserved, not corrected)

- **isagoge-en / division scheme** - Owen's 1853 translation is chaptered as 17 numbered chapters (Chap. I-XVII) with no separate preface: Chapter I ("Object of the writer, in the present Introduction") itself serves as the introduction, confirmed directly against the rendered page body. This is a genuinely different scheme from the Busse-derived praefatio+26-capitula division shared by the bundled Greek (isagoge-grc) and Latin (isagoge-la) editions; the three division trees are NOT aligned 1:1, matching how this repo already treats independently-divided editions of the same work elsewhere.
- **isagoge-en / table of contents** - The source page's own "Contents" block lists "Chap. II.--Of the Nature of Genus and Species." 2 times in a row (a transcription glitch in the TOC listing itself). The document body contains exactly one Chapter II heading and one Chapter II content block, confirmed by walking the rendered page body directly. No duplicate chapter was created; the TOC-only duplication is not reflected in the imported divisions.
- **isagoge-en / all refs** - This source carries no printed paragraph numbers and no citation apparatus beyond page-scan images the importer does not map to a ref field. Division.ref and Passage.ref are null throughout, and Passage.n is '' throughout; the citation scheme for this work is by chapter (roman numeral) plus the printed chapter title. (The underlying Wikisource page transcription does carry inline page-scan anchors for O. F. Owen's Organon of Aristotle Vol. 2 (1853), pp. 609-633 - these were not mapped to a structured reference field in this import.)
- **isagoge-en / apparatus stripped** - Numbered footnote/endnote markers (superscript brackets, e.g. "[6]") and their endnote text, and the marginal running-head "sidenotes" printed beside the main text in the 1853 edition, were removed as transport apparatus, matching how footnote apparatus is handled in the Greek and Latin Isagoge importers. None of this apparatus is reading text from Owen's translation.
- **isagoge-en / stray transport marks** - 4 passage(s) contained a stray "*" and/or "}" character with no corresponding content (a "*" footnote call-out orphaned once its target sidenote was stripped as apparatus, in Chapters I and II; and a single stray "}" character directly abutting a stripped sidenote in Chapter II, with no matching "{" anywhere in the text - almost certainly leaked wiki/template markup rather than part of Owen's prose). Both were removed as transport noise, not content, and are flagged per-passage via Passage.anomaly.
- **isagoge-en / Chapter IV, apparent dropped word** - The source transcription reads "...since if any thing be a it is capable of neighing, and if any thing be capable of neighing it is a horse." This appears to be missing a word (most likely "horse") before "it is capable of neighing" in the first clause - verified against the raw rendered HTML, not an artefact of this importer's cleaning. Per this repo's faithfulness rule, the apparent gap is kept exactly as transcribed rather than silently filled in; no word has been guessed or inserted.
- **isagoge-en / OCR-level irregularities** - The Wikisource transcription contains several uncorrected OCR-level irregularities, preserved verbatim and not corrected: "diners" for "differs" (Chapters II [x2], X, XV), "ate" for "are" (Chapter VII), "tor" for "for" (Chapter XII), "hut" for "but", "nut" for "not", "arc" for "are", "cot" for "not", and "cannot he" for "cannot be" (all in Chapter XIV), "mast" for "must" (Chapter XVI), and "arc" for "are" and "tiny differ" for (apparently) "they differ" (Chapter XVII). These read as scanning/OCR letter-substitution errors typical of this kind of page-scan transcription; none has been corrected or conjecturally emended, matching how the sibling Greek edition documents its own uncorrected OCR irregularities.
- **isagoge-en / Chapter XIV heading, TOC vs body** - The source page's "Contents" block gives the Chapter XIV title as "Of Community and Difference of Accident and Difference." (singular), but the chapter's own printed heading in the body reads "Of Community and Difference of Accident and Differences." (plural). Division.sourceHeading uses the body heading (the authoritative, in-place chapter title); the TOC wording is not used anywhere in the import.

## Errors

_none_

## Warnings

_none_
