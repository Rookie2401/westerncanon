# brutus-la validation report

Generated: 2026-09-20T00:39:14.222Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (all levels): 333
- leaf divisions: 333
- passages: 333
- total passage chars: 168413
- sections with a non-null (chapter-milestone) ref: 333 / 333

## Verbatim spot-check

- OK - first passage starts "Cum e Cilicia decedens Rhodum venissem"
  - got: `Cum e Cilicia decedens Rhodum venissem et eo mihi de Q. Hortensi morte`
- OK - final (sec-333) ends "si operosa est concursatio magis opportunorum"
  - got: `t ut numerarer in multis si operosa est concursatio magis opportunorum`

## Anomalies (preserved, not corrected)

- **brutus-la / front matter** - The source's first "section" division (n="sigla") is Wilkins' own editorial key of manuscript sigla (F, B, O, G, H, M, L, N, D, codd. dett., vulg.) - front matter for his critical apparatus, not part of Cicero's text. Excluded entirely; the work's 333 real sections become sec-1..sec-333.
- **sec-71** - lacuna marker <gap reason="omitted" rend=". . . ."/> found; the printed edition marks a manuscript gap here (no text content in the tag itself, so nothing is fabricated in its place).
- **sec-333** - lacuna marker <gap reason="lost" rend=". . ."/> found; the printed edition marks a manuscript gap here (no text content in the tag itself, so nothing is fabricated in its place).
- **sec-333** - lacuna marker <gap reason="lost" rend=". . ."/> found; the printed edition marks a manuscript gap here (no text content in the tag itself, so nothing is fabricated in its place).
- **brutus-la / apparatus totals** - 690 apparatus-criticus <note> elements were dropped entirely (tag and content); not logged individually given the number (mirrors the treatment elsewhere in this library).

## Errors

_none_

## Warnings

_none_
