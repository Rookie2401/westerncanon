# Cicero letters-selection validation report - ad-familiares-selection-la

Generated: 2026-09-20T00:40:10.206Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (letters): 57
- passages: 241
- total passage chars: 147901

## Spot checks

- OK - letter-1-9 starts with "periucundae mihi fuerunt litterae tuae"
  - got: `periucundae mihi fuerunt litterae tuae, quibus intellexi te perspicere meam in t`
- OK - letter-14-4 ends with "filiola et spes reliqua nostra, Cicero, valete. Pr. K. Mai. Brundisio."
  - got: `carissima filiola et spes reliqua nostra, Cicero, valete. Pr. K. Mai. Brundisio.`

## Anomalies (preserved, not corrected)

- **ad-familiares-selection-la / structure** - 0 <note> apparatus element(s) encountered in the source and discarded entirely (tag + content); 0 <gap reason="omitted"/> marker(s) encountered within extracted letters (see the per-letter entries above for which).
- **ad-familiares-selection-la / book subtype casing** - Confirmed by direct inspection: this source’s book-level division uses subtype="Book" (capitalised), unlike Ad Atticum’s lowercase subtype="book". Not a typo; handled explicitly by the importer.
- **ad-familiares-selection-la / edition divergence from the English sibling (Book 10)** - Purser's Latin critical text splits two of Book 10's traditionally single-numbered letters into a lettered sub-letter each - 10.21/10.21A and 10.34/10.34A - matching (letter-for-letter) the two places Shuckburgh's English translation (data/ad-familiares-selection-en) independently re-splits the same two traditional letters across non-adjacent chronological positions by section range. Both editions agree these two letters are compound; this app represents Purser's split as two separate Divisions (10.21, 10.21a, 10.34, 10.34a) and Shuckburgh's split as two Passages within one Division each - a genuine, confirmed edition difference in Division count, not a parsing error.

## Errors

_none_

## Warnings

_none_
