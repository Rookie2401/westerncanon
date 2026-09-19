# Posterior Analytics (Greek) validation report

Generated: 2026-09-19T20:33:08.391Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- books: 2
- chapters: 53
- passages: 53
- total passage chars: 124927
- Book 1: 34 chapters (traditional ~34)
- Book 2: 19 chapters (traditional ~19)

## Verbatim spot-check

- OK — book-1 ch-1 incipit
  - got: `Πᾶσα διδασκαλία καὶ πᾶσα μάθησις διανοητικὴ ἐκ προϋπαρχούσης γίνεται γνώσεως. φανερὸν δὲ τ`
- OK — final chapter explicit
  - got: `ἐπιστήμης ἀρχή. καὶ ἡ μὲν ἀρχὴ τῆς ἀρχῆς εἴη ἄν, ἡ δὲ πᾶσα ὁμοίως ἔχει πρὸς τὸ πᾶν πρᾶγμα.`

## Anomalies (preserved, not corrected)

- **posterior-analytics-grc / book-1-ch-5 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([ἢ τὰ καθ' ἕκαστα]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-11 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([γὰρ]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-12 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([ὥσπερ τὸ ἄρρυθμον]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-13 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([τὸ μὴ στίλβειν]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-17 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([ἢ μὴ ὑπάρχουσιν], [φανερὸν οὖν ὅτι μὴ ὄντος τοῦ μέσου ὑπὸ τὸ Α καὶ ἀμφοτέρας ἐγχωρεῖ ψευδεῖς εἶναι καὶ ὁποτέραν ἔτυχεν.]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-22 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([ἐν]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-23 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([ἢ μὴ παντί]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-33 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([ἔχει]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-1-ch-34 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([ὁ]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-2-ch-4 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([τὸ Β]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-2-ch-5 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([τοῦτο δ' ἀναγκαῖον,]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-2-ch-10 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([τί ἐστι]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / book-2-ch-17 / passage** — contains editorial square-bracket mark(s) already present in the Wikisource transcription ([τὸ Α]); kept verbatim, not resolved or stripped — apparent text-critical annotation, not wiki markup.
- **posterior-analytics-grc / refs** — Chapter Bekker refs are reconstructed from this source's own inline {{χ|...}} page/column markers (no line numbers are marked in this source, unlike the English Wikisource HTML source used for categoriae-en/de-interpretatione-en). A chapter with no marker of its own carries the position in effect from the previous chapter (continuous Bekker numbering); a chapter that crosses a page/column boundary gets a span ("71a–71b"). Book 2 Chapter 1 illustrates this: it carries no marker of its own, so its ref ("89b") is carried over from the end of Book 1 Chapter 34 — the two Wikisource pages are numbered continuously in the real Bekker pagination, and the importer seeds Book 2's reconstruction with Book 1's final position rather than restarting at null. Passage.ref is always null (no finer milestone than the chapter-level span is derivable from this source).
- **posterior-analytics-grc / edition** — Greek Wikisource does not name a source edition for the "Αναλυτικών υστέρων" pages (contrast the companion categoriae-grc/de-interpretatione-grc corpora, explicitly First1KGreek/Bekker 1837). Given the real work's Bekker range begins at 71a and the transcription uses {{χ|...}}-style Bekker-page templates throughout, the text is presumably Bekker-based, but no specific edition or editor is asserted here — a genuine provenance gap, disclosed rather than guessed at. See about.json.
- **posterior-analytics-grc / square-bracket marks** — 14 editorial square-bracket mark(s) across 13 passage(s) are printed in the Wikisource transcription itself (e.g. "[ἢ τὰ καθ' ἕκαστα]", "[γὰρ]") — apparent text-critical annotation (a word or clause bracketed by a prior editor), not MediaWiki markup. Kept 100% verbatim in every case; never stripped, resolved, or silently normalised. Each occurrence is also flagged per-passage via Passage.anomaly.

## Errors

_none_

## Warnings

_none_
