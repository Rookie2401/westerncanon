# Cicero letters-selection validation report - ad-atticum-selection-en

Generated: 2026-09-20T00:40:08.392Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- divisions (letters): 190
- passages: 202
- total passage chars: 374119

## Spot checks

- OK - letter-2-19 starts with "I have many causes for anxiety, both from the disturbed state of polit"
  - got: `I have many causes for anxiety, both from the disturbed state of politics and fr`
- OK - letter-16-16f ends with "I earnestly and repeatedly beg you to do so."
  - got: `istance, therefore, my dear Capito: I earnestly and repeatedly beg you to do so.`

## Anomalies (preserved, not corrected)

- **A (English, whole file)** - 3 letter-div(s) were exact byte-for-byte duplicates of another div with the same book/letter token already seen earlier in the document and were dropped, keeping the first occurrence only (see the per-work importer's module doc for the confirmed cause).
- **book 12 (English)** - Traditional letter number(s) 32, 43, 49 do not exist in this source's own numbering of Book 12 (confirmed absent by scanning every letter div actually present, min 1–max 53); this reflects a genuine feature of the traditional numbering, not a parsing gap.
- **book 13 (English)** - Traditional letter number(s) 18, 36 do not exist in this source's own numbering of Book 13 (confirmed absent by scanning every letter div actually present, min 1–max 52); this reflects a genuine feature of the traditional numbering, not a parsing gap.
- **book 15 (English)** - Traditional letter number(s) 11 do not exist in this source's own numbering of Book 15 (confirmed absent by scanning every letter div actually present, min 1–max 29); this reflects a genuine feature of the traditional numbering, not a parsing gap.
- **12.5 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 3 separate divs in the source (sections 3 in total); reassembled here as 3 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — TUSCULUM (JULY)","TO ATTICUS (AT ROME) — TUSCULUM, 31 MAY","TO ATTICUS (AT ROME) — TUSCULUM, 12 JUNE"].
- **12.31 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — ASTURA (29 MARCH)","TO ATTICUS (AT ROME) — ASTURA, 28 MARCH"].
- **12.37 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — ASTURA (4 MAY)","TO ATTICUS (AT ROME) — ASTURA (5 MAY)"].
- **12.38 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — ASTURA (MAY)","TO ATTICUS (AT ROME) — ASTURA (7 MAY)"].
- **12.42 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME OR A SUBURBAN VILLA) — ASTURA (10 MAY)","TO ATTICUS (AT ROME) — ASTURA (12 MAY)"].
- **12.47 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — LANUVIUM (16 MAY)","TO ATTICUS (AT ROME) — LANUVIUM (17 MAY)"].
- **13.2 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 3 separate divs in the source (sections 3 in total); reassembled here as 3 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — TUSCULUM (24 MAY)","TO ATTICUS (AT ROME) — TUSCULUM (27 MAY)","TO ATTICUS (AT ROME) — TUSCULUM, 29 MAY"].
- **13.6 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — ASTURA (16 MARCH)","TO ATTICUS (AT ROME) — TUSCULUM (4 JUNE)"].
- **13.21 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — ASTURA, 28 JULY","TO ATTICUS (AT ROME) — ARPINUM (JUNE 30)"].
- **13.33 (English)** - Shuckburgh's chronological ordering splits this traditional letter across 2 separate divs in the source (sections 2 in total); reassembled here as 2 Passages of one Division, in section order. Distinct opener headings were found on more than one fragment; Division.sourceHeading captures only the first (section-ascending) fragment's heading: ["TO ATTICUS (AT ROME) — TUSCULUM, 3 JUNE","TO ATTICUS (AT ROME) — TUSCULUM (9 JULY)"].
- **ad-atticum-selection-en / structure** - 1596 <note> (translator/editor apparatus) element(s) discarded entirely (tag + content); 0 <epigraph> editorial headnote(s) excluded entirely; 10 letter(s) were reassembled from more than one source fragment (see the per-letter entries above); 3 exact-duplicate div(s) dropped.
- **ad-atticum-selection-en / edition divergence from the Latin sibling** - This English edition's Book 12-16 Division set does not match data/ad-atticum-selection-la's 1:1: Purser's Latin critical text subdivides several traditionally single-numbered letters into lettered sub-letters (e.g. 12.5 -> 5, 5A, 5B, 5C) that Shuckburgh's translation does not split the same way (it instead sometimes re-splits ONE traditional letter across non-adjacent chronological positions by section range, reassembled here into a single Division with multiple Passages). This is a genuine, confirmed edition difference, not a parsing error - see about.json.

## Errors

_none_

## Warnings

_none_
