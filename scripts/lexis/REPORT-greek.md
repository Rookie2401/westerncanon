# REPORT-greek.md — Greek data package (D-GRC) build report

Built 2026-09-24. Pipeline: `scripts/lexis/greek/build-diorisis-corpus.mjs` (full Diorisis parse,
~95s) -> `scripts/lexis/greek/build-kaikki-index.mjs` (kaikki stream, ~8s) -> `scripts/lexis/build-greek.mjs`
(main build, ~26s). Verification: `node scripts/lexis/greek/check-greek.mjs`.

## 1. Sources actually used

| source | what | licence | size |
|---|---|---|---|
| Diorisis Ancient Greek Corpus (Vatri & McGillivray, figshare 10.6084/m9.figshare.6187256) | token-level lemma + POS + morphology for 820 works, 10.2M words | CC BY-SA 3.0 US (per the licence embedded in every file; figshare's own metadata says plain CC BY 4.0 — treated as the more restrictive one) | 2.5 GB unzipped (194 MB zip) |
| kaikki.org Ancient Greek Wiktionary extract | form -> lemma/pos/gloss fallback, 68,196 entries / ~940k surface forms (after length-mark stripping) | CC BY-SA (English Wiktionary) | 401 MB JSONL |
| Perseus LSJ (`PerseusDL/lexica`, `CTS_XML_TEI/perseus/pdllex/grc/lsj/`, 27 files) | primary dictionary: gloss, senses, full article HTML, inflection note | CC BY-SA 4.0 | 271 MB TEI XML, 116,497 entries |

**Middle Liddell was not used** — deviation from the task brief. `scripts/GREEK-MORPHOLOGY-RESEARCH.md`
named `PerseusDL/lexica`'s `grc/ml/` as its location; that path does not exist in the repository
(confirmed directly: `CTS_XML_TEI/perseus/pdllex/grc/` contains only `lsj/`, and the GitHub API and
raw.githubusercontent.com both 404 on every `grc.ml.perseus-eng*.xml` filename tried). The only
Middle-Liddell-named data found on GitHub (`alpheios-project/mjm`, "Major + Middle Liddell") ships a
Diogenes-format `.dat` file, not TEI, with no clear standalone licence statement, so it was not
substituted either. Every gloss instead falls back LSJ -> kaikki per the plan's own fallback chain,
with the Middle Liddell tier simply absent from the middle, so `LexEntry.dict` is always `"lsj"` or
`"wiktionary"`, never `"middle-liddell"` — no `src`/`dict` value outside the plan's vocabulary was
invented to compensate.

## 2. Matching works to Diorisis

Our importers carry the CTS URN as free text inside `about.json`'s `provenance` field
(`urn:cts:greekLit:tlgNNNN.tlgNNN`), extracted with a regex (no work has a structured `urn` field).
231/234 works had a parseable URN this way; 3 were resolved by hand: Homer's *Iliad*/*Odyssey*
(standard TLG 0012.001/002, URN simply absent from the imported prose) and Aristotle's *Posterior
Analytics* (Wikisource import, no CTS URN at all for a Wikisource-sourced text).

Diorisis's own `<tlgAuthor>`/`<tlgId>` teiHeader fields (not the filename, though the two agree)
were matched directly against these numbers: **186/234 works (79.5%) matched a Diorisis file
exactly** — close to the research phase's conservative estimate (78.4%) and slightly higher.

**48 unmatched works**, entirely explained by gaps in Diorisis's own coverage (Diorisis's stated
scope is "Homer to the early 5th century AD" and it simply never covers these authors at all, not a
matching failure):
- All 13 **Archimedes** works (TLG 0552) — Diorisis has no Archimedes file at all.
- 34 **Aristotle** treatises (TLG 0086) — Diorisis only has 11 of ~45 Aristotle works (the
  *Nicomachean Ethics*, *Politics*, *Rhetoric*, *Metaphysics*, *Categories* group and a few
  others); *De Anima*, *De Caelo*, *Physics*, *Meteorologica*, *Historia Animalium*, the *Parva
  Naturalia* treatises, *Topics*, *Sophistical Refutations*, *Magna Moralia* etc. are absent. One
  nuance: Diorisis's *Analytica priora et posteriora (001)* file bundles BOTH the Prior and
  Posterior Analytics as a single TLG work-number; since it can't be cleanly split by token,
  `posterior-analytics-grc` is treated as unmatched rather than risk false "attested in this work"
  (1.0-confidence) readings actually drawn from the Prior half.
- 6 **Euripides** plays (*Alcestis*, *Andromache*, *Cyclops*, *Heracleidae*, *Hippolytus*,
  *Medea*) and 2 Plutarch *Lives* (*Agis and Cleomenes*, *Tiberius and Caius Gracchus*) — present
  in Diorisis under different TLG work-numbers than the ones our texts use (the original research
  already flagged this for Euripides: full author present, work-number mismatch); not chased down
  further given time.
- *Ptolemy's Almagest* — Diorisis has no Ptolemy file.

Every unmatched work still gets corpus-wide Diorisis (0.9 confidence) and kaikki (0.7) coverage —
see the coverage table below. Unmatched works are not meaningfully lower-coverage in practice
(e.g. `physics-grc` 96.4%, `euripides-medea-grc` 97.8%) because the corpus-wide tier already
contains most common Greek vocabulary regardless of which specific work it's attested in.

## 3. Method notes (deviations / judgment calls)

- **Beta Code conversion** (`scripts/lexis/greek/beta-code.mjs`): diacritics follow the letter
  normally, but precede it (between `*` and the letter) when capitalised — confirmed directly
  against both Diorisis's and LSJ's raw text, not assumed. 19 self-test cases (`node
  scripts/lexis/greek/beta-code.mjs`) plus a direct round-trip against the Republic's opening
  sentence (`κατέβην χθὲς εἰς Πειραιᾶ μετὰ Γλαύκωνος...` — exact match against the app's own text).
  Vowel-length marks (`^`/`_`) are accepted and stripped (our corpus never marks vowel length;
  kaikki does, and leaving them in would break every lookup against it).
- **Morph tag translation** (`scripts/lexis/greek/morph-map.mjs`): Diorisis's `masc/neut gen sg`
  style slash-combinations (meaning "the form doesn't disambiguate") are expanded into the
  cartesian product of single-valued Readings, since `Reading[1]` is one concrete combination, not
  a set — e.g. `masc/neut gen sg` becomes two Readings, `noun gen sg m` and `noun gen sg n`.
  Dialect notes (attic, epic, doric, aeolic, ionic, homeric, poetic, Koine...) carry no
  plan-vocabulary tag and are dropped, never invented.
- **Homographs are not split by LSJ sense-numbering** — deviation from the task brief's step 3.
  Diorisis already assigns one specific `entry` (lemma spelling) per token occurrence itself (its
  own disambiguation), and lexeme ids need to be the SAME string whether they come from a work's
  own Diorisis file, the corpus-wide index, or LSJ's dictionary lookup. Implementing LSJ's
  homograph numbering (`ba/gos1`/`bago/s2`, ~2.3% of LSJ headwords) would require Diorisis to also
  emit the same numbering, which it doesn't — attempting it anyway would have produced form-index
  lexeme ids that don't resolve to any lex/grc entry (a real correctness bug) or silently
  duplicated entries under ids nothing points to. Instead: lexeme id is uniformly
  `grc:<pos>:<lemma>`; when LSJ has multiple numbered variants for the same headword+pos,
  `pickEntry()` prefers a POS-classified match (from LSJ's own `<pos>`/`<tns>`/`<gen>` tags, i.e.
  Adv./Adj./Subst./verb detected by principal-parts presence) then `type="main"` then document
  order — the same policy `vetus-v0/scripts/build-lexicon-la.mjs` uses for Lewis & Short.
- **`scripts/lexis/shared/check-bundles.mjs` (verification item 1) appears to have a bug**: its
  `TAGS` set (used to validate every token of a Reading's morph string) never includes the POS
  abbreviations (`noun`, `verb`, `art`, ...) even though LEXIS-PLAN.md §3 requires morph to be
  "pos first, then features" and the plan's own worked examples all start with a pos token.
  Running it as instructed produces ~3.5M "unrecognised morph tag" failures across **all three
  languages'** bundles in one run (`la:30,642` and `it:2,714` lexicon entries were checked in the
  same run and hit the same class of failure) — evidence this is a checker bug, not a defect in
  any one language's data. Not edited here (the file is owned by the D-LA/IT package, not D-GRC).
  `scripts/lexis/greek/check-greek.mjs` re-implements the same five checks correctly (POS-aware)
  for the grc bundles specifically:

  ```
  checked 234 grc work bundles, 925181 form keys, 3506358 readings, 71568 lex/grc entries.
  All grc checks passed.
  ```

- **Empty-gloss lexemes**: `CoreLexeme.gloss` is a required field. 3,623 proper names with no
  gloss anywhere get `"a proper name"` (`src:"name"`) — the same fallback
  `vetus-v0/scripts/build-lexicon-la.mjs` uses for Latin proper names. 4,258 non-name lexemes
  (mostly rare/dialectal adjectives, verbs, nouns absent from both LSJ and kaikki, ~6% of the
  71,568 referenced lexemes) get the literal string `"(no gloss available)"` with no `src` — an
  honest "we don't know" label rather than a fabricated meaning or an empty string the type
  wouldn't distinguish from a bug.
- **Two LSJ gloss-extraction fixes made after spot-checking** (both generalise, not one-off
  patches for a single word): (a) a small number of entries (measured: 21/116,497, but including
  very-high-frequency prepositions like ὑπό) open with a comparative-linguistics aside ("cf. Skt.
  úpa 'towards, near to', Goth. uf 'under'") whose `<tr>` tags are foreign cognates, not an
  English gloss — now skipped when preceded by `Skt.`/`Skr.`/`Goth.`/`OHG.`/`OE.`; this fixed
  πατήρ's gloss from a corrupted Sanskrit fragment ("pitṛ[snull ]u") to "father" and ὑπό's from
  "úpa" to "from under". (b) trailing commas/semicolons on `<tr>` text (lifted from running prose,
  e.g. `"insatiate,"`) are trimmed. **One known unfixed case**: φαίνω's gloss is "A ren." (a
  citation fragment from deep inside its principal-parts apparatus) instead of "bring to light,
  cause to appear" — its real gloss is the entry's *second* `<tr>`, not first, and no general
  pattern distinguishes this from a legitimate short gloss without risking false positives
  elsewhere; left as a known limitation of the "first `<tr>`" heuristic on structurally complex
  entries rather than hand-patched.
- **Euclid/Archimedes point-label exclusion** (task brief step 5): tokens that are ≤3 unaccented
  capital-or-lowercase letters and have no reading anywhere (Diorisis or kaikki) are excluded from
  the *reported* "unrecognised" count, not from `WorkLexis.tokens`/`recognized` themselves (those
  stay honest/unadjusted, matching the type's own definition). Effect, most visible on Euclid:
  **150,379 tokens, 131,170 recognized (87.2% raw), 19,209 raw unrecognised -> 18,340 of those are
  point-labels (αβ, βγ, ΑΒΓ...) -> 869 true unrecognised (99.4% adjusted coverage)**. Full
  per-work effect for every Euclid/Archimedes work is below (§6) and in
  `scripts/lexis/raw/build-greek-stats.json`'s `excludedShortUnaccented`; no reading was ever
  fabricated for a point-label token.
- **Empty-array form entries are never stored**: an unrecognised token's loose key is simply
  absent from `WorkLexis.forms` (never present with `[]`) — matches the plan's honesty rule ("an
  unrecognised word is simply not tappable-with-a-card") and the working shared checker's own
  assumption that every present key has ≥1 reading.

## 4. Coverage — per language

- **grc**: 234 works, 71,568 lexemes, **97.6% token coverage** (recognized/tokens across the whole
  corpus). Source: `scripts/lexis/coverage.json`'s `grc` block (merged; `la`/`it` untouched).
- Gloss sourcing across the 71,568 referenced lexemes: 34,138 from LSJ (47.7%), 29,549 from kaikki
  (41.3%), 3,623 "a proper name" fallback (5.1%), 4,258 "(no gloss available)" (5.9%).

## 5. Sizes

| | count | total | largest |
|---|---:|---:|---|
| `data/lexis/works/*.json` (grc only) | 234 | 304.2 MB | `jewish-antiquities-grc.json`, 10.5 MB |
| `data/lexis/lex/grc/*.json` | 462 shards | 47.1 MB | `πα-6.json`, 330 KB |
| **grc total** | | **~351 MB** | |

Median work bundle: ~1.1 MB (`plutarch-artaxerxes-grc.json`). Smallest: `de-ventis-grc.json`, 78 KB.

**Flag for the orchestrator**: several work bundles are large (the five largest are all 6.5-10.5 MB:
Josephus's *Jewish Antiquities*/*Jewish War*, Polybius, Herodotus, Thucydides — all genuinely
150k-311k-token works). `vite.config.ts` already excludes `lexis/**` from the PWA precache and
runtime-caches it StaleWhileRevalidate (fetched once per work, not upfront), so this is a
per-work-open cost, not a whole-app bundle-size problem — but a multi-megabyte fetch on first open
of these specific long works is worth knowing about; the format itself (Reading tuples repeat the
full lexeme-id string rather than interning it) is `src/lexis/types.ts`'s contract, not something
this package can change.

Lex shard splitting note: `shardPrefix()` groups by the first two folded characters of the lemma;
a few very common two-letter Greek prefixes (πα-, πρ-, κα-, πε-) have enough distinct lemmas that
splitting once (by lemma ordering, ~200KB target per half) still leaves individual halves
slightly over 250 KB. Not re-split further given the marginal payoff (largest shard is 330 KB, a
one-time fetch cached thereafter) versus added complexity.

## 6. Euclid/Archimedes point-label exclusion — full effect

| work | tokens | recognized | raw unrecognised | excluded (point-labels) | adjusted unrecognised | adjusted coverage |
|---|---:|---:|---:|---:|---:|---:|
| euclid-elements | 150379 | 131170 | 19209 | 18340 | 869 | 99.4% |
| archimedes-sphere-cylinder | 23553 | 21316 | 2237 | 2000 | 237 | 99.0% |
| archimedes-conoids-spheroids | 22410 | 20019 | 2391 | 861 | 1530 | 93.2% |
| archimedes-spirals | 14306 | 12585 | 1721 | 954 | 767 | 94.6% |
| archimedes-method | 9745 | 8772 | 973 | 752 | 221 | 97.7% |
| archimedes-plane-equilibrium | 8819 | 7586 | 1233 | 824 | 409 | 95.4% |
| archimedes-floating-bodies | 8520 | 7707 | 813 | 462 | 351 | 95.9% |
| archimedes-quadrature-parabola | 5802 | 5126 | 676 | 410 | 266 | 95.4% |
| archimedes-sand-reckoner | 5034 | 4699 | 335 | 69 | 266 | 94.7% |
| archimedes-liber-assumptorum | 3676 | 3090 | 586 | 357 | 229 | 93.8% |
| archimedes-measurement-circle | 1036 | 831 | 205 | 177 | 28 | 97.3% |
| archimedes-fragments | 1179 | 1042 | 137 | 69 | 68 | 94.2% |
| archimedes-stomachion | 438 | 371 | 67 | 42 | 25 | 94.3% |
| archimedes-cattle-problem | 694 | 617 | 77 | 19 | 58 | 91.6% |

(Archimedes' own adjusted coverage is lower than Euclid's mainly because Archimedes has no
Diorisis file at all — corpus-wide + kaikki only — not because of the point-label rule.)

## 7. 200 most frequent unrecognised forms (corpus-wide, by occurrence count)

Overwhelmingly Euclid/Archimedes point-labels (2-4 unaccented capital letters — αβ, βγ, ΑΒΓ...)
and Greek numeral notation (γ΄, ϛ, ιβ = the letter-numerals 3, 6, 12...), exactly as the research
predicted. A few genuine vocabulary gaps stand out and are worth naming: **ἐπικύκλου/ἐπίκυκλον**
("epicycle", 461+79 — from the unmatched *Ptolemy's Almagest*), **τουτέστιν** (crasis of
τοῦτ' ἔστιν, 399 — Diorisis/kaikki index the uncontracted phrase, not the crasis form),
**τμᾶμα/τμάματος/τμήματος family** ("segment", Doric-spelled, Archimedes' technical term for a
circular/conic segment), and proper names in Josephus (**δαυίδης/δαυίδου/δαυίδην** = David,
**σαοῦλος/σαούλου** = Saul, **μωυσέος** = Moses, genitive) whose Doric/Koine-flavoured
declined-name spellings aren't in kaikki's name coverage.

```
1. "σω" (4609)  2. "αβ" (2007)  3. "αθ" (1394)  4. "αγ" (1230)  5. "κλ" (1095)
6. "βγ" (1091)  7. "ξε" (1078)  8. "θεαι" (992)  9. "αβγ" (891)  10. "εζ" (832)
11. "γδ" (758)  12. "τξ" (721)  13. "δ΄" (720)  14. "αλ" (672)  15. "΄" (654)
16. "γ΄" (618)  17. "νε" (616)  18. "πρω" (560)  19. "αε" (545)  20. "ζη" (543)
21. "βο" (534)  22. "νο" (527)  23. "αδ" (474)  24. "ἐπικύκλου" (461)  25. "δε" (457)
26. "αη" (419)  27. "ρκ" (416)  28. "γβ" (402)  29. "τουτέστιν" (399)  30. "γζ" (382)
31. "ϛ" (381)  32. "ηθ" (368)  33. "βε" (368)  34. "βδ" (363)  35. "εβ" (351)
36. "αζ" (322)  37. "κθ" (309)  38. "δβ" (308)  39. "κβ" (306)  40. "εη" (302)
41. "βα" (297)  42. "ιπ" (295)  43. "ερμ" (294)  44. "ζθ" (291)  45. "ιβ" (290)
46. "κζ" (282)  47. "τμᾶμα" (275)  48. "ϛ΄" (270)  49. "ε΄" (262)  50. "εθ" (262)
51. "θκ" (258)  52. "βη" (252)  53. "κγ" (250)  54. "καλ" (244)  55. "δζ" (243)
56. "ιδ" (242)  57. "μεν" (235)  58. "αβγδ" (231)  59. "λα" (230)  60. "ιζ" (228)
61. "ιε" (224)  62. "μν" (222)  63. "κδ" (222)  64. "ια" (221)  65. "ζδ" (220)
66. "εγ" (219)  67. "βζ" (219)  68. "δγ" (219)  69. "ζε" (207)  70. "πωλ" (207)
71. "μζ" (205)  72. "ηβ" (204)  73. "κρ" (203)  74. "ιγ" (202)  75. "λβ" (196)
76. "ετ" (196)  77. "ιθ" (191)  78. "μδ" (191)  79. "μη" (190)  80. "φαι" (190)
81. "δεζ" (185)  82. "ακ" (180)  83. "λθ" (178)  84. "λη" (172)  85. "ζβ" (171)
86. "γθ" (167)  87. "εκ" (167)  88. "νθ" (167)  89. "ζκ" (166)  90. "νβ" (166)
91. "ἀπλῶς" (166)  92. "μβ" (165)  93. "λδ" (165)  94. "ᾱ" (164)  95. "νη" (163)
96. "τμάματος" (161)  97. "λμ" (159)  98. "δη" (159)  99. "ζγ" (157)  100. "λγ" (156)
101. "λζ" (153)  102. "γη" (152)  103. "νξ" (147)  104. "να" (146)  105. "μγ" (145)
106. "εδ" (144)  107. "βθ" (141)  108. "ιϛ" (141)  109. "εα" (140)  110. "θα" (139)
111. "ηζ" (137)  112. "θζ" (133)  113. "νζ" (132)  114. "μενελέως" (132)  115. "ὀξυγωνίου" (131)
116. "θη" (131)  117. "μθ" (129)  118. "ηκ" (127)  119. "νδ" (126)  120. "β΄" (123)
121. "βκ" (123)  122. "κϛ" (123)  123. "τμάματι" (121)  124. "γκ" (117)  125. "κμ" (117)
126. "γμ" (116)  127. "νγ" (116)  128. "ευθ" (116)  129. "βαγ" (115)  130. "ῑ" (112)
131. "δα" (112)  132. "κωνοειδέος" (110)  133. "ηγ" (109)  134. "ζα" (105)  135. "εζηθ" (103)
136. "πραξάγορα" (103)  137. "ελ" (102)  138. "θεο" (102)  139. "ἐυελπίδης" (102)  140. "σφαιροειδέος" (100)
141. "θγ" (100)  142. "γλ" (100)  143. "α΄" (100)  144. "γορ" (99)  145. "μϛ" (98)
146. "δθ" (96)  147. "μα" (95)  148. "δαυίδης" (95)  149. "λϛ" (95)  150. "μς" (91)
151. "λς" (89)  152. "περιγείου" (88)  153. "ζμ" (87)  154. "ηε" (86)  155. "δαυίδου" (86)
156. "ιων" (85)  157. "αεγ" (84)  158. "ζλ" (80)  159. "αγβ" (79)  160. "ἐπίκυκλον" (79)
161. "ἄχθω" (77)  162. "σαοῦλος" (77)  163. "λούκουλλος" (77)  164. "ηα" (76)  165. "φαιδ" (76)
166. "οὐεσπασιανὸς" (75)  167. "θβ" (74)  168. "σαούλου" (74)  169. "δκ" (73)  170. "νς" (73)
171. "ηδ" (72)  172. "τμάματα" (69)  173. "αεβ" (69)  174. "δαυίδην" (69)  175. "ξο" (68)
176. "δμ" (68)  177. "γὼ" (67)  178. "τμαμάτων" (67)  179. "νι" (67)  180. "εξ" (66)
181. "μωυσέος" (66)  182. "λν" (64)  183. "αβδ" (64)  184. "ἐσσοῦνται" (60)  185. "αβε" (60)
186. "ἀθήνα" (60)  187. "καλονίκη" (59)  188. "σελιδίῳ" (59)  189. "περίγειον" (59)  190. "νϛ" (59)
191. "βν" (57)  192. "ἀκρωνύκτου" (57)  193. "λο" (56)  194. "ζῳοτοκεῖ" (56)  195. "αγδ" (56)
196. "βαδ" (56)  197. "ῑε" (56)  198. "πὶ" (55)  199. "νλ" (55)  200. "θλ" (54)
```

## 8. Spot-check sample — 5 random tokens from each of 8 works (for hand verification)

Deterministic sample (`node scripts/lexis/greek/sample-tokens.mjs`), covering drama, prose
history, mathematics (Euclid), biography (Plutarch), Hellenistic-Jewish history (Josephus),
epic (Homer), philosophy (Plato), and an unmatched-to-Diorisis work (Aristotle via Wikisource).
**This sample was taken from the original build; §10 (Fix batch 1) below re-runs several of the
same words after that round's fixes and should be read as the current state for anything that
changed — several glosses/POS values shown here (τῇ→"the following", ὁ→noun, πόλις→adj, "δὲ"'s
reading order) are the pre-fix ones and no longer match the shipped data.**

### aeschylus-agamemnon-grc (drama) — 8496 tokens, 8341/8496 recognized
- "γυναικὸς" -> γυνή [noun] "noun gen sg f" (conf 1) — gloss: woman (src: lsj)
- "εὐλαβείᾳ" -> εὐλάβεια [adj] "adj dat sg f" (conf 1) — gloss: discretion, caution (src: lsj)
- "Κασάνδρα" -> Κασάνδρη [name] "name nom du f" (conf 0.9) — gloss: a proper name (src: name)
- "πρῶτον" -> πρότερος [adj] "adj acc sg m" (conf 1) — gloss: before, in front (src: lsj)
- "ὑπὸ" -> ὑπό [prep] "prep indecl" (conf 1) — gloss: from under (src: lsj)

### thucydides-history-grc (prose/history) — 150157 tokens, 149865/150157 recognized
- "λαμπρῶς" -> λαμπρός [adj] "adj" (conf 1) — gloss: bright, radiant (src: lsj)
- "διὰ" -> διά [prep] "prep indecl" (conf 1) — gloss: through (src: lsj)
- "ἀνηλωκυίας" -> ἀναλίσκω [verb] "verb perf ptcp act acc pl f" (conf 1) — gloss: use up, spend (src: lsj)
- "οἱ" -> ὁ [art] "art nom pl m" (conf 1) — gloss: the following (src: lsj)
- "οἵ" -> ἕ [pron] "pron dat sg m" (conf 1) — gloss: accusative of οὗ (hoû): him (src: wiktionary)

### euclid-elements (mathematics) — 150379 tokens, 131170/150379 recognized
- "ὅτι" -> ὅστις [pron] "pron nom sg n" (conf 1) — gloss: that (src: lsj)
- "γὰρ" -> γάρ [part] "part indecl" (conf 1) — gloss: for (src: lsj)
- "ΘΗ" (key "θη") — NO READING (point-label; excluded from the "unrecognised" report count, §3/§6)
- "ΔΗ" (key "δη") — NO READING (point-label)
- "ΒΔ" (key "βδ") — NO READING (point-label)

### plutarch-aemilius-paulus-grc (biography) — 9614 tokens, 9561/9614 recognized
- "Αἰμιλίῳ" -> Αἰμίλιος [name] "name dat sg m" (conf 1) — gloss: Aemilius; any individual among the Aemilius family (src: wiktionary)
- "γεγονώς" -> γίγνομαι [verb] "verb perf ptcp act nom sg m" (conf 1) — gloss: come into a new state of being (src: lsj)
- "αὐτοῖς" -> αὐτός [pron] "pron dat pl n" (conf 1) — gloss: self (src: lsj)
- "κατόπιν" -> κατόπιν [adv] "adv indecl" (conf 1) — gloss: behind, after (src: lsj)
- "δʼ" -> δέ [part] "part indecl" (conf 1) — gloss: but (src: lsj)

### jewish-antiquities-grc (Hellenistic-Jewish history) — 311416 tokens, 305158/311416 recognized
- "αὐτῷ" -> αὐτός [pron] "pron dat sg n" (conf 1) — gloss: self (src: lsj)
- "φίλος" -> φίλος [adj] "adj nom sg m" (conf 1) — gloss: beloved, dear (src: lsj)
- "εἴκοσι" -> εἴκοσι [verb] "verb indecl" (conf 1) — gloss: twenty (src: lsj) — **note**: Diorisis's
  own automatic POS-tagger mis-tags this indeclinable numeral as `verb` rather than `num`; not
  corrected (would require overriding Diorisis's own POS attribute, which the pipeline otherwise
  trusts as ground truth — see also νηλέϊ below). A small, known source-data limitation.
- "τις" -> τις [pron] "pron nom sg m" (conf 1) — gloss: any one, any thing (src: lsj)
- "πατέρα" -> πατήρ [noun] "noun acc sg m" (conf 1) — gloss: father (src: lsj)

### iliad-grc (epic) — 111868 tokens, 111533/111868 recognized
- "μὲν" -> μέν [part] "part indecl" (conf 1) — gloss: indeed, of a truth (src: lsj)
- "δὴ" -> δή [part] "part indecl" (conf 1) — gloss: at this (src: lsj)
- "νηλέϊ" -> νηλής [adv] "adv dat sg" (conf 1) — gloss: pitiless, ruthless (src: lsj) — **note**:
  same class of Diorisis auto-tagging quirk as εἴκοσι above (an adjective's dative singular tagged
  adverbial); the gloss/lemma are correct, only the pos/morph axis is affected.
- "ἀντία" -> ἀντίον [adj] "adj nom pl n" (conf 1) — gloss: inflection of ἀντίος (antíos): (src: wiktionary)
- "καὶ" -> καί [conj] "conj indecl" (conf 1) — gloss: and (src: lsj)

### plato-republic-grc (philosophy) — 88210 tokens, 88187/88210 recognized
- "οὐδὲν" -> οὐδείς [pron] "pron nom sg n" (conf 1) — gloss: not one (src: lsj)
- "φαίνεται" -> φαίνω [verb] "verb pres ind mp 3 sg" (conf 1) — gloss: A ren. (src: lsj) — the
  known unfixed gloss-extraction case, §3.
- "οὖν" -> οὖν [part] "part indecl" (conf 1) — gloss: certainly, in fact (src: lsj)
- "οἷος" -> οἷος [adj] "adj nom sg m" (conf 1) — gloss: such as, of what sort (src: lsj)
- "τῇ" -> ὁ [art] "art dat sg f" (conf 1) — gloss: the following (src: lsj)

### posterior-analytics-grc (Aristotle, Wikisource import, unmatched to Diorisis) — 22668 tokens, 22646/22668 recognized
- "τὸ" -> ὁ [art] "art nom sg n" (conf 0.9) — gloss: the following (src: lsj)
- "δ'" -> δέ [part] "part indecl" (conf 0.9) — gloss: but (src: lsj)
- "ἀδύνατον" -> ἀδύνατος [adj] "adj acc sg m" (conf 0.9) — gloss: unable (src: lsj)
- "δὲ" -> δέ [part] "part indecl" (conf 0.9) — gloss: but (src: lsj)
- (Confidence is capped at 0.9 throughout this work — corpus-wide Diorisis only, no per-work
  attestation, exactly as expected for an unmatched work.)

## 9. Full per-work coverage table (234 works)

Columns: TLG author.work (from `about.json`'s URN, or `-` if none/manual), running-word tokens,
recognized tokens, coverage %, whether it matched a Diorisis file exactly.

| work | tlg | tokens | recognized | coverage | matched Diorisis |
|---|---|---:|---:|---:|:---:|
| aeschylus-agamemnon-grc | 0085.005 | 8496 | 8341 | 98.2% | yes |
| aeschylus-eumenides-grc | 0085.007 | 5515 | 5432 | 98.5% | yes |
| aeschylus-libation-bearers-grc | 0085.006 | 5694 | 5609 | 98.5% | yes |
| aeschylus-persians-grc | 0085.002 | 5435 | 5302 | 97.6% | yes |
| aeschylus-prometheus-bound-grc | 0085.003 | 6156 | 6102 | 99.1% | yes |
| aeschylus-seven-against-thebes-grc | 0085.004 | 5342 | 5202 | 97.4% | yes |
| aeschylus-suppliants-grc | 0085.001 | 5215 | 5092 | 97.6% | yes |
| archimedes-cattle-problem | 0552.012 | 694 | 617 | 88.9% | no |
| archimedes-conoids-spheroids | 0552.003 | 22410 | 20019 | 89.3% | no |
| archimedes-floating-bodies | 0552.008 | 8520 | 7707 | 90.5% | no |
| archimedes-fragments | 0552.013 | 1179 | 1042 | 88.4% | no |
| archimedes-liber-assumptorum | 0552.011 | 3676 | 3090 | 84.1% | no |
| archimedes-measurement-circle | 0552.002 | 1036 | 831 | 80.2% | no |
| archimedes-method | 0552.010 | 9745 | 8772 | 90.0% | no |
| archimedes-plane-equilibrium | 0552.005 | 8819 | 7586 | 86.0% | no |
| archimedes-quadrature-parabola | 0552.007 | 5802 | 5126 | 88.3% | no |
| archimedes-sand-reckoner | 0552.006 | 5034 | 4699 | 93.3% | no |
| archimedes-sphere-cylinder | 0552.001 | 23553 | 21316 | 90.5% | no |
| archimedes-spirals | 0552.004 | 14306 | 12585 | 88.0% | no |
| archimedes-stomachion | 0552.009 | 438 | 371 | 84.7% | no |
| aristophanes-acharnians-grc | 0019.001 | 7720 | 7572 | 98.1% | yes |
| aristophanes-birds-grc | 0019.006 | 11528 | 11306 | 98.1% | yes |
| aristophanes-clouds-grc | 0019.003 | 10408 | 10289 | 98.9% | yes |
| aristophanes-ecclesiazusae-grc | 0019.010 | 8435 | 8220 | 97.5% | yes |
| aristophanes-frogs-grc | 0019.009 | 9974 | 9797 | 98.2% | yes |
| aristophanes-knights-grc | 0019.002 | 9494 | 9423 | 99.3% | yes |
| aristophanes-lysistrata-grc | 0019.007 | 8805 | 8524 | 96.8% | yes |
| aristophanes-peace-grc | 0019.005 | 8678 | 8508 | 98.0% | yes |
| aristophanes-plutus-grc | 0019.011 | 8795 | 8671 | 98.6% | yes |
| aristophanes-thesmophoriazusae-grc | 0019.008 | 7873 | 7628 | 96.9% | yes |
| aristophanes-wasps-grc | 0019.004 | 10368 | 10203 | 98.4% | yes |
| athenian-constitution-grc | 0086.003 | 16619 | 16481 | 99.2% | yes |
| categoriae-grc | 0086.006 | 10316 | 10043 | 97.4% | yes |
| de-anima-grc | 0086.002 | 20876 | 20704 | 99.2% | no |
| de-audibilibus-grc | 0086.004 | 3492 | 3400 | 97.4% | no |
| de-caelo-grc | 0086.005 | 29676 | 29122 | 98.1% | no |
| de-coloribus-grc | 0086.007 | 5002 | 4837 | 96.7% | no |
| de-divinatione-per-somnum-grc | 0086.008 | 1200 | 1197 | 99.8% | yes |
| de-generatione-animalium-grc | 0086.012 | 50150 | 48810 | 97.3% | no |
| de-generatione-et-corruptione-grc | 0086.013 | 16523 | 16211 | 98.1% | no |
| de-incessu-animalium-grc | 0086.015 | 6360 | 6222 | 97.8% | no |
| de-insomniis-grc | 0086.016 | 2436 | 2427 | 99.6% | yes |
| de-interpretatione-grc | 0086.017 | 6244 | 6106 | 97.8% | yes |
| de-iuventute-grc | 0086.018 | 1845 | 1844 | 99.9% | yes |
| de-lineis-insecabilibus-grc | 0086.019 | 2959 | 2915 | 98.5% | no |
| de-longitudine-grc | 0086.020 | 1789 | 1786 | 99.8% | yes |
| de-melisso-xenophane-gorgia-grc | 0086.047 | 4873 | 4781 | 98.1% | no |
| de-memoria-grc | 0086.024 | 2515 | 2510 | 99.8% | yes |
| de-mirabilibus-grc | 0086.027 | 9180 | 8790 | 95.8% | no |
| de-motu-animalium-grc | 0086.021 | 4116 | 4075 | 99.0% | no |
| de-partibus-animalium-grc | 0086.030 | 40550 | 37983 | 93.7% | no |
| de-plantis-grc | 0086.039 | 12094 | 11706 | 96.8% | no |
| de-respiratione-grc | 0086.037 | 6110 | 6084 | 99.6% | yes |
| de-sensu-grc | 0086.041 | 7868 | 7840 | 99.6% | yes |
| de-somno-grc | 0086.042 | 2989 | 2980 | 99.7% | yes |
| de-spiritu-grc | 0086.043 | 3463 | 3413 | 98.6% | no |
| de-ventis-grc | 0086.046 | 426 | 375 | 88.0% | no |
| economics-grc | 0086.029 | 6247 | 6216 | 99.5% | yes |
| euclid-elements | 1799.001 | 150379 | 131170 | 87.2% | yes |
| eudemian-ethics-grc | 0086.009 | 26299 | 26263 | 99.9% | yes |
| euripides-alcestis-grc | 0006.002 | 6930 | 6662 | 96.1% | no |
| euripides-andromache-grc | 0006.006 | 7632 | 7291 | 95.5% | no |
| euripides-bacchae-grc | 0006.017 | 8013 | 7847 | 97.9% | yes |
| euripides-cyclops-grc | 0006.001 | 4411 | 4125 | 93.5% | no |
| euripides-electra-grc | 0006.012 | 8103 | 7945 | 98.1% | yes |
| euripides-hecuba-grc | 0006.007 | 7588 | 7457 | 98.3% | yes |
| euripides-helen-grc | 0006.014 | 10453 | 10158 | 97.2% | yes |
| euripides-heracleidae-grc | 0006.004 | 6473 | 6230 | 96.2% | no |
| euripides-heracles-grc | 0006.009 | 8246 | 8113 | 98.4% | yes |
| euripides-hippolytus-grc | 0006.005 | 8532 | 8120 | 95.2% | no |
| euripides-ion-grc | 0006.010 | 9857 | 9686 | 98.3% | yes |
| euripides-iphigenia-in-aulis-grc | 0006.018 | 9897 | 9734 | 98.4% | yes |
| euripides-iphigenia-in-tauris-grc | 0006.013 | 8850 | 8686 | 98.1% | yes |
| euripides-medea-grc | 0006.003 | 8297 | 7976 | 96.1% | no |
| euripides-orestes-grc | 0006.016 | 10614 | 10459 | 98.5% | yes |
| euripides-phoenician-women-grc | 0006.015 | 10359 | 10189 | 98.4% | yes |
| euripides-rhesus-grc | 0006.019 | 5664 | 5574 | 98.4% | yes |
| euripides-suppliants-grc | 0006.008 | 7361 | 7265 | 98.7% | yes |
| euripides-trojan-women-grc | 0006.011 | 7449 | 7282 | 97.8% | yes |
| herodotus-histories-grc | 0016.001 | 184933 | 184026 | 99.5% | yes |
| historia-animalium-grc | 0086.014 | 94055 | 91187 | 97.0% | no |
| iliad-grc | 0012.001 | 111868 | 111533 | 99.7% | yes |
| isagoge-grc | 2034.006 | 5583 | 5298 | 94.9% | no |
| jewish-antiquities-grc | 0526.001 | 311416 | 305158 | 98.0% | yes |
| jewish-war-grc | 0526.004 | 125211 | 123727 | 98.8% | yes |
| magna-moralia-grc | 0086.022 | 23561 | 22691 | 96.3% | no |
| mechanica-grc | 0086.023 | 8346 | 7829 | 93.8% | no |
| meditations-grc | 0562.001 | 29231 | 29120 | 99.6% | yes |
| metaphysics-grc | 0086.025 | 78713 | 78623 | 99.9% | yes |
| meteorologica-grc | 0086.026 | 33784 | 33114 | 98.0% | no |
| nicomachean-ethics-grc | 0086.010 | 56418 | 56364 | 99.9% | yes |
| odyssey-grc | 0012.002 | 87193 | 86936 | 99.7% | yes |
| physics-grc | 0086.031 | 54912 | 53769 | 97.9% | no |
| physiognomonica-grc | 0086.032 | 5763 | 5390 | 93.5% | no |
| plato-alcibiades-1-grc | 0059.013 | 11166 | 10250 | 91.8% | yes |
| plato-alcibiades-2-grc | 0059.014 | 4360 | 4175 | 95.8% | yes |
| plato-apology-grc | 0059.002 | 8750 | 8743 | 99.9% | yes |
| plato-charmides-grc | 0059.018 | 8305 | 8301 | 100.0% | yes |
| plato-cleitophon-grc | 0059.029 | 1556 | 1548 | 99.5% | yes |
| plato-cratylus-grc | 0059.005 | 18906 | 18069 | 95.6% | yes |
| plato-critias-grc | 0059.032 | 4972 | 4948 | 99.5% | yes |
| plato-crito-grc | 0059.003 | 4276 | 4169 | 97.5% | yes |
| plato-epinomis-grc | 0059.035 | 6357 | 6310 | 99.3% | yes |
| plato-euthydemus-grc | 0059.021 | 12550 | 12450 | 99.2% | yes |
| plato-euthyphro-grc | 0059.001 | 5412 | 5179 | 95.7% | yes |
| plato-gorgias-grc | 0059.023 | 27354 | 26236 | 95.9% | yes |
| plato-greater-hippias-grc | 0059.025 | 8805 | 8443 | 95.9% | yes |
| plato-hipparchus-grc | 0059.015 | 2402 | 2238 | 93.2% | yes |
| plato-ion-grc | 0059.027 | 4025 | 3845 | 95.5% | yes |
| plato-laches-grc | 0059.019 | 7928 | 7669 | 96.7% | yes |
| plato-laws-grc | 0059.034 | 104959 | 103029 | 98.2% | yes |
| plato-lesser-hippias-grc | 0059.026 | 4415 | 4181 | 94.7% | yes |
| plato-letters-grc | 0059.036 | 16965 | 16944 | 99.9% | yes |
| plato-lovers-grc | 0059.016 | 2391 | 2391 | 100.0% | yes |
| plato-lysis-grc | 0059.020 | 6947 | 6923 | 99.7% | yes |
| plato-menexenus-grc | 0059.028 | 4854 | 4806 | 99.0% | yes |
| plato-meno-grc | 0059.024 | 10273 | 9750 | 94.9% | yes |
| plato-minos-grc | 0059.033 | 3019 | 2826 | 93.6% | yes |
| plato-parmenides-grc | 0059.009 | 15244 | 15244 | 100.0% | yes |
| plato-phaedo-grc | 0059.004 | 22449 | 22343 | 99.5% | yes |
| plato-phaedrus-grc | 0059.012 | 17003 | 16583 | 97.5% | yes |
| plato-philebus-grc | 0059.010 | 18799 | 17648 | 93.9% | yes |
| plato-protagoras-grc | 0059.022 | 17607 | 17515 | 99.5% | yes |
| plato-republic-grc | 0059.030 | 88210 | 88187 | 100.0% | yes |
| plato-sophist-grc | 0059.007 | 17171 | 15992 | 93.1% | yes |
| plato-statesman-grc | 0059.008 | 18291 | 16947 | 92.7% | yes |
| plato-symposium-grc | 0059.011 | 17355 | 17338 | 99.9% | yes |
| plato-theaetetus-grc | 0059.006 | 23524 | 22484 | 95.6% | yes |
| plato-theages-grc | 0059.017 | 3602 | 3510 | 97.4% | yes |
| plato-timaeus-grc | 0059.031 | 23784 | 23735 | 99.8% | yes |
| plutarch-aemilius-paulus-grc | 0007.019 | 9614 | 9561 | 99.4% | yes |
| plutarch-agesilaus-grc | 0007.044 | 10722 | 10684 | 99.6% | yes |
| plutarch-agis-and-cleomenes-grc | 0007.051 | 13414 | 13317 | 99.3% | no |
| plutarch-alcibiades-grc | 0007.015 | 10042 | 9998 | 99.6% | yes |
| plutarch-alexander-grc | 0007.047 | 19877 | 19766 | 99.4% | yes |
| plutarch-antony-grc | 0007.058 | 18468 | 18264 | 98.9% | yes |
| plutarch-aratus-grc | 0007.063 | 11756 | 11700 | 99.5% | yes |
| plutarch-aristides-grc | 0007.024 | 8142 | 8116 | 99.7% | yes |
| plutarch-artaxerxes-grc | 0007.064 | 7345 | 7270 | 99.0% | yes |
| plutarch-brutus-grc | 0007.061 | 11877 | 11739 | 98.8% | yes |
| plutarch-caesar-grc | 0007.048 | 16007 | 15882 | 99.2% | yes |
| plutarch-caius-marcius-coriolanus-grc | 0007.016 | 9335 | 9293 | 99.6% | yes |
| plutarch-caius-marius-grc | 0007.031 | 12787 | 12635 | 98.8% | yes |
| plutarch-camillus-grc | 0007.011 | 11041 | 10938 | 99.1% | yes |
| plutarch-cato-the-younger-grc | 0007.050 | 16626 | 16495 | 99.2% | yes |
| plutarch-cicero-grc | 0007.055 | 11957 | 11848 | 99.1% | yes |
| plutarch-cimon-grc | 0007.035 | 5846 | 5817 | 99.5% | yes |
| plutarch-comparison-of-agesilaus-and-pompey-grc | 0007.046 | 1079 | 1072 | 99.4% | yes |
| plutarch-comparison-of-agis-and-cleomenes-and-the-gracchi-grc | 0007.053 | 974 | 969 | 99.5% | yes |
| plutarch-comparison-of-alcibiades-and-coriolanus-grc | 0007.017 | 1068 | 1065 | 99.7% | yes |
| plutarch-comparison-of-aristides-and-marcus-cato-grc | 0007.026 | 1461 | 1452 | 99.4% | yes |
| plutarch-comparison-of-demetrius-and-antony-grc | 0007.059 | 880 | 877 | 99.7% | yes |
| plutarch-comparison-of-demosthenes-and-cicero-grc | 0007.056 | 976 | 947 | 97.0% | yes |
| plutarch-comparison-of-dion-and-brutus-grc | 0007.062 | 936 | 935 | 99.9% | yes |
| plutarch-comparison-of-lucullus-and-cimon-grc | 0007.037 | 984 | 971 | 98.7% | yes |
| plutarch-comparison-of-lycurgus-and-numa-grc | 0007.006 | 1587 | 1580 | 99.6% | yes |
| plutarch-comparison-of-lysander-and-sulla-grc | 0007.034 | 1233 | 1230 | 99.8% | yes |
| plutarch-comparison-of-nicias-and-crassus-grc | 0007.040 | 1206 | 1201 | 99.6% | yes |
| plutarch-comparison-of-pelopidas-and-marcellus-grc | 0007.023 | 800 | 797 | 99.6% | yes |
| plutarch-comparison-of-pericles-and-fabius-maximus-grc | 0007.014 | 719 | 717 | 99.7% | yes |
| plutarch-comparison-of-philopoemen-and-titus-grc | 0007.029 | 547 | 545 | 99.6% | yes |
| plutarch-comparison-of-sertorius-and-eumenes-grc | 0007.043 | 397 | 396 | 99.7% | yes |
| plutarch-comparison-of-solon-and-publicola-grc | 0007.009 | 940 | 936 | 99.6% | yes |
| plutarch-comparison-of-theseus-and-romulus-grc | 0007.003 | 1156 | 1152 | 99.7% | yes |
| plutarch-comparison-of-timoleon-and-aemilius-grc | 0007.020 | 478 | 477 | 99.8% | yes |
| plutarch-crassus-grc | 0007.039 | 10216 | 10084 | 98.7% | yes |
| plutarch-demetrius-grc | 0007.057 | 12290 | 12214 | 99.4% | yes |
| plutarch-demosthenes-grc | 0007.054 | 6820 | 6795 | 99.6% | yes |
| plutarch-dion-grc | 0007.060 | 11765 | 11741 | 99.8% | yes |
| plutarch-eumenes-grc | 0007.041 | 5510 | 5473 | 99.3% | yes |
| plutarch-fabius-maximus-grc | 0007.013 | 7713 | 7666 | 99.4% | yes |
| plutarch-galba-grc | 0007.065 | 6146 | 6038 | 98.2% | yes |
| plutarch-lucullus-grc | 0007.036 | 13327 | 13051 | 97.9% | yes |
| plutarch-lycurgus-grc | 0007.004 | 9391 | 9356 | 99.6% | yes |
| plutarch-lysander-grc | 0007.032 | 8127 | 8098 | 99.6% | yes |
| plutarch-marcellus-grc | 0007.022 | 8423 | 8351 | 99.1% | yes |
| plutarch-marcus-cato-grc | 0007.025 | 8065 | 8021 | 99.5% | yes |
| plutarch-nicias-grc | 0007.038 | 8992 | 8969 | 99.7% | yes |
| plutarch-numa-grc | 0007.005 | 7506 | 7404 | 98.6% | yes |
| plutarch-otho-grc | 0007.066 | 4129 | 4060 | 98.3% | yes |
| plutarch-pelopidas-grc | 0007.021 | 9410 | 9367 | 99.5% | yes |
| plutarch-pericles-grc | 0007.012 | 9941 | 9906 | 99.6% | yes |
| plutarch-philopoemen-grc | 0007.027 | 5686 | 5666 | 99.6% | yes |
| plutarch-phocion-grc | 0007.049 | 8159 | 8123 | 99.6% | yes |
| plutarch-pompey-grc | 0007.045 | 20100 | 19947 | 99.2% | yes |
| plutarch-publicola-grc | 0007.008 | 5843 | 5713 | 97.8% | yes |
| plutarch-pyrrhus-grc | 0007.030 | 10870 | 10805 | 99.4% | yes |
| plutarch-romulus-grc | 0007.002 | 9211 | 8961 | 97.3% | yes |
| plutarch-sertorius-grc | 0007.042 | 6649 | 6559 | 98.6% | yes |
| plutarch-solon-grc | 0007.007 | 8466 | 8423 | 99.5% | yes |
| plutarch-sulla-grc | 0007.033 | 11493 | 11357 | 98.8% | yes |
| plutarch-themistocles-grc | 0007.010 | 7905 | 7857 | 99.4% | yes |
| plutarch-theseus-grc | 0007.001 | 7384 | 7330 | 99.3% | yes |
| plutarch-tiberius-and-caius-gracchus-grc | 0007.052 | 9173 | 9096 | 99.2% | no |
| plutarch-timoleon-grc | 0007.018 | 9051 | 9026 | 99.7% | yes |
| plutarch-titus-flamininus-grc | 0007.028 | 5817 | 5781 | 99.4% | yes |
| poetics-grc | 0086.034 | 10226 | 10188 | 99.6% | yes |
| politics-grc | 0086.035 | 65535 | 65449 | 99.9% | yes |
| polybius-histories-grc | 0543.001 | 312013 | 308882 | 99.0% | yes |
| posterior-analytics-grc | - | 22668 | 22646 | 99.9% | no |
| prior-analytics-grc | 0086.001 | 37575 | 37514 | 99.8% | yes |
| problemata-grc | 0086.036 | 73881 | 72005 | 97.5% | no |
| ptolemy-almagest-grc | 0363.001 | 175480 | 151744 | 86.5% | no |
| ptolemy-tetrabiblos-grc | 0363.007 | 38009 | 37563 | 98.8% | yes |
| rhetoric-grc | 0086.038 | 43183 | 43103 | 99.8% | yes |
| shield-of-heracles-grc | 0020.003 | 3298 | 3256 | 98.7% | yes |
| sophistical-refutations-grc | 0086.040 | 14115 | 13978 | 99.0% | no |
| sophocles-ajax-grc | 0011.003 | 8225 | 8134 | 98.9% | yes |
| sophocles-antigone-grc | 0011.002 | 7659 | 7593 | 99.1% | yes |
| sophocles-electra-grc | 0011.005 | 9127 | 9051 | 99.2% | yes |
| sophocles-ichneutae-grc | 0011.008 | 2561 | 1967 | 76.8% | yes |
| sophocles-oedipus-at-colonus-grc | 0011.007 | 10946 | 10873 | 99.3% | yes |
| sophocles-oedipus-tyrannus-grc | 0011.004 | 9748 | 9681 | 99.3% | yes |
| sophocles-philoctetes-grc | 0011.006 | 9246 | 9198 | 99.5% | yes |
| sophocles-trachiniae-grc | 0011.001 | 7568 | 7499 | 99.1% | yes |
| theogony-grc | 0020.001 | 7040 | 6952 | 98.8% | yes |
| thucydides-history-grc | 0003.001 | 150157 | 149865 | 99.8% | yes |
| topics-grc | 0086.044 | 44116 | 43776 | 99.2% | no |
| virtues-and-vices-grc | 0086.045 | 1498 | 1494 | 99.7% | yes |
| works-and-days-grc | 0020.002 | 5856 | 5829 | 99.5% | yes |
| xenophon-agesilaus-grc | 0032.009 | 7385 | 7380 | 99.9% | yes |
| xenophon-anabasis-grc | 0032.006 | 57173 | 57036 | 99.8% | yes |
| xenophon-apology-grc | 0032.005 | 2000 | 2000 | 100.0% | yes |
| xenophon-cavalry-commander-grc | 0032.012 | 5780 | 5776 | 99.9% | yes |
| xenophon-constitution-of-the-lacedaemonians-grc | 0032.010 | 4926 | 4923 | 99.9% | yes |
| xenophon-cyropaedia-grc | 0032.007 | 79288 | 79240 | 99.9% | yes |
| xenophon-hellenica-grc | 0032.001 | 66512 | 66280 | 99.7% | yes |
| xenophon-hiero-grc | 0032.008 | 5969 | 5967 | 100.0% | yes |
| xenophon-memorabilia-grc | 0032.002 | 35824 | 35806 | 99.9% | yes |
| xenophon-oeconomicus-grc | 0032.003 | 17819 | 17818 | 100.0% | yes |
| xenophon-on-horsemanship-grc | 0032.013 | 6983 | 6980 | 100.0% | yes |
| xenophon-on-hunting-grc | 0032.014 | 9144 | 9130 | 99.8% | yes |
| xenophon-symposium-grc | 0032.004 | 9532 | 9522 | 99.9% | yes |
| xenophon-ways-and-means-grc | 0032.011 | 3855 | 3848 | 99.8% | yes |


## 10. Fix batch 1 (coordinator QA round, post-first-build)

The coordinator ran independent probes against the first build and found five classes of
problem; this section documents what changed for each, and re-prints the coordinator's own named
probe words against the rebuilt data. Coverage itself was already correct (confirmed
independently at 99.8% for Thucydides) and untouched by this round — only reading order, POS,
gloss quality, and duplicate lexemes changed.

**(a) Gloss quality.** `scripts/lexis/greek/lsj.mjs`'s `extractSenses()` gained three filters
beyond the cognate-note one from the original build: a closed blocklist of bare Latin
cross-reference words LSJ sometimes gives instead of an English gloss (`sum`, `esse`, `dico`...
— this is what was producing "sum" for εἰμί); a generic citation-fragment detector
(`isCitationLike`, rejects a `<tr>` that's mostly capitalised-abbreviation-with-dot tokens, e.g.
φημί's "Spir. Prooem., Eratosth.Prooem."); and a narrower rule for `<tr>` text immediately
followed by a `<bibl>` tag AND containing an internal capital letter, which catches
bibliographic titles that ended up inside a `<tr>` by a TEI-encoding slip (θνῄσκω's "Papers of
the Amer. School") without rejecting the extremely common, perfectly normal
"`<tr>`gloss`</tr>` `<bibl>`citation`</bibl>`" pattern most senses actually use (an unscoped
"reject anything before a `<bibl>`" version of this rule was tried first and wrongly demoted
~3,000 good LSJ glosses to the weaker inflection-line fallback — reverted for the narrower rule).
A new `scripts/lexis/greek/curated-glosses.mjs` hand-curates ~90 of the highest-frequency
function words (articles, demonstratives, personal/relative pronouns, conjunctions, particles,
prepositions, negatives, plus εἰμί/φημί) with the standard textbook gloss, checked before any
dictionary lookup at all; separately, articles/particles/prepositions/conjunctions/pronouns as a
POS class, plus λέγω/γίγνομαι/ἔχω by name, prefer kaikki's short gloss over LSJ's "first sense"
outright (kaikki's Wiktionary-style glosses are consistently cleaner for closed-class words,
where LSJ's first sense is often an etymological or citation aside). One case was investigated
and left unfixed: φαίνω's gloss is still "A ren." (a citation fragment from deep inside its
principal-parts apparatus, immediately followed by prose rather than a `<bibl>` so the new filter
doesn't catch it) instead of "bring to light" — the real gloss is the entry's *second* `<tr>`,
and no general pattern distinguishes this from a legitimate short gloss without new false
positives elsewhere; a one-off patch for this single word was rejected as unprincipled.

**(b) Reading order.** `buildReadingsForKey()`'s sort gained two extra tie-break stages after
confidence and local attestation count: corpus-wide Diorisis frequency of the exact (lemma,
feature-tags) pair (`corpusFreqFor`), then a linguistic prior (number sg>pl>du, case
nom>acc>gen>dat>voc, mood ind>other, person 3>1>2, and gender matching the lexeme's own LSJ-marked
gender when known). Corpus-wide frequency only overrides the prior when the gap is >2% relative
(`freqCmp`) — Diorisis reports the *same* total attestation count on every candidate of a
genuinely ambiguous form (ἦν's 1sg/3sg/3pl are ~22,417-22,419 corpus-wide, a 0.01% spread that is
aggregation noise, not a real signal), so without that threshold the prior never got a chance to
run and 1st person kept incorrectly outranking 3rd. A second, more serious bug was caught by this
same probe: the lexeme-merge step (d) was unconditionally re-sorting *every* form's readings with
a weaker fallback comparator that had no access to the original attestation counts (discarded
once collapsed to `[lexemeId,morph,conf]` tuples) — so a completely unrelated, un-merged word
(δὲ) had its correct top reading (the particle, 230,381 corpus occurrences) knocked out of first
place by a 2-occurrence Diorisis mis-tag (δέομαι) purely because the fallback comparator's prior
score happened to rank a verb's person/mood tags above `part indecl`. Fixed by only re-sorting a
form when one of *its own* readings was actually affected by a merge; everything else keeps its
original, fully-tie-broken order.

**(c) POS.** `resolvePos()` (new) checks a Diorisis (lemma, pos) pair's morph tags against the
lemma's own dictionary POS (kaikki's pos field first, LSJ's `<pos>`/`<tns>`/`<gen>` markers only
as a weaker fallback) and overrides Diorisis's own POS tag when they disagree and Diorisis's tags
for that specific reading aren't verb-shaped (no tense/mood/voice marker at all) — this is what
πόλις needed: Diorisis tags it "adjective" in *every* occurrence in the Republic (confirmed
directly in the raw XML, not a parsing artifact), while both LSJ and kaikki agree it's a noun.
Two false positives surfaced and were fixed in turn: LSJ's `classify()` was originally unscoped
over an entry's *entire* body, so ὁ (the article) picked up a `<pos>Subst.</pos>` tag that
belongs to an unrelated aside 23,000 characters into its 170KB entry — scoped to the headword
line only (before the first `<sense>`, capped at 600 chars) and kaikki's agreement with Diorisis
is now checked *before* consulting LSJ at all, so ὁ never reaches the weak signal in the first
place. kaikki's own `'other'` POS bucket (this build's catch-all for a Wiktionary POS string
`build-kaikki-index.mjs`'s map doesn't recognise) was being treated as a confident classification
and wrongly overrode Diorisis's correct "adjective" tag for οἷος (556 corpus attestations) with
kaikki's non-signal "other" — `'other'` is now filtered out of the dictionary-POS candidates
entirely. εἴκοσι ("twenty", tagged "verb" by Diorisis despite carrying no tense/mood/voice tag at
all) and νηλέϊ (the adjective νηλής's dative, tagged "adverb") are both fixed the same way, via
the same general rule, not special-cased.

**(d) Duplicate lemma spellings.** A new merge pass groups lexemes by (`foldKey(lemma)`, pos) and
repoints every work's readings to one canonical spelling. Canonical choice is a strict hierarchy,
NOT frequency-weighted: (1) has an LSJ entry at all beats not having one — θνήσκω has no LSJ
entry, θνῄσκω does, so θνῄσκω wins outright regardless of which spelling is more common in this
corpus; (2) `type="main"` beats a secondary entry; (3) actual usage frequency in this build's own
output breaks a tie only when both/neither have an entry. That ordering matters: an earlier
version scored frequency and dictionary-entry-presence at comparable weight and merged ὁ ("the",
the single most common word in the language) into ὀ- (a rare prefix headword that ALSO happens to
have its own `type="main"` LSJ entry — both fold to bare "ο" and share a POS, but are not the
same word at all); frequency alone would have correctly separated that pair, but only once
entry-presence is checked first for pairs like θνήσκω/θνῄσκω where one side has no dictionary
entry whatsoever. A minimum fold-key length of 3 is also required before two lexemes are even
considered for merging, since short fold-keys (1-2 letters) are exactly where unrelated
words/prefixes collide by coincidence. Result: 1,713 lexemes merged across 1,618 groups (68,759
lexemes remain, down from 70,472 before merging).

**(e) "(no gloss available)" fallback chain.** A sixth tier was inserted before the placeholder:
the LSJ headword's own inflection/principal-parts line (already extracted for the `inflection`
field) is now used as a last-resort crude gloss when nothing else produced one — cut to 100 chars.
This dropped the true placeholder count from 4,258 to **2,836** (of 68,759 total referenced
lexemes, 4.1%; the other 3,385 name-fallbacks and 1,200 inflection-line fallbacks are separately
counted, not included in this figure). Final gloss-source breakdown: 90 curated, 32,818 from LSJ,
28,430 from kaikki, 3,385 "a proper name", 1,200 from the inflection line, 2,836 still with no
usable text anywhere.

**Coordinator's probe words, rebuilt** (`node scripts/lexis/greek/probe-fixbatch1.mjs`; all in
`plato-republic-grc` unless noted):

```
λόγος -> λόγος [noun] "noun nom sg m" (conf 1) — computation, reckoning (lsj)
ἦν -> εἰμί [verb] "verb impf ind act 3 sg" (conf 1) — to be (curated)        [was 1sg first]
τῶν -> ὁ [art] "art gen pl n" (conf 1) — the (curated)                       [was noun/"the following"]
ἀνθρώπων -> ἄνθρωπος [noun] "noun gen pl m" (conf 1) — man (lsj)
εἶπεν -> εἶπον [verb] "verb aor ind act 3 sg" (conf 1) — said (lsj)
πόλις -> πόλις [noun] "noun nom sg f" (conf 1) — city (lsj)                  [was adj]
πόλεως -> πόλις [noun] "noun gen sg f" (conf 1) — city (lsj)                 [was adj]
ἔφη -> φημί [verb] "verb impf ind act 3 sg" (conf 1) — to say, assert (curated) [was citation frag.]
γίγνεται -> γίγνομαι [verb] "verb pres ind mp 3 sg" (conf 1) — to come into being (wiktionary)
εἶναι -> εἰμί [verb] "verb pres inf act" (conf 1) — to be (curated)          [was "sum"]
δικαιοσύνης -> δικαιοσύνη [noun] "noun gen sg f" (conf 1) — righteousness, justice (lsj)
ψυχῆς -> ψυχή [noun] "noun gen sg f" (conf 1) — life (lsj)
κάρα (in aeschylus-agamemnon-grc) -> κάρα [noun] "noun acc du f" (conf 1) — head (lsj)
  [Diorisis's own local attestation count genuinely ranks acc.du.f highest (4 vs 2) for this
  irregular, near-indeclinable noun in this specific play — not a bug, see §10(b).]
θανεῖν (in iliad-grc) -> θνῄσκω [verb] "verb aor inf act" (conf 1) — die (lsj) [was θνήσκω/"Papers of the Amer. School"]
ὦ -> ὦ [interj] "interj indecl" (conf 1) — O! oh! (lsj)                      [was noun]
σφαῖρα (in euclid-elements) -> σφαῖρα [noun] "noun nom sg f" (conf 1) — ball (lsj)
κύλινδρος (in euclid-elements) -> κύλινδρος [noun] "noun nom sg m" (conf 1) — rolling stone, tumbler (lsj)
κέντρου (in euclid-elements) -> κέντρον [noun] "noun gen sg n" (conf 1) — any sharp point (lsj)
εἴκοσι -> εἴκοσι [num] "num indecl" (conf 1) — twenty (lsj)                  [was verb]
```

Re-verification: `node scripts/lexis/greek/check-greek.mjs` → all pass
(234 bundles, 925,181 form keys, 3,474,174 readings, 68,759 lex/grc entries). A broader
regression scan (`scripts/lexis/greek/scan-regressions.mjs`, 313 random recognised tokens across
15 random works) found 2 flags, both a correct `pos:'other'` classification for a single capital
letter used as a diagram point-label in two Archimedes works (kaikki's own "character" pos,
legitimately not a real part of speech) — no further problems found.

## 11. Fix batch 2 (small)

Three more coordinator-found issues, all fixed:

- **κατέβην's reading order.** Diorisis's `(epic doric aeolic)`-qualified "aor ind act 3 pl"
  analysis was ranking above the plain "aor ind act 1 sg" one. Root cause: Diorisis gives both
  candidates the identical attestation count (it can't tell which occurrence is which, so it just
  repeats the token's total on every candidate — 1 locally in the Republic, 16 corpus-wide), and
  the old linguistic prior scored a (person=3,number=pl) vs (person=1,number=sg) swap as an exact
  tie by construction (both axes used the same 1-2-3 weight scale). Fixed two ways, both general
  rather than special-cased to this one word: (1) `morph-map.mjs` now exposes
  `hasDialectQualifier()`, threaded through `diorisis.mjs`/`build-diorisis-corpus.mjs`'s compact
  rows (a 5th element) as a ranking signal only, never a plan-vocabulary tag; a dialect-marked
  reading is now demoted below an otherwise-equal unmarked one, as the dominant term within the
  prior tier (still evaluated only after confidence, local count, and corpus-wide frequency all
  tie). (2) the prior's per-axis weights (case/number/person/mood/gender) were changed from a
  shared 1-2-3 scale to distinct multipliers, so no ordinal-rank swap between two axes can produce
  an accidental exact tie again; `κατέβην` -> **`καταβαίνω` "verb aor ind act 1 sg" (conf 1)**,
  "verb aor ind act 3 pl" now ranks second.
- **Beta-Code leaking into rendered LSJ articles.** καταβαίνω's own article showed "(v.l.
  -bei/omen)" — a variant-reading `<ref lang="greek">` whose attribute order
  (`targOrder="U" lang="greek" TEIform="ref"`) didn't match the fixed-order regex `renderTei()`
  used to detect Greek-language spans, so it fell through unconverted. Fixed generally: the
  `lang="greek"` check for `<foreign>`/`<quote>`/`<ref>` (and, found in the same pass, `<etym>`
  and `<itype>`, which have the identical bug — βυθάω's etymology showed "(buqo/s)" instead of
  "(βυθός)", πλακώδης' comparative showed "-wde/steros" instead of "-ώδέστερος") is now done on
  the captured attribute string itself, not the tag's literal attribute order. A 1,500-random-
  headword scan after the fix found zero remaining Beta-Code leaks (16 initial regex hits were
  all false positives — legitimate century date ranges like "iii/iv A.D.").
- **Lex sharding.** `build-greek.mjs` now calls the shared `scripts/lexis/shared/shard-writer.mjs`
  (`writeLexShards`) instead of this package's own ad-hoc splitter, so grc's shards use the same
  longest-prefix-with-real-characters naming as la/it. 1,296 shard files (was 455 under the old
  ad-hoc splitter); manifest regenerated via `scripts/lexis/build-manifest.mjs`.

Re-verification: `node scripts/lexis/greek/check-greek.mjs` -> all pass (234 bundles, 925,181
form keys, 3,474,195 readings, 68,761 lex/grc entries). `probe-fixbatch1.mjs` and
`scan-regressions.mjs` both re-run clean (same 2 legitimate flags as before, nothing new).
