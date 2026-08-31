# Aristotle validation report - de-interpretatione-la

Generated: 2026-08-31T05:18:35.459Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- divisions: 14
- passages: 50
- total passage chars: 37583
- ref scheme: chapter (+ verbatim Latin rubric where the source prints one); no Bekker or line numbers in this source, all ref fields null

## Per-division passage counts

| # | id | number | sourceHeading | passages | chars |
|---|----|--------|---------------|----------|-------|
| 0 | ch-1 | 1 | - | 1 | 1086 |
| 1 | ch-2 | 2 | DE NOMINE | 2 | 1060 |
| 2 | ch-3 | 3 | DE VERBO | 3 | 1144 |
| 3 | ch-4 | 4 | DE ORATIONE | 1 | 826 |
| 4 | ch-5 | 5 | - | 2 | 1010 |
| 5 | ch-6 | 6 | - | 1 | 629 |
| 6 | ch-7 | 7 | - | 4 | 3188 |
| 7 | ch-8 | 8 | - | 1 | 859 |
| 8 | ch-9 | 9 | - | 4 | 5662 |
| 9 | ch-10 | 10 | - | 15 | 5084 |
| 10 | ch-11 | 11 | - | 3 | 3410 |
| 11 | ch-12 | 12 | - | 2 | 3596 |
| 12 | ch-13 | 13 | - | 5 | 5378 |
| 13 | ch-14 | 14 | - | 6 | 4651 |

Companion work `categoriae-grc`: 15 divisions / 66 passages; division id sets DIFFER.
Companion work `de-interpretatione-grc`: 14 divisions / 40 passages; division id sets MATCH 1:1.
Companion work `categoriae-la`: 15 divisions / 99 passages; division id sets DIFFER.

## Verbatim spot-check

- OK - ch-1 passage[0] starts "Primum oportet constituere quid sit nomen et quid uerbum"
  - got: `Primum oportet constituere quid sit nomen et quid uerbum, po`
- OK - final chapter (ch-14) ends "simul autem eidem non contingit inesse contraria."
  - got: `re eundem; simul autem eidem non contingit inesse contraria.`

## Anomalies (preserved, not corrected)

- **de-interpretatione-la / ch-2 / passage 0** - contains editorial angle-bracket supplement <'ferus'> from the edition; kept verbatim (not markup). Mirrors the <quod> supplement in isagoge-la.
- **de-interpretatione-la / ch-10 / passage 12** - contains editorial angle-bracket supplement <'est aliquod animal iustum'> from the edition; kept verbatim (not markup). Mirrors the <quod> supplement in isagoge-la.
- **de-interpretatione-la / ch-11 / passage 1** - contains editorial angle-bracket supplement <albus, et> from the edition; kept verbatim (not markup). Mirrors the <quod> supplement in isagoge-la.
- **de-interpretatione-la / ch-13 / passage 2** - contains editorial angle-bracket supplement <im> from the edition; kept verbatim (not markup). Mirrors the <quod> supplement in isagoge-la.
- **de-interpretatione-la / refs** - This source carries no Bekker page/column/line numbers and no line numbering. Division.ref and Passage.ref are null throughout and Passage.n is "" throughout; citation is by chapter (plus the editorial English chapter title). In the standard pagination the De Interpretatione occupies Bekker 16a1–24b9.
- **de-interpretatione-la / orthography** - Classical Latin orthography as transmitted: consonantal u is written u, not v (uerbum, uox, uero, diuisione). Single quotation marks around cited terms ('homo', 'album', 'hircoceruus') and the double-hyphen dashes ("--") are the edition's punctuation. Kept verbatim — no u/v or i/j regularisation and no spelling normalisation.
- **de-interpretatione-la / wiki transport** - Removed as wiki-transport scaffolding (no reading text touched): {{Textquality|25%}}, {{titulus2 …}}, </div> + trailing interwiki links.
- **de-interpretatione-la / editorial supplements** - The edition prints editorial angle-bracket supplements, kept verbatim (not markup): ch-2 (<'ferus'>); ch-10 (<'est aliquod animal iustum'>); ch-11 (<albus, et>); ch-13 (<im>). Each supplies words the editor judged implied; this mirrors the <quod> supplement in isagoge-la.
- **de-interpretatione-la / ch-14 transcription slips** - Chapter 14 contains apparent single-letter transcription slips, preserved verbatim and NOT corrected: "contraria ent" (evidently for "contraria erit"); "bonum est nel quoniam" (evidently for "… uel quoniam"). No conjectural emendation is applied.
- **de-interpretatione-la / chapter rubrics** - Chapters 2, 3, 4 print a verbatim Latin rubric (DE NOMINE, DE VERBO, DE ORATIONE), stored verbatim as Division.sourceHeading. Chapters 1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 print no rubric (sourceHeading null). These capitula are editorial in the tradition, not part of Boethius' running translation.

## Errors

_none_

## Warnings

- **[angle-supplement]** 4 editorial angle-bracket supplement(s) preserved: ch-2/passage[0]: <'ferus'>; ch-10/passage[12]: <'est aliquod animal iustum'>; ch-11/passage[1]: <albus, et>; ch-13/passage[2]: <im>
