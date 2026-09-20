# Cicero letters-selection validation report - ad-quintum-fratrem-selection-la

Generated: 2026-09-20T00:40:13.595Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (letters): 1
- passages: 46
- total passage chars: 30252

## Spot checks

- OK - letter-1-1 starts with "etsi non dubitabam quin hanc epistulam multi nuntii"
  - got: `etsi non dubitabam quin hanc epistulam multi nuntii, fama denique esset ipsa sua`
- OK - letter-1-1 ends with "diligentissime servias."
  - got: `orem ut valetudini tuae, si me et tuos omnis valere vis, diligentissime servias.`

## Anomalies (preserved, not corrected)

- **ad-quintum-fratrem-selection-la / structure** - 2 <note> apparatus element(s) encountered in the source and discarded entirely (tag + content); 0 <gap reason="omitted"/> marker(s) encountered within the extracted letter.
- **ad-quintum-fratrem-selection-la / duplicate-div investigation** - Three <div type="textpart" n="1" subtype="letter"> divs exist in this source, one nested under each of Book I, II and III (each book has its own letter numbered 1) - a normal, expected structure, NOT a duplication bug. This is confirmed genuinely different from the English sibling source, which does have a real whole-file duplication bug - see data/ad-quintum-fratrem-selection-en/anomalies.json.

## Errors

_none_

## Warnings

_none_
