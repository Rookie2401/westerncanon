# City of God validation report - augustine-city-of-god-la

Generated: 2026-09-17T23:50:26.625Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 24
- Books: 22
- Chapters: 652
- Passages: 1132
- total passage chars: 1934227

## Per-book counts

| book | number | chapters | passages | chars |
|------|--------|----------|----------|-------|
| book-0 | - | 0 | 8 | 2656 |
| book-1 | I | 37 | 52 | 78250 |
| book-2 | II | 29 | 29 | 71652 |
| book-3 | III | 31 | 38 | 76645 |
| book-4 | IV | 34 | 40 | 70881 |
| book-5 | V | 27 | 60 | 85515 |
| book-6 | VI | 13 | 30 | 51043 |
| book-7 | VII | 36 | 37 | 76528 |
| book-8 | VIII | 28 | 40 | 80121 |
| book-9 | IX | 23 | 32 | 51549 |
| book-10 | X | 32 | 56 | 99028 |
| book-11 | XI | 34 | 39 | 80015 |
| book-12 | XII | 28 | 39 | 71593 |
| book-13 | XIII | 24 | 36 | 67988 |
| book-14 | XIV | 28 | 113 | 85880 |
| book-15 | XV | 27 | 52 | 101569 |
| book-16 | XVI | 43 | 70 | 117222 |
| book-17 | XVII | 24 | 44 | 94218 |
| book-18 | XVIII | 39 | 60 | 95369 |
| book-19 | XIX | 28 | 47 | 97515 |
| book-20 | XX | 30 | 63 | 133130 |
| book-21 | XXI | 27 | 66 | 106904 |
| book-22 | XXII | 30 | 80 | 138235 |

## Verbatim spot-check

- OK - Book 1 proem (book-1-ch-0) starts "Gloriosissimam ciuitatem Dei"
  - got: `Gloriosissimam ciuitatem Dei siue in hoc temporum cursu, cum inter imp`
- OK - book-0 (Letter to Firmus) starts "DOMINO EXIMIO"
  - got: `DOMINO EXIMIO MERITOQUE HONORABILI AC SUSCIPIENDO FILIO FIRMO AUGUSTIN`
- OK - Book XXII final chapter ends "...Amen. Amen." (true end of the work)
  - got: `est, non mihi, sed Deo mecum gratias congratulantes agant. Amen. Amen.`
- OK - colophon starts "In hoc codice continentur"
  - got: `In hoc codice continentur libri sancti Augustini de ciuitate Dei contr`

## Anomalies (preserved, not corrected)

- **augustine-city-of-god-la / book-0** - Latin Wikisource's "De civitate Dei/Prologus" page is Augustine's short dedicatory COVER LETTER to Firmus about binding the 22 books into codices - not the work's own literary proem. The famous opening "Gloriosissimam ciuitatem Dei..." (addressed to Marcellinus) is a separate text, embedded at the very start of the "Liber I" page and marked "[Pr]" there; it is represented as book-1-ch-0.
- **augustine-city-of-god-la / book-3** - This is the only book in the Latin Wikisource transcription that marks its chapters with "==roman==" MediaWiki headings instead of "[roman]" brackets; parsed the same way, position-based.
- **augustine-city-of-god-la / book-5-ch-23** - source prints chapter marker "[XXXIII]" at position 23 (expected "[XXIII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("23"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-20** - source prints chapter marker "[XIX]" at position 20 (expected "[XX]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("20"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-21** - source prints chapter marker "[XX]" at position 21 (expected "[XXI]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("21"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-22** - source prints chapter marker "[XXI]" at position 22 (expected "[XXII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("22"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-23** - source prints chapter marker "[XXII]" at position 23 (expected "[XXIII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("23"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-24** - source prints chapter marker "[XXIII]" at position 24 (expected "[XXIV]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("24"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-25** - source prints chapter marker "[XXIV]" at position 25 (expected "[XXV]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("25"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-26** - source prints chapter marker "[XXV]" at position 26 (expected "[XXVI]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("26"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-27** - source prints chapter marker "[XXVI]" at position 27 (expected "[XXVII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("27"), not the printed numeral
- **augustine-city-of-god-la / book-8-ch-28** - source prints chapter marker "[XXVII]" at position 28 (expected "[XXVIII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("28"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-32** - source prints chapter marker "[XLVII]" at position 32 (expected "[XXXII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("32"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-33** - source prints chapter marker "[XLVIII]" at position 33 (expected "[XXXIII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("33"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-34** - source prints chapter marker "[XLIX]" at position 34 (expected "[XXXIV]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("34"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-35** - source prints chapter marker "[L]" at position 35 (expected "[XXXV]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("35"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-36** - source prints chapter marker "[LI]" at position 36 (expected "[XXXVI]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("36"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-37** - source prints chapter marker "[LII]" at position 37 (expected "[XXXVII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("37"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-38** - source prints chapter marker "[LIII]" at position 38 (expected "[XXXVIII]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("38"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-39** - source prints chapter marker "[LIV]" at position 39 (expected "[XXXIX]" if strictly sequential); preserved verbatim, Division.number set to the 1-based position ("39"), not the printed numeral
- **augustine-city-of-god-la / book-18-ch-31** - This Wikisource transcription gives no bracket markers for the traditional chapters "[XXXII]" through "[XLVI]" (on the minor prophets Abdias/Naum/Ambacum etc.) - the next bracket after "[XXXI]" is "[XLVII]". Rather than invent chapter breaks the source does not mark, that content is folded in as 3 passages of chapter 31 (all text preserved, nothing discarded). Every following chapter's printed roman numeral is consequently offset from its 1-based position by 15 (e.g. this book's last chapter prints "[LIV]" at position 39); each is individually flagged above.
- **augustine-city-of-god-la / book-22 (chapters 5-11)** - This Wikisource transcription switches from bracket "[roman]" chapter markers to plain arabic "N." / "N. M." numbering for chapters 5-11 (the gap between "[IV]" and "[XII]"), each numbered paragraph normally preceded by a short caption line (e.g. "Quid mundus crediderit de Romulo."). These captions carry no dedicated field in the Passage/Division schema, so each is merged verbatim as a prefix onto the paragraph it introduces, nothing dropped. Chapter 8 (the catalogue of contemporary miracles at Hippo and Carthage) is sub-numbered "8. 1." through "8. 23."; those become passages n="1".."23" of book-22-ch-8. A stray section-spanning caption, "Caro resurget (11-21)", precedes chapter 11 with no chapter number of its own; it is merged onto book-22-ch-11's first passage.
- **augustine-city-of-god-la / book-22-ch-12** - chapter opens with a caption ("Quae aequalitas habebitur...") stranded at the end of the arabic-numbered gap (see book-22 chapters 5-11 anomaly); merged as a prefix here since it thematically introduces this chapter's content on bodily stature at the resurrection
- **augustine-city-of-god-la / colophon** - Liber XXII's final chapter is followed, in the source, by one more paragraph: a scribal colophon ("In hoc codice continentur libri sancti Augustini de ciuitate Dei contra paganos numero XXII...") summarising the 22-book structure - manuscript-transmission matter, not part of Augustine's own text. Kept verbatim as its own trailing top-level division ('colophon') rather than as chapter 30's own last passage, so the work's final chapter still verifiably ends on Augustine's own closing sentence ("...Deo mecum gratias congratulantes agant. Amen. Amen.").

## Errors

_none_

## Warnings

_none_
