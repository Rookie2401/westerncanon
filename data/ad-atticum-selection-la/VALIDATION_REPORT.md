# Cicero letters-selection validation report - ad-atticum-selection-la

Generated: 2026-09-20T00:40:06.667Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (letters): 201
- passages: 547
- total passage chars: 269136

## Spot checks

- OK - letter-2-19 starts with "multa me sollicitant et ex rei publicae tanto motu"
  - got: `multa me sollicitant et ex rei publicae tanto motu et ex iis periculis quae mihi`
- OK - letter-16-16f ends with "quod ut facias te vehementer etiam atque etiam rogo."
  - got: `diuvabis igitur, mi Capito. quod ut facias te vehementer etiam atque etiam rogo.`

## Anomalies (preserved, not corrected)

- **book 13 (Latin)** - Traditional letter number(s) 15, 18, 36 do not exist in this source's own numbering of Book 13 (confirmed absent by scanning every letter div actually present, min 1–max 52); this reflects a genuine feature of the traditional numbering, not a parsing gap.
- **13.9 (Latin)** - Source edition (Purser) itself omits text at 1 point(s) in this letter (<gap reason="omitted"/>); nothing fabricated in its place.
- **13.41 (Latin)** - Source edition (Purser) itself omits text at 1 point(s) in this letter (<gap reason="omitted"/>); nothing fabricated in its place.
- **15.2 (Latin)** - Source edition (Purser) itself omits text at 1 point(s) in this letter (<gap reason="omitted"/>); nothing fabricated in its place.
- **16.16C (Latin)** - Source edition (Purser) itself omits text at 1 point(s) in this letter (<gap reason="omitted"/>); nothing fabricated in its place.
- **ad-atticum-selection-la / structure** - 0 <note> apparatus element(s) encountered in the source and discarded entirely (tag + content); 4 <gap reason="omitted"/> marker(s) encountered within extracted letters (see the per-letter entries above for which).
- **ad-atticum-selection-la / edition divergence from the English sibling** - Purser's Latin critical edition subdivides several traditionally single-numbered letters in Books 12-16 into lettered sub-letters that this app treats as separate Divisions (e.g. 12.5 -> 5, 5A, 5B, 5C; also 12.18/18A, 12.37/37A, 12.38/38A, 13.2/2A/2B, 13.6/6A, 13.7/7A, 13.21/21A, 13.33/33A, 13.47/47A, 14.13/13A/13B, 14.17/17A, 15.1/1A, 15.4/4A, 15.16/16A, 16.13/13A, 16.16/16A/16B/16C/16D/16E/16F). Shuckburgh's English translation (data/ad-atticum-selection-en) does not split the same way and instead sometimes re-splits a single traditional letter across non-adjacent chronological positions by section range. The two editions' Division counts for Books 12-16 therefore differ; this is a genuine, confirmed edition difference, not a parsing error - see about.json.

## Errors

_none_

## Warnings

_none_
