# Cicero letters-selection validation report - ad-quintum-fratrem-selection-en

Generated: 2026-09-20T00:40:15.259Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (letters): 1
- passages: 1
- total passage chars: 38908

## Spot checks

- OK - letter-1-1 starts with "Though I have no doubt that many messengers, and even common rumour"
  - got: `Though I have no doubt that many messengers, and even common rumour, with its us`
- OK - letter-1-1 ends with "if you wish me and all your friends to be well also. Farewell."
  - got: `e of your health, if you wish me and all your friends to be well also. Farewell.`

## Anomalies (preserved, not corrected)

- **Q FR (English, whole file)** - 27 letter-div(s) were exact byte-for-byte duplicates of another div with the same book/letter token already seen earlier in the document and were dropped, keeping the first occurrence only (see the per-work importer's module doc for the confirmed cause).
- **ad-quintum-fratrem-selection-en / structure** - 284 <note> (translator/editor apparatus) element(s) discarded entirely (tag + content); 0 <epigraph> editorial headnote(s) excluded entirely.
- **ad-quintum-fratrem-selection-en / duplicate-div investigation (book=1:letter=1)** - CONFIRMED SOURCE BUG (investigated as requested): this file’s <body> contains two top-level wrapper divs, <div n="Q"> and <div n="FR"> (the "Q FR" citation prefix, apparently meant to be a single non-nesting label, has been split into two wrapping elements). ALL 27 letters of Books I-III are duplicated wholesale, byte-for-byte identical, once inside each wrapper - not a structural split specific to letter 1.1 (it is simply the first letter in the file, so the first place the duplication is visible when scanning for book=1:letter=1). The importer’s shared parser strips stray wrapper <div> tags and deduplicates any letter-div seen more than once with identical content, keeping the first occurrence only; verified byte-identical here, so nothing was lost or double-counted.

## Errors

_none_

## Warnings

_none_
