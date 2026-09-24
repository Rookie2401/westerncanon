# Boethius validation report - boethius-contra-eutychen-en

Generated: 2026-09-23T23:47:35.440Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- top-level divisions: 9
- passages: 9
- total passage chars: 46647
- identity check: raw 38139 chars vs work 38139 chars (normalised) - IDENTICAL

## Anomalies (preserved, not corrected)

_4 logged - see anomalies.json for the full list._

## Errors

_none_

## Warnings

- **[roman-marker-paragraph-removed]** 8 bare Roman-numeral-plus-period <p> element(s) (e.g. "I.", "VIII.") removed from the raw side before comparison: this translation marks its chapters with a standalone paragraph holding only the numeral, which is a structural marker (this importer's substitute for a <div> the page doesn't have), not reading text - it is correctly dropped from the output too (see parseTractateEn.ts's module doc).
