# Isagoge validation report - isagoge-la

Generated: 2026-08-31T19:59:17.989Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- divisions: 27
- passages: 120
- total passage chars: 34982
- ref scheme: section (division number + paragraph number); no Busse/line numbers in source, all ref fields null

## Per-division passage counts

| # | id | number | sourceHeading | passages | chars |
|---|----|--------|---------------|----------|-------|
| 0 | praefatio | - | - | 2 | 978 |
| 1 | de-genere | I | De genere | 12 | 3934 |
| 2 | de-specie | II | De specie | 17 | 8030 |
| 3 | de-differentia | III | De differentia | 14 | 6920 |
| 4 | de-proprio | IV | De proprio | 1 | 648 |
| 5 | de-accidente | V | De accidente | 5 | 679 |
| 6 | sec-vi | VI | De his communibus quae assunt generi et speciei et differentiae et proprio et accidenti | 2 | 952 |
| 7 | sec-vii | VII | De communitatibus generis et differentiae | 3 | 1079 |
| 8 | sec-viii | VIII | De differentiis generis et differentiae | 8 | 1365 |
| 9 | sec-ix | IX | De communitatibus generis et speciei | 3 | 279 |
| 10 | sec-x | X | De propriis generis et speciei | 6 | 713 |
| 11 | sec-xi | XI | De communitatibus generis et proprii | 3 | 366 |
| 12 | sec-xii | XII | De propriis generis et proprii | 5 | 809 |
| 13 | sec-xiii | XIII | De communitate generis et accidentis | 1 | 230 |
| 14 | sec-xiv | XIV | De propriis generis et accidentis | 5 | 2241 |
| 15 | sec-xv | XV | De communitatibus differentiae et speciei | 2 | 260 |
| 16 | sec-xvi | XVI | De differentiis speciei et differentiae | 4 | 949 |
| 17 | sec-xvii | XVII | De communibus differentiae et proprii | 2 | 411 |
| 18 | sec-xviii | XVIII | De differentiis proprii et differentiae | 2 | 350 |
| 19 | sec-xix | XIX | De communibus differentiae et accidentis | 2 | 214 |
| 20 | sec-xx | XX | De propriis differentiae et accidentis | 4 | 700 |
| 21 | sec-xxi | XXI | De communibus speciei et proprii | 2 | 289 |
| 22 | sec-xxii | XXII | De propriis speciei et proprii | 4 | 697 |
| 23 | sec-xxiii | XXIII | De communibus speciei et accidentis | 1 | 179 |
| 24 | sec-xxiv | XXIV | De propriis speciei et accidentis | 5 | 820 |
| 25 | sec-xxv | XXV | De communibus proprii et inseparabilis accidentis | 2 | 293 |
| 26 | sec-xxvi | XXVI | De propriis proprii et inseparabilis accidentis | 3 | 597 |

Sibling work `isagoge-grc` has 27 divisions / 43 passages; division id sets MATCH 1:1.

## Verbatim spot-check

- OK - praefatio passage 1 starts "Cum sit necessarium, Chrysaori,"
  - got: `Cum sit necessarium, Chrysaori, et ad eam quae est apud Aris`
- OK - final division (sec-xxvi) ends "sed sufficiunt etiam, haec ad discretionem eorum communitatisque traditionem."
  - got: `iam, haec ad discretionem eorum communitatisque traditionem.`

## Anomalies (preserved, not corrected)

- **isagoge-la / de-specie (II) / passage 2** - contains editorial angle-bracket supplement <quod> from the edition; kept verbatim (not markup)
- **isagoge-la / de-differentia (III)** - 1 paragraph(s) in this section carry no printed number in the source; Passage.n set to '' for those
- **isagoge-la / de-proprio (IV)** - 1 paragraph(s) in this section carry no printed number in the source; Passage.n set to '' for those
- **isagoge-la / sec-xiii (XIII)** - 1 paragraph(s) in this section carry no printed number in the source; Passage.n set to '' for those
- **isagoge-la / sec-xxiii (XXIII)** - 1 paragraph(s) in this section carry no printed number in the source; Passage.n set to '' for those
- **isagoge-la / all refs** - This source carries no Busse pagination or line numbering. Division.ref and Passage.ref are null throughout; the citation scheme for this work is 'section' (division number + paragraph number).
- **isagoge-la / division scheme** - Divided as praefatio + 26 capitula. Confirmed against Aristoteles Latinus I.6-7 (ed. Minio-Paluello & Dod, 1966, pp. 5-31) as reproduced in the DigilibLT digital corpus (digiliblt.uniupo.it): that edition divides Boethius' translation into exactly this praefatio+26 structure. It is also matched by Busse's Greek capitula (CAG IV.1) and a Busse-paginated text of the translation. A queried "24-section" division is not corroborated by any of these witnesses.
- **isagoge-la / capitula wording** - The Latin capitula follow this recension's wording (e.g. "De communitatibus generis et differentiae", "De differentiis generis et differentiae", "De communibus proprii et inseparabilis accidentis"). Busse's parallel Latin prints "De communibus ..."/"De propriis ..." without "inseparabilis". These are editorial headings in every edition; wording kept verbatim as transmitted.
- **isagoge-la / orthography** - No u/v or i/j regularisation. "De genere" para 3 reads "uniuscujusque" (j) where the rest of the text has "uniuscuiusque"; the source inconsistency is preserved verbatim.

## Errors

_none_

## Warnings

- **[angle-supplement]** 1 editorial angle-bracket supplement(s) preserved: de-specie/passage[1]: <quod>
