# Pro S. Roscio Amerino (Latin + English) validation report

Generated: 2026-09-20T01:05:32.309Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- Latin: 154 sections, 87988 chars
- English: 154 sections, 114925 chars

## Verbatim spot-check

- OK - Latin sec-1 incipit
  - got: `credo ego vos, iudices, mirari quid sit quod, cum tot summi `
- OK - Latin final section explicit
  - got: `te molestiarum sensum omnem humanitatis ex animis amittimus.`
- OK - English sec-1 incipit
  - got: `I imagine that you, O judges, are marvelling why it is that `
- OK - English final section explicit
  - got: ` of miseries, lose from our minds every feeling of humanity.`
- OK - Latin sec-132 preserves the "Desunt non pauca." manuscript-gap marker

## Anomalies (Latin, preserved not corrected)

- **sec-132** - Genuine manuscript lacuna: a <gap reason="lost"/> marker in the source, printed as a literal row of asterisks (kept verbatim in the reading text) - this is Clark's own edition marking lost text, not a parsing gap. See "Known gaps & anomalies" in about.json.
- **sec-132** - Genuine manuscript lacuna: a <gap reason="lost"/> marker in the source, printed as a literal row of asterisks (kept verbatim in the reading text) - this is Clark's own edition marking lost text, not a parsing gap. See "Known gaps & anomalies" in about.json.
- **pro-roscio-amerino-la / apparatus** - 450 <note> elements (Clark's critical apparatus - manuscript variant readings, scholia) were excluded entirely, tag and content, at every nesting depth. None are Cicero's own text.
- **pro-roscio-amerino-la / Division.ref** - 53 <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-roscio-amerino-la/types.ts. Passage.ref is null throughout.
- **pro-roscio-amerino-la / praenomen abbreviations** - Every <choice><abbr>X</abbr><expan>Y<ex>...</ex></expan></choice> (a praenomen like "M." for "Marcus") keeps only the printed <abbr> form; <expan> (Perseus's own unprinted editorial gloss) is dropped entirely, not concatenated onto the abbreviation.
- **pro-roscio-amerino-la / (work level) manuscript gap** - 2 <gap reason="lost"/> marker(s) found in total (both within section 132 - the well-known "Desunt non pauca" lacuna). See the per-occurrence anomaly entries above and "Known gaps & anomalies" in about.json.

## Anomalies (English, preserved not corrected)

- **pro-roscio-amerino-en / apparatus** - 19 <note anchored="true"> footnotes (Yonge's own translator's commentary - explaining puns, textual cruxes, historical background, and one embedded verse citation from Ennius) were excluded entirely, tag and content.
- **pro-roscio-amerino-en / Division.ref** - 53 <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-roscio-amerino-la/types.ts. Passage.ref is null throughout.
- **pro-roscio-amerino-en / (work level) front matter** - This witness carries one further division the Latin sibling does not: a <div subtype="commentary"> holding "The Argument" (1 paragraph(s)), a whole-speech synopsis printed once before section 1. Excluded from the reading text for the same reason as Pro Archia's English edition - see that importer's module doc and anomalies.json entry. Flagged here for independent review, not silently dropped.

## Errors

_none_

## Warnings

_none_
