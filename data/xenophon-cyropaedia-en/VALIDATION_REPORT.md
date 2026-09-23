# Xenophon validation report - xenophon-cyropaedia-en

Generated: 2026-09-23T04:47:44.742Z

**Result: PASS** - 0 error(s), 0 warning(s).

## Counts

- structure: books
- divisions (incl. Book containers): 49
- passages: 41
- total passage chars: 626968
- anomalies logged: 20

## Per-division passage counts (leaf divisions only, first 50)

| id | number | passages | chars |
|----|--------|----------|-------|
| book-1-ch-1 | 1 | 1 | 4976 |
| book-1-ch-2 | 2 | 1 | 13147 |
| book-1-ch-3 | 3 | 1 | 13324 |
| book-1-ch-4 | 4 | 1 | 22745 |
| book-1-ch-5 | 5 | 1 | 8516 |
| book-1-ch-6 | 6 | 1 | 32897 |
| book-2-ch-1 | 1 | 1 | 17309 |
| book-2-ch-2 | 2 | 1 | 15451 |
| book-2-ch-3 | 3 | 1 | 13168 |
| book-2-ch-4 | 4 | 1 | 14976 |
| book-3-ch-1 | 1 | 1 | 22089 |
| book-3-ch-2 | 2 | 1 | 13469 |
| book-3-ch-3 | 3 | 1 | 29102 |
| book-4-ch-1 | 1 | 1 | 10431 |
| book-4-ch-2 | 2 | 1 | 19784 |
| book-4-ch-3 | 3 | 1 | 8927 |
| book-4-ch-4 | 4 | 1 | 3686 |
| book-4-ch-5 | 5 | 1 | 20911 |
| book-4-ch-6 | 6 | 1 | 6006 |
| book-5-ch-1 | 1 | 1 | 13380 |
| book-5-ch-2 | 2 | 1 | 15815 |
| book-5-ch-3 | 3 | 1 | 19933 |
| book-5-ch-4 | 4 | 1 | 20419 |
| book-5-ch-5 | 5 | 1 | 17717 |
| book-6-ch-1 | 1 | 1 | 22086 |
| book-6-ch-2 | 2 | 1 | 17603 |
| book-6-ch-3 | 3 | 1 | 14858 |
| book-6-ch-4 | 4 | 1 | 6604 |
| book-7-ch-1 | 1 | 1 | 20599 |
| book-7-ch-2 | 2 | 1 | 9779 |
| book-7-ch-3 | 3 | 1 | 5820 |
| book-7-ch-4 | 4 | 1 | 6951 |
| book-7-ch-5 | 5 | 1 | 30931 |
| book-8-ch-1 | 1 | 1 | 19981 |
| book-8-ch-2 | 2 | 1 | 14715 |
| book-8-ch-3 | 3 | 1 | 19630 |
| book-8-ch-4 | 4 | 1 | 14142 |
| book-8-ch-5 | 5 | 1 | 10765 |
| book-8-ch-6 | 6 | 1 | 10269 |
| book-8-ch-7 | 7 | 1 | 12670 |
| book-8-ch-8 | 8 | 1 | 11387 |

## Anomalies (preserved, not corrected) - first 100

- **xenophon-cyropaedia-en / Book 8, Chapter 8** - This English witness carries a <delSpan spanTo="#a"/> ... <anchor xml:id="a"/> pair spanning from just before Book 8 Chapter 8 to the very end of the document (verified by direct offset inspection) - Miller's Loeb edition marking essentially the whole of Book 8 Chapter 8 as suspected spurious (not by Xenophon; a well-known classical-scholarship question - the chapter's harsh critique of Persian moral decline is widely regarded as a later addition). Marchant's Greek edition carries no such marking and prints Chapter 8 as ordinary text. This app KEEPS Chapter 8 in both editions' reading text, unbracketed (delSpan/anchor is a distant span-pointer, not a wrapping tag like <del>, so it is not run through the bracket-insertion policy either): omitting an entire final chapter from only one of the two parallel editions would both discard content still present in the source and break the two editions' structural symmetry (41 chapters across 8 books in both). Readers should be aware of this well-documented authenticity question when reading Book 8, Chapter 8.
- **cyropaedia-en / apparatus** - 5 <bibl> inline source-attribution label(s) (e.g. naming the poet a quoted line traces to, such as "Theognis") excluded from the reading text - confirmed by direct inspection to be glued onto the surrounding text with no separating whitespace, i.e. editorial apparatus, never part of Xenophon's own sentence. Not logged individually.
- **cyropaedia-en / apparatus** - 525 <note> translator/editorial footnote(s) excluded entirely, at every nesting depth - never Xenophon's own words. Not logged individually (too numerous to be useful per-occurrence).
- **book 1 ch 6 sec 10** - <sic> - printed exactly as transmitted despite an apparent irregularity, kept verbatim: "more"
- **book 2 ch 3 sec 18** - <sic> - printed exactly as transmitted despite an apparent irregularity, kept verbatim: "oppononts"
- **book 2 ch 3 sec 18** - <corr> editorial correction, printed as this edition's running text, kept verbatim: "opponents"
- **book 3 ch 3 sec 59** - <del> editor-bracketed text KEPT in the reading text (in square brackets): ",well-disciplined"
- **book 4 ch 1 sec 15** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "when we are successful"
- **book 4 ch 3 sec 16** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "and they seem so, for though both be moving rapidly, yet, if they are near to one another, they are as if standing still."
- **book 5 ch 4 sec 44** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "and the wise also retreat in the safest possible way, and not in the quickest"
- **book 6 ch 1 sec 51** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "and his wife, Panthea, with here own money had a golden corselet made for him and a helmet and armlet of gold;"
- **book 6 ch 3 sec 21** - <add> editorial supplement, kept verbatim in the reading text (it IS part of what this edition prints): "Chrysantas"
- **book 6 ch 3 sec 21** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "Now each platoon contained twenty-four men."
- **book 6 ch 4 sec 11** - <sic> - printed exactly as transmitted despite an apparent irregularity, kept verbatim: "chariat"
- **book 6 ch 4 sec 11** - <corr> editorial correction, printed as this edition's running text, kept verbatim: "chariot"
- **book 7 ch 3 sec 15** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "And now even to this day, it is said, the monument Their monument of the eunuchs is still standing; and they say that the names of the husband and wife are inscribed in Assyrian letters upon the slab above; and below, it is said, are three slabs with the inscription the mace-bearers. Staff-bearers—apparently court officials, bearing a staff of office; mentioned again 8.1.38; 8.3.15; Anab. 1.6.11."
- **book 8 ch 1 sec 16** - <sic> - printed exactly as transmitted despite an apparent irregularity, kept verbatim: ","
- **book 8 ch 1 sec 31** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "Moreover, he distinguished between considerateness and self-control in this way: the considerate are those who avoid what is offensive when seen; the self-controlled avoid that which is offensive, even when unseen."
- **book 8 ch 1 sec 44** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "so that they might spend all their lives as slaves, without a protest"
- **book 8 ch 5 sec 28** - <del> editor-bracketed text KEPT in the reading text (in square brackets): "But some historians say that he married his mother’s sister. But that maid must certainly have been a very old maid."

## Errors

_none_

## Warnings

_none_
