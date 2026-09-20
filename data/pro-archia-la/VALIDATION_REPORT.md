# Pro Archia Poeta (Latin + English) validation report

Generated: 2026-09-20T01:05:28.492Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- Latin: 32 sections, 21264 chars
- English: 32 sections, 29598 chars

## Verbatim spot-check

- OK - Latin sec-1 incipit
  - got: `si quid est in me ingeni, iudices, quod sentio quam sit exig`
- OK - Latin final section explicit
  - got: `bonam partem accepta, ab eo qui iudicium exercet certo scio.`
- OK - English sec-1 incipit
  - got: `If there is any natural ability in me, O judges,—and I know `
- OK - English final section explicit
  - got: `en so by him who presides at this trial, I am quite certain.`

## Anomalies (Latin, preserved not corrected)

- **pro-archia-la / apparatus** - 192 <note> elements (Clark's critical apparatus - manuscript variant readings <app><lem>...</lem>...</app>, and the scholiast/editorial glosses embedded the same way) were excluded entirely, tag and content, at every nesting depth. None are Cicero's own text.
- **pro-archia-la / Division.ref** - 12 <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-archia-la/types.ts. Passage.ref is null throughout: no finer inline citation exists.

## Anomalies (English, preserved not corrected)

- **pro-archia-en / apparatus** - 1 <note anchored="true"> footnotes (Yonge's own translator's commentary - explaining puns, textual cruxes, historical background; not Cicero's own words) were excluded entirely, tag and content.
- **pro-archia-en / Division.ref** - 12 <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-archia-la/types.ts. Passage.ref is null throughout.
- **pro-archia-en / (work level) front matter** - This witness carries one further division the Latin sibling does not: a <div subtype="commentary"> holding "THE ARGUMENT" (1 paragraph(s)), a whole-speech synopsis printed once before section 1, not tied to any numbered section. It is editorial framing for the reader, not part of the translated oration itself, and this app's flat sec-N schema has no slot for a division that precedes section 1 - it is therefore excluded from the reading text rather than invented into a spurious "sec-0". Flagged here for independent review, not silently dropped: a reader wanting Yonge's/Perseus's synopsis should consult the raw XML at scripts/import-pro-archia-en/raw/.

## Errors

_none_

## Warnings

_none_
