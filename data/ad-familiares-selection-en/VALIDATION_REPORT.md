# Cicero letters-selection validation report - ad-familiares-selection-en

Generated: 2026-09-20T00:40:11.961Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (letters): 55
- passages: 57
- total passage chars: 225223

## Spot checks

- OK - letter-1-9 starts with "M. Cicero desires his warmest regards to P. Lentulus"
  - got: `M. Cicero desires his warmest regards to P. Lentulus, imperator . Your letter wa`
- OK - letter-14-4 ends with "I have quite as much affection and loyalty."
  - got: `irit and resource than in old times, I have quite as much affection and loyalty.`

## Anomalies (preserved, not corrected)

- **F (English, whole file)** - 3 letter-div(s) were exact byte-for-byte duplicates of another div with the same book/letter token already seen earlier in the document and were dropped, keeping the first occurrence only (see the per-work importer's module doc for the confirmed cause).
- **10.21 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["L. MUNATIUS PLANCUS TO CICERO (AT ROME) — CAMP ON THE ISARA, 15 MAY","L. MUNATIUS PLANCUS TO CICERO (AT ROME) — CAMP ON THE ISARA (15 MAY)"].
- **10.34 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["M. AEMILIUS LEPIDUS TO CICERO (AT ROME) — PONS ARGENTEUS (18 MAY)","M. AEMILIUS LEPIDUS TO CICERO (AT ROME) — PONS ARGENTEUS, 22 MAY"].
- **ad-familiares-selection-en / structure** - 1060 <note> (translator/editor apparatus) element(s) discarded entirely (tag + content); 0 <epigraph> editorial headnote(s) excluded entirely; 2 letter(s) were reassembled from more than one source fragment; 3 exact-duplicate div(s) dropped.
- **ad-familiares-selection-en / edition divergence from the Latin sibling (Book 10)** - This English edition's Book 10 Division count (35) is 2 fewer than the Latin sibling data/ad-familiares-selection-la's (37): Purser's Latin critical text splits two traditionally single-numbered letters (10.21, 10.34) into a separate lettered sub-letter each (10.21A, 10.34A), which this app represents as two extra Divisions in the Latin edition; Shuckburgh instead reprints the same two letters' later sections at a separate chronological position without renumbering them, which this English edition reassembles into one Division with two Passages each. Both editions agree these two letters are compound - a genuine, confirmed edition difference, not a parsing error.

## Errors

_none_

## Warnings

_none_
