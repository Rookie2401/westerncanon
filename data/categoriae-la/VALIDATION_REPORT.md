# Aristotle validation report - categoriae-la

Generated: 2026-08-31T05:18:35.459Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- divisions: 15
- passages: 99
- total passage chars: 61075
- ref scheme: chapter (+ verbatim Latin rubric where the source prints one); no Bekker or line numbers in this source, all ref fields null

## Per-division passage counts

| # | id | number | sourceHeading | passages | chars |
|---|----|--------|---------------|----------|-------|
| 0 | ch-1 | 1 | - | 3 | 784 |
| 1 | ch-2 | 2 | - | 2 | 1209 |
| 2 | ch-3 | 3 | - | 2 | 768 |
| 3 | ch-4 | 4 | - | 1 | 825 |
| 4 | ch-5 | 5 | DE SUBSTANTIA | 9 | 10936 |
| 5 | ch-6 | 6 | DE QUANTITATE | 8 | 7362 |
| 6 | ch-7 | 7 | DE RELATIVIS VEL AD ALIQUID | 6 | 10061 |
| 7 | ch-8 | 8 | DE QUALI ET QUALITATE | 25 | 11044 |
| 8 | ch-9 | 9 | DE FACERE ET PATI | 3 | 820 |
| 9 | ch-10 | 10 | DE OPPOSITIS | 19 | 9459 |
| 10 | ch-11 | 11 | - | 4 | 1462 |
| 11 | ch-12 | 12 | DE PRIORE | 6 | 1915 |
| 12 | ch-13 | 13 | DE HIS QUAE SIMUL SUNT | 4 | 1532 |
| 13 | ch-14 | 14 | DE MOTU | 6 | 2056 |
| 14 | ch-15 | 15 | DE HABERE | 1 | 842 |

Companion work `categoriae-grc`: 15 divisions / 66 passages; division id sets MATCH 1:1.
Companion work `de-interpretatione-grc`: 14 divisions / 40 passages; division id sets DIFFER.
Companion work `de-interpretatione-la`: 14 divisions / 50 passages; division id sets DIFFER.

## Verbatim spot-check

- OK - ch-1 passage[0] starts "Aequiuoca dicuntur quorum nomen solum commune est"
  - got: `Aequiuoca dicuntur quorum nomen solum commune est, secundum `
- OK - final chapter (ch-15) ends "qui autem solent dici paene omnes sunt annumerati."
  - got: `debuntur; qui autem solent dici paene omnes sunt annumerati.`

## Anomalies (preserved, not corrected)

- **categoriae-la / ch-10 / passage 10** - the edition prints the editorial lacuna mark "<...>" here (1×); it marks text that is defective/omitted in this witness. Kept verbatim; nothing is supplied (no fabrication).
- **categoriae-la / ch-10 / passage 12** - the edition prints the editorial lacuna mark "<...>" here (1×); it marks text that is defective/omitted in this witness. Kept verbatim; nothing is supplied (no fabrication).
- **categoriae-la / ch-10 / passage 14** - the edition prints the editorial lacuna mark "<...>" here (1×); it marks text that is defective/omitted in this witness. Kept verbatim; nothing is supplied (no fabrication).
- **categoriae-la / refs** - This source carries no Bekker page/column/line numbers and no line numbering. Division.ref and Passage.ref are null throughout and Passage.n is "" throughout; citation is by chapter (plus the editorial English chapter title). In the standard pagination the Categoriae occupies Bekker 1a1–15b33.
- **categoriae-la / orthography** - Classical Latin orthography as transmitted: consonantal u is written u, not v (Aequiuoca, uero, diuersa, uniuoca, denominatiua). Single quotation marks around cited terms ('homo', 'album') are the edition's punctuation. Kept verbatim — no u/v or i/j regularisation and no spelling normalisation.
- **categoriae-la / chapter-9 heading token** - The chapter-9 heading is printed "[9]" where every other chapter token is zero-padded ("[01]"…"[08]", "[10]"…"[15]"). Normalised to number "9"; no reading text affected.
- **categoriae-la / wiki transport** - Removed as wiki-transport scaffolding (no reading text touched): {{TextQuality|50%}}, {{titulus2 …}}, {{finis}}, <div class=text>, </div> + trailing interwiki links.
- **categoriae-la / ch-10 replacement character** - The source transcription carried the Unicode REPLACEMENT CHARACTER (U+FFFD) at 2 mid-word line-wrap points in chapter 10 (in<U+FFFD>uicem., opponun<U+FFFD>tur). This is a transcription encoding artefact, not a textual variant; the stray character was removed and the word halves joined to restore "inuicem" and "opponuntur". No other change.
- **categoriae-la / ch-10 lacunae** - Chapter 10 (DE OPPOSITIS) prints the editorial lacuna mark "<...>" at three points (after "idem enim modus est oppositionis;", after "priuatio uisus caecitas dicitur", and before "habens uisum dicitur"). These mark places where the Latin is defective/omitted in this witness. The mark is preserved verbatim; the missing words are NOT supplied. Compare the Greek Categoriae, chapter 10, for the sense.
- **categoriae-la / chapter rubrics** - Chapters 5, 6, 7, 8, 9, 10, 12, 13, 14, 15 print a verbatim Latin rubric (DE SUBSTANTIA, DE QUANTITATE, DE RELATIVIS VEL AD ALIQUID, DE QUALI ET QUALITATE, DE FACERE ET PATI, DE OPPOSITIS, DE PRIORE, DE HIS QUAE SIMUL SUNT, DE MOTU, DE HABERE), stored verbatim as Division.sourceHeading. Chapters 1, 2, 3, 4, 11 print no rubric (sourceHeading null). These capitula are editorial in the tradition, not part of Boethius' running translation.

## Errors

_none_

## Warnings

- **[lacuna-mark]** 3 passage(s) carry the editorial lacuna mark "<...>": ch-10/passage[10]: 1×; ch-10/passage[12]: 1×; ch-10/passage[14]: 1×
