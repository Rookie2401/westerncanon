# Summa corpus validation report

Generated: 2026-09-11T14:59:44.869Z
Corpus generated: 2026-08-31T19:57:30.455Z
Source: https://raw.githubusercontent.com/vicmortelmans/summa/master/build/xml_latin_nl/xml_latin_nl.xml

**Result: PASS** — 0 error(s), 5 warning(s).

Latin text of the Summa Theologiae is in the public domain. Source aggregation: github.com/vicmortelmans/summa (Dutch translation stripped during import). No Supplementum in this source: Proœmium + Prima Pars, Prima Secundae, Secunda Secundae, Tertia Pars only.

## Per-part summary

| Part | Questions | Articles | Objections | Sed contra | Respondeo | Replies | Avg article chars | Null titles | Anomalies |
|------|-----------|----------|------------|-----------|-----------|---------|-------------------|-------------|-----------|
| I | 119 | 583 | 1957 | 588 | 581 | 1921 | 4172 | 6 | 2 |
| I-II | 114 | 618 | 2004 | 624 | 618 | 1965 | 3900 | 4 | 0 |
| II-II | 189 | 916 | 3014 | 919 | 916 | 2947 | 3799 | 14 | 2 |
| III | 90 | 548 | 1816 | 553 | 548 | 1810 | 4154 | 6 | 0 |
| **all** | 512 | 2665 | 8791 | 2684 | 2663 | 8643 | | 30 | 4 |

## Lemma accounting

_Base transcription only; secondary-witness lemmas (filled lacunae) are listed separately below._

| Lemma type | Input (XML) | Base output | OK |
|------------|-------------|-------------|----|
| pr | 506 | 506 | yes |
| arg | 8746 | 8746 | yes |
| sc | 2672 | 2672 | yes |
| co | 2650 | 2650 | yes |
| ad | 8599 | 8599 | yes |
| **total** | 23173 | 23173 | yes |

## Filled lacunae (secondary public-domain witnesses)

2 whole question(s) + 13 article citation(s) supplied from outside the base transcription (1 pr, 45 arg, 12 sc, 13 co, 44 ad).
- I q. 2 a. 1 (wikisource-la)
- I q. 57 a. 4 (wikisource-la)
- I q. 72 (wikisource-la)
- I q. 84 a. 2 (wikisource-la)
- I-II q. 104 a. 2 (corpusthomisticum)
- I-II q. 42 a. 2 (corpusthomisticum)
- II-II q. 137 a. 2 (corpusthomisticum)
- II-II q. 143 (corpusthomisticum)
- II-II q. 57 a. 3 (corpusthomisticum)
- III q. 15 a. 9 (corpusthomisticum)
- III q. 2 a. 6 (corpusthomisticum)
- III q. 56 a. 1 (corpusthomisticum)
- III q. 7 a. 9 (corpusthomisticum)

## Supplementum Tertiae Partis (5th top-level section)

Assembled from OCR of two public-domain printed editions (Marietti 1926/1931, cross-checked against the 1894 Editio altera Romana). 102 questions (99 core + 3 Appendix de Purgatorio) / 456 articles.

- articles carrying an OCR/uncertainty note: **269** (detail in `suppl-anomalies.json`, 352 entries)
- articles with no parsed title: 2
- articles with no respondeo: 0

## Article title coverage

2635 / 2665 articles have a parsed title (**98.87%**, target >= 98%).

- **no-prooemium** (7): I q. 44, I q. 71, I q. 72, I-II q. 7, II-II q. 123, III q. 17, III q. 40
- **count-mismatch** (2): II-II q. 128, II-II q. 143

œ ligatures preserved in output: 0
search-index.json records: 3121

## Errors

_none_

## Warnings

- **[article-numbering]** I q. 71: unnumbered single article (expected; source has no articulus integer)
- **[article-numbering]** I q. 72: unnumbered single article (expected; source has no articulus integer)
- **[article-numbering]** II-II q. 128: unnumbered single article (expected; source has no articulus integer)
- **[article-numbering]** II-II q. 143: unnumbered single article (expected; source has no articulus integer)
- **[diacritics]** output contains no œ/æ/accented characters - expected for this source (its Latin is plain ASCII; the sole œ in the source file is the un-imported Dutch title "Proœmium"). Search folding is still applied.
