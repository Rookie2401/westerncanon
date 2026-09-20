# Pro M. Caelio (Latin only) validation report

Generated: 2026-09-20T01:06:39.879Z

**Result: PASS** - 0 error(s), 0 warning(s).

**Latin only**: no English translation is bundled for this speech. The only candidate found (English Wikisource, "For Marcus Caelius") had unreliable, partly unattributed provenance on independent investigation (its earliest 2006 revisions read as an original community translation, not a scan transcription of a public-domain published edition) and was dropped before shipping.

## Counts

- Latin: 80 sections, 58084 chars

## Verbatim spot-check

- OK - Latin sec-1 incipit
  - got: `si quis, iudices, forte nunc adsit ignarus legum iudiciorum `
- OK - Latin final section explicit
  - got: `s potissimum, iudices, fructus uberes diuturnosque capietis.`

## Anomalies (preserved not corrected)

- **pro-caelio-la / apparatus** - 476 <note> elements (Clark's critical apparatus - manuscript variant readings, scholia) were excluded entirely, tag and content, at every nesting depth. None are Cicero's own text.
- **pro-caelio-la / Division.ref** - 32 <milestone unit="chapter"/> markers captured; each section's Division.ref is the chapter number active at that section's start (nearest preceding chapter milestone in document order) - see data/pro-caelio-la/types.ts. Passage.ref is null throughout.
- **pro-caelio-la / praenomen abbreviations** - Every <choice><abbr>X</abbr><expan>Y<ex>...</ex></expan></choice> (a praenomen like "M." for "Marcus", "P." for "Publius") keeps only the printed <abbr> form; <expan> is dropped entirely.
- **pro-caelio-la / verse quotations** - This speech quotes several passages of Latin verse (Ennius's Medea exul, and a fragment attributed to Caecilius) marked with <quote>/<l>/<lb/>. Line boundaries are not preserved as a separate structure in this app's prose-oration schema; the verse text flows into the surrounding paragraph, matching how this app treats embedded verse quotations elsewhere in prose works.
- **pro-caelio-la / (work level)** - No <gap> (manuscript lacuna marker) appears anywhere in this witness, confirmed by direct inspection - unlike the Pro Roscio Amerino sibling, whose section 132 carries a well-known lacuna.

## Errors

_none_

## Warnings

_none_
