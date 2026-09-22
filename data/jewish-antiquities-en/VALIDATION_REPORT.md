# Jewish Antiquities (English) validation report

Generated: 2026-09-22T22:21:42.687Z

**Result: PASS** — 0 error(s), 1 warning(s).

## Counts

- books: 20
- sections: 1444
- passages: 1444
- total passage chars: 2556642
- Book 1: 84 sections (expected 84)
- Book 2: 76 sections (expected 76)
- Book 3: 79 sections (expected 79)
- Book 4: 88 sections (expected 88)
- Book 5: 98 sections (expected 98)
- Book 6: 83 sections (expected 83)
- Book 7: 76 sections (expected 76)
- Book 8: 85 sections (expected 85)
- Book 9: 54 sections (expected 54)
- Book 10: 52 sections (expected 52)
- Book 11: 54 sections (expected 54)
- Book 12: 68 sections (expected 68)
- Book 13: 87 sections (expected 87)
- Book 14: 111 sections (expected 111)
- Book 15: 67 sections (expected 67)
- Book 16: 61 sections (expected 61)
- Book 17: 61 sections (expected 61)
- Book 18: 57 sections (expected 57)
- Book 19: 52 sections (expected 52)
- Book 20: 51 sections (expected 51)

## Verbatim spot-check

- OK — book-1-sec-1 incipit
  - got: `Those who undertake to write histories, do not, I perceive, take that trouble on one and t`
- (informational) final section (book-20-sec-266) tail
  - got: ` his essence, and about our laws; why, according to them, some things are permitted us to do, and others are prohibited.`

## Anomalies (preserved, not corrected)

- **book-11-sec-8** — A paragraph cleaned to empty text; dropped rather than joined as an empty segment.
- **book-12-sec-145** — A paragraph cleaned to empty text; dropped rather than joined as an empty segment.
- **book-17-sec-13** — Section numbering irregularity: this Section's own n="13" is not greater than the immediately preceding Section's n="332" within book-17 (expected strictly increasing). Kept verbatim as printed rather than silently corrected. This coincides with the start of a new Whiston chapter at this same point in the source, suggesting the chapter number was mistakenly copied into the section-numbering attribute here.
- **jewish-antiquities-en / reading text** — 558 <note resp="editor"> editorial footnotes were excluded entirely, tag and content; not logged individually given their number.
- **jewish-antiquities-en / reading text** — 4 nested <p> open(s) inside an already-open outer <p> (both inside <quote>, Book 11 - embedded official letters quoted in full) were treated as their own paragraph-join points rather than merged into or dropped from the surrounding text; no text was lost.
- **jewish-antiquities-en / passage & division refs** — Division.ref is null throughout. This source carries 258 <milestone unit="Whiston_chapter"/> and 1444 <milestone unit="Whiston_section"/> markers - Whiston's own traditional chapter/section numbering - dropped as scaffolding this app's schema has no field for, without affecting the reading text. 1 Section number irregularit(y/ies) versus the otherwise strictly increasing per-book sequence are individually logged above.
- **jewish-antiquities-en / reading text** — 2 paragraph(s) cleaned to empty text were dropped rather than joined as an empty segment.

## Errors

_none_

## Warnings

- **[known-numbering-irregularity]** book-17-sec-13: n="13" follows n="332" - documented source-side irregularity, see anomalies.json
