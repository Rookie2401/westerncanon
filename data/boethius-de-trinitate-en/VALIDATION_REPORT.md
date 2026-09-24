# Boethius validation report - boethius-de-trinitate-en

Generated: 2026-09-23T23:47:35.441Z

**Result: PASS** - 0 error(s), 3 warning(s).

## Counts

- top-level divisions: 7
- passages: 7
- total passage chars: 22428
- identity check: raw 18326 chars vs work 18315 chars (normalised) - IDENTICAL

## Anomalies (preserved, not corrected)

_6 logged - see anomalies.json for the full list._

## Errors

_none_

## Warnings

- **[roman-marker-paragraph-removed]** 6 bare Roman-numeral-plus-period <p> element(s) (e.g. "I.", "VIII.") removed from the raw side before comparison: this translation marks its chapters with a standalone paragraph holding only the numeral, which is a structural marker (this importer's substitute for a <div> the page doesn't have), not reading text - it is correctly dropped from the output too (see parseTractateEn.ts's module doc).
- **[undefined-xml-entity]** 1 non-standard named XML entity/entities found in the raw file and textually pre-replaced before jsdom parsing (TEI boilerplate declared in an external DTD subset this importer never fetches; each sits inside <teiHeader>, which is stripped from this comparison anyway): &Perseus.publish; x1.
- **[identity-known-exception]** raw and output are identical only after removing 1 disclosed editorial excision(s) from the raw side: DETRINITATE (see anomalies.json for the full justification).
