# summa-en validation report

Generated: 2026-09-18T01:40:56.659Z

**Result: PASS** — 0 error(s), 29 warning(s).

## Methodology

Source: *Summa Theologiae*, English translation by the Fathers of the English Dominican Province (2nd/revised ed., 1920), hosted at newadvent.org. Fetched one page per Question — `https://www.newadvent.org/summa/{partDigit}{qNum:03d}.htm` for Parts I/I-II/II-II/III/Suppl. (digits 1-5), plus `6001.htm`/`6002.htm` (Supplementum Appendix I) and `7001.htm` (Appendix II) — 614 pages total; every Article of a Question is anchored on that same page (`#articleN`), so there is no separate per-article fetch. Raw HTML is cached under `scripts/import-summa-en/raw/` and parsed with jsdom; cross-reference links (`<a href="../cathen/...">`, `../bible/...`) are stripped to their plain text as ordinary HTML-transport cleanup, and HTML entities are decoded by jsdom's own HTML parsing.

Differences from the bundled Latin edition (`data/summa/`), both intentional and disclosed: `Question.prooemium` and `Part.prooemium` are always `null` (New Advent prints no continuous prooemium prose before Article 1, and Tertia Pars's Latin part-level prooemium has no per-question-page English equivalent to extract); `Article.title` is always populated (parsed directly from each page's own "Article N. ..." heading, unlike the Latin edition where title-parsing from the prooemium enumeration sometimes fails); `Article.witness` is never set (no secondary-witness lacuna-filling process exists for this edition — a genuine gap is logged in anomalies.json instead of being filled).

Appendix numbering: the Supplementum's 99 base questions (5001-5099.htm) are followed by 3 appendix questions continuing the same numbering as 100, 101 and 102 — matching the Latin edition's `data/summa/part-suppl.json` scheme exactly (cross-checked programmatically by this validator): `6001.htm` -> q.100 (`appendix: 'I', appendixNumber: 1`, citation `"Suppl. App. I q. 1"`), `6002.htm` -> q.101 (`appendix: 'I', appendixNumber: 2`, citation `"Suppl. App. I q. 2"`), `7001.htm` -> q.102 (`appendix: 'II', appendixNumber: 1`, citation `"Suppl. App. II q. 1"`).

## Counts

| part | questions | articles |
|------|-----------|----------|
| Part I (part-I.json) | 119 | 584 |
| Part I-II (part-I-II.json) | 114 | 619 |
| Part II-II (part-II-II.json) | 189 | 917 |
| Part III (part-III.json) | 90 | 549 |
| Supplement (part-suppl.json) | 102 | 456 |
| **TOTAL** | **614** | **3125** |

- anomalies recorded: 58

## Verbatim spot-check

- OK — Part I q.1 a.1 objection 1 starts "It seems that, besides philosophical science, we h..."
  - got: `It seems that, besides philosophical science, we have no need of any further knowledge. For man shou`
- OK — Supplementum's last article (Suppl. App. II q. 1 a. 2) respondeo ends "... but for that which is lowest in them, namely sin."
  - got: `unt, for they are not punished for being above us, but for that which is lowest in them, namely sin.`

## Anomalies (preserved, not corrected)

58 total — full detail in `data/summa-en/anomalies.json`. By category:

- 22 — a printed "Reply to Objection N" with no matching Objection N
- 7 — prefatory note outside the Objection/SedContra/Respondeo/Reply schema
- 7 — one reply paragraph covering multiple objection numbers
- 7 — printed Objection numbers not a clean 1..N sequence
- 5 — multiple "On the contrary," in one article
- 4 — missing/unmarked respondeo
- 2 — prooemium scope note
- 1 — link-stripping scope note
- 1 — non-standard reply heading wording
- 1 — merged/stray label text in a <strong> tag
- 1 — Appendix II title judgement call

<details><summary>Full list</summary>

- **summa-en / (work level)** — Every Question.prooemium is null throughout this edition. New Advent prints no continuous prooemium prose before Article 1 (unlike the Latin source, which has one); each page's <ol> is a linked enumeration of short article blurbs (not prose) and was never used as prooemium text.
- **summa-en / tertia-pars-en (part level)** — Part.prooemium is null for tertia-pars-en. The Latin Tertia Pars carries a part-level prooemium, but this per-question page structure (one New Advent page per Question, no separate part-introduction page) has no clean English-source equivalent to extract it from. This is a disclosed scope limit, not an oversight; no prooemium text has been fabricated or substituted.
- **summa-en / (work level)** — Inline cross-reference links (<a href="../cathen/...">, ../bible/..., etc.) are stripped to their plain anchor text throughout, same as every other importer in this repo strips wiki/HTML transport scaffolding — this is ordinary HTML-transport cleanup, not a content change. HTML entities are decoded by jsdom's own HTML parsing (no separate entity-decode step); only whitespace is collapsed afterwards.
- **summa-en / 1005.htm art.6** — paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: "\"Bonum honestum\" is the virtuous good considered as fitting. (cf. II-II, 141, 3; II-II, 145)"
- **summa-en / 1013.htm art.10** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 1013.htm art.10** — "Reply to Objection 5" has no matching Objection 5 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 1024.htm art.1** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 1031.htm art.4** — unusually phrased reply heading "The same Reply can be given to Objection 2." (not "Reply to Objection N.") — salvaged as a reply to objection number(s) [2] rather than discarded.
- **summa-en / 1053.htm art.2** — "Reply to Objection 3" has no matching Objection 3 on this page (printed Objection numbers: [1,2]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 1068.htm art.2** — respondeo opening is plain unmarked text ("I answer ... with ... that,") rather than the usual `<strong>I answer that,</strong>` — recognized by wording, not markup.
- **summa-en / 1074.htm art.2** — "Reply to Objection 5" has no matching Objection 5 on this page (printed Objection numbers: [1,2,3,4]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 1074.htm art.3** — no "I answer that," paragraph found on this page; respondeo is null (not fabricated).
- **summa-en / 1089.htm art.3** — "Reply to Objection 3" has no matching Objection 3 on this page (printed Objection numbers: [1,2]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 1089.htm art.3** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 1091.htm art.4** — no "I answer that," paragraph found on this page; respondeo is null (not fabricated).
- **summa-en / 1093.htm art.4** — combined reply paragraph explicitly named multiple objections (2, 3) in its heading ("Reply to Objections 2 and 3.") — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.
- **summa-en / 1097.htm art.1** — combined reply paragraph explicitly named multiple objections (1, 2) in its heading ("Reply to Objection 1 and 2") — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.
- **summa-en / 1114.htm art.4** — article has 2 "On the contrary," paragraphs — numbered sequentially (sedContra[1]), not merged.
- **summa-en / 1117.htm art.2** — no "I answer that," paragraph found on this page; respondeo is null (not fabricated).
- **summa-en / 2011.htm art.2** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 2026.htm art.3** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 2087.htm art.7** — article has 2 "On the contrary," paragraphs — numbered sequentially (sedContra[1]), not merged.
- **summa-en / 2089.htm art.1** — article has 2 "On the contrary," paragraphs — numbered sequentially (sedContra[1]), not merged.
- **summa-en / 2093.htm art.4** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 2102.htm art.5** — combined reply paragraph explicitly named multiple objections (8, 9) in its heading ("Reply to Objections 8 and 9.") — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.
- **summa-en / 3004.htm art.8** — "Reply to Objection 3" has no matching Objection 3 on this page (printed Objection numbers: [1,2]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 3026.htm art.11** — printed Objection numbers are [1,2,2], not a clean 1..3 sequence (gap and/or duplicate) — kept exactly as printed.
- **summa-en / 3026.htm art.11** — "Reply to Objection 3" has no matching Objection 3 on this page (printed Objection numbers: [1,2,2]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 3036.htm art.2** — printed Objection numbers are [1,1,3,4], not a clean 1..4 sequence (gap and/or duplicate) — kept exactly as printed.
- **summa-en / 3036.htm art.2** — "Reply to Objection 2" has no matching Objection 2 on this page (printed Objection numbers: [1,1,3,4]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 3049.htm art.6** — paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: "Foresight: \"Providentia,\" which may be translated either \"providence\" or \"foresight.\""
- **summa-en / 3138.htm art.1** — paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: "Effeminacy: Mollities, literally 'softness'"
- **summa-en / 3147.htm art.4** — "Reply to Objection 5" has no matching Objection 5 on this page (printed Objection numbers: [1,2,3,4]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 3172.htm art.1** — printed Objection numbers are [1,2,3,4,2], not a clean 1..5 sequence (gap and/or duplicate) — kept exactly as printed.
- **summa-en / 3185.htm art.7** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 4016.htm art.3** — paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: "[Note: The question is hardly apposite in English. St. Thomas explains why we can say in Latin, e.g. 'oratio dominica' (the Lord's Prayer) or 'passio dominica' (Our Lord's Passion), but not speak of our Lord as 'homo dominicus' (a lordly man)]."
- **summa-en / 4024.htm art.4** — combined reply paragraph explicitly named multiple objections (1, 2) in its heading ("Replies to Objections 1 and 2.") — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.
- **summa-en / 4035.htm art.5** — article has 2 "On the contrary," paragraphs — numbered sequentially (sedContra[1]), not merged.
- **summa-en / 4054.htm art.2** — paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: "[Note: Some editions give this article as the third, following the order of the introduction to the question. But this is evident from the first sentence of the body of [3] ([2] in the aforesaid editions), that the order of the Leonine edition is correct.]"
- **summa-en / 5014.htm art.4** — combined reply paragraph explicitly named multiple objections (2, 3) in its heading ("Reply to Objections 2 and 3.") — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.
- **summa-en / 5016.htm art.2** — combined reply paragraph explicitly named multiple objections (4, 5) in its heading ("Reply to Objections 4 and 5.") — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.
- **summa-en / 5040.htm art.3** — "Reply to Objection 11" has no matching Objection 11 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 5041.htm art.1** — printed Objection numbers are [1,1,3,4], not a clean 1..4 sequence (gap and/or duplicate) — kept exactly as printed.
- **summa-en / 5041.htm art.1** — "Reply to Objection 2" has no matching Objection 2 on this page (printed Objection numbers: [1,1,3,4]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 5052.htm art.1** — printed Objection numbers are [1,2,3,4,5,7], not a clean 1..6 sequence (gap and/or duplicate) — kept exactly as printed.
- **summa-en / 5052.htm art.1** — "Reply to Objection 6" has no matching Objection 6 on this page (printed Objection numbers: [1,2,3,4,5,7]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 5062.htm art.4** — combined reply paragraph explicitly named multiple objections (2, 3) in its heading ("Reply to Objections 2 and 3.") — duplicated as separate Reply entries (one per objectionNumber) sharing the identical text, so each named objection has a matching reply.
- **summa-en / 5064.htm art.3** — paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: "[This and the Fourth Article are omitted in the Leonine edition.]"
- **summa-en / 5064.htm art.4** — paragraph with no preceding labeled section — likely a translator's/editor's own prefatory note (e.g. a glossary gloss on a term in the article's title, or an editorial remark on article ordering), for which the schema has no field. NOT included in any structured output field, but preserved verbatim here: "[This and the previous article are omitted in the Leonine edition.]"
- **summa-en / 5069.htm art.3** — "Reply to Objection 4" has no matching Objection 4 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 5069.htm art.3** — "Reply to Objection 5" has no matching Objection 5 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 5069.htm art.3** — "Reply to Objection 6" has no matching Objection 6 on this page (printed Objection numbers: [1,2,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 5070.htm art.3** — article has 2 "On the contrary," paragraphs — numbered sequentially (sedContra[1]), not merged.
- **summa-en / 5071.htm art.3** — Objection 5 label contained extra trailing text merged into the <strong> tag (source markup irregularity): "On the contrary,". Discarded as label noise (not reading text); the paragraph's body text is still used as Objection 5.
- **summa-en / 5071.htm art.14** — printed Objection numbers are [1,3], not a clean 1..2 sequence (gap and/or duplicate) — kept exactly as printed.
- **summa-en / 5071.htm art.14** — "Reply to Objection 2" has no matching Objection 2 on this page (printed Objection numbers: [1,3]) — a genuine numbering irregularity in the source, kept exactly as printed rather than renumbered or dropped.
- **summa-en / 5077.htm art.4** — printed Objection numbers are [1,2,3,4,3], not a clean 1..5 sequence (gap and/or duplicate) — kept exactly as printed.
- **summa-en / appendix-2-1.html** — <h1> has no "Question N." prefix — it reads just "Purgatory". Judgement call: this is New Advent's own heading/section label for this appendix question ("Purgatory"), not a generic page/site label, so it was used verbatim as this question's title (title != null) rather than set to null.

</details>

## Errors

_none_

## Warnings

- **[reply-orphan]** part-I.json q.13 art.10: Reply.objectionNumber 4 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-I.json q.13 art.10: Reply.objectionNumber 5 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-I.json q.24 art.1: Reply.objectionNumber 4 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-I.json q.53 art.2: Reply.objectionNumber 3 does not match any Objection number [1,2] (documented in anomalies.json)
- **[reply-orphan]** part-I.json q.74 art.2: Reply.objectionNumber 5 does not match any Objection number [1,2,3,4] (documented in anomalies.json)
- **[reply-orphan]** part-I.json q.89 art.3: Reply.objectionNumber 3 does not match any Objection number [1,2] (documented in anomalies.json)
- **[reply-orphan]** part-I.json q.89 art.3: Reply.objectionNumber 4 does not match any Objection number [1,2] (documented in anomalies.json)
- **[reply-orphan]** part-I-II.json q.11 art.2: Reply.objectionNumber 4 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-I-II.json q.26 art.3: Reply.objectionNumber 4 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-I-II.json q.93 art.4: Reply.objectionNumber 4 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-II-II.json q.4 art.8: Reply.objectionNumber 3 does not match any Objection number [1,2] (documented in anomalies.json)
- **[objection-numbering]** part-II-II.json q.26 art.11: objection numbers are [1,2,2], not a clean 1..N sequence (documented in anomalies.json)
- **[reply-orphan]** part-II-II.json q.26 art.11: Reply.objectionNumber 3 does not match any Objection number [1,2,2] (documented in anomalies.json)
- **[objection-numbering]** part-II-II.json q.36 art.2: objection numbers are [1,1,3,4], not a clean 1..N sequence (documented in anomalies.json)
- **[reply-orphan]** part-II-II.json q.36 art.2: Reply.objectionNumber 2 does not match any Objection number [1,1,3,4] (documented in anomalies.json)
- **[reply-orphan]** part-II-II.json q.147 art.4: Reply.objectionNumber 5 does not match any Objection number [1,2,3,4] (documented in anomalies.json)
- **[objection-numbering]** part-II-II.json q.172 art.1: objection numbers are [1,2,3,4,2], not a clean 1..N sequence (documented in anomalies.json)
- **[reply-orphan]** part-II-II.json q.185 art.7: Reply.objectionNumber 4 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-suppl.json q.40 art.3: Reply.objectionNumber 11 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[objection-numbering]** part-suppl.json q.41 art.1: objection numbers are [1,1,3,4], not a clean 1..N sequence (documented in anomalies.json)
- **[reply-orphan]** part-suppl.json q.41 art.1: Reply.objectionNumber 2 does not match any Objection number [1,1,3,4] (documented in anomalies.json)
- **[objection-numbering]** part-suppl.json q.52 art.1: objection numbers are [1,2,3,4,5,7], not a clean 1..N sequence (documented in anomalies.json)
- **[reply-orphan]** part-suppl.json q.52 art.1: Reply.objectionNumber 6 does not match any Objection number [1,2,3,4,5,7] (documented in anomalies.json)
- **[reply-orphan]** part-suppl.json q.69 art.3: Reply.objectionNumber 4 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-suppl.json q.69 art.3: Reply.objectionNumber 5 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[reply-orphan]** part-suppl.json q.69 art.3: Reply.objectionNumber 6 does not match any Objection number [1,2,3] (documented in anomalies.json)
- **[objection-numbering]** part-suppl.json q.71 art.14: objection numbers are [1,3], not a clean 1..N sequence (documented in anomalies.json)
- **[reply-orphan]** part-suppl.json q.71 art.14: Reply.objectionNumber 2 does not match any Objection number [1,3] (documented in anomalies.json)
- **[objection-numbering]** part-suppl.json q.77 art.4: objection numbers are [1,2,3,4,3], not a clean 1..N sequence (documented in anomalies.json)
