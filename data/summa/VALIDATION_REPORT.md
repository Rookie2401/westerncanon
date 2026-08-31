# Summa corpus validation report

Generated: 2026-08-31T05:18:33.557Z
Corpus generated: 2026-08-28T14:19:18.866Z
Source: https://raw.githubusercontent.com/vicmortelmans/summa/master/build/xml_latin_nl/xml_latin_nl.xml

**Result: PASS** — 0 error(s), 16 warning(s).

Latin text of the Summa Theologiae is in the public domain. Source aggregation: github.com/vicmortelmans/summa (Dutch translation stripped during import). No Supplementum in this source: Proœmium + Prima Pars, Prima Secundae, Secunda Secundae, Tertia Pars only.

## Per-part summary

| Part | Questions | Articles | Objections | Sed contra | Respondeo | Replies | Avg article chars | Null titles | Anomalies |
|------|-----------|----------|------------|-----------|-----------|---------|-------------------|-------------|-----------|
| I | 118 | 579 | 1942 | 584 | 577 | 1906 | 4165 | 5 | 6 |
| I-II | 114 | 616 | 1998 | 622 | 616 | 1959 | 3903 | 4 | 2 |
| II-II | 188 | 913 | 3004 | 917 | 913 | 2937 | 3799 | 13 | 4 |
| III | 90 | 544 | 1802 | 549 | 544 | 1797 | 4144 | 6 | 5 |
| **all** | 510 | 2652 | 8746 | 2672 | 2650 | 8599 | | 28 | 17 |

## Lemma accounting

| Lemma type | Input (XML) | Consumed (output) | OK |
|------------|-------------|-------------------|----|
| pr | 506 | 506 | yes |
| arg | 8746 | 8746 | yes |
| sc | 2672 | 2672 | yes |
| co | 2650 | 2650 | yes |
| ad | 8599 | 8599 | yes |
| **total** | 23173 | 23173 | yes |

## Article title coverage

2624 / 2652 articles have a parsed title (**98.94%**, target >= 98%).

- **no-prooemium** (6): I q. 44, I q. 71, I-II q. 7, II-II q. 123, III q. 17, III q. 40
- **count-mismatch** (1): II-II q. 128

œ ligatures preserved in output: 0
search-index.json records: 2652

## Errors

_none_

## Warnings

- **[question-numbering]** I: missing question number(s) 72 (source omits these)
- **[article-numbering]** I q. 2: missing article number(s) 1 of 3 (source omits these)
- **[article-numbering]** I q. 57: missing article number(s) 4 of 5 (source omits these)
- **[article-numbering]** I q. 71: unnumbered single article (expected; source has no articulus integer)
- **[article-numbering]** I q. 84: missing article number(s) 2 of 8 (source omits these)
- **[article-numbering]** I-II q. 42: missing article number(s) 2 of 6 (source omits these)
- **[article-numbering]** I-II q. 104: missing article number(s) 2 of 4 (source omits these)
- **[question-numbering]** II-II: missing question number(s) 143 (source omits these)
- **[article-numbering]** II-II q. 57: missing article number(s) 3 of 4 (source omits these)
- **[article-numbering]** II-II q. 128: unnumbered single article (expected; source has no articulus integer)
- **[article-numbering]** II-II q. 137: missing article number(s) 2 of 4 (source omits these)
- **[article-numbering]** III q. 2: missing article number(s) 6 of 12 (source omits these)
- **[article-numbering]** III q. 7: missing article number(s) 9 of 13 (source omits these)
- **[article-numbering]** III q. 15: missing article number(s) 9 of 10 (source omits these)
- **[article-numbering]** III q. 56: missing article number(s) 1 of 2 (source omits these)
- **[diacritics]** output contains no œ/æ/accented characters - expected for this source (its Latin is plain ASCII; the sole œ in the source file is the un-imported Dutch title "Proœmium"). Search folding is still applied.
