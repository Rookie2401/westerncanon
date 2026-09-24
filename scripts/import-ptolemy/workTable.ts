/**
 * PTOLEMY - research summary and per-work import table.
 *
 * ============================================================================
 * RESEARCH (fetched directly from the source catalogs/repos - see citations
 * inline; nothing here is guessed at)
 * ============================================================================
 *
 * Ptolemy is tlg0363 (confirmed: OpenGreekAndLatin/First1KGreek and
 * PerseusDL/canonical-greekLit `data/tlg0363/__cts__.xml` both give
 * `<ti:groupname xml:lang="lat">Claudius Ptolemaeus</ti:groupname>`).
 *
 * First1KGreek's `data/tlg0363/` holds exactly three works: tlg001, tlg007,
 * tlg011 (`api.github.com/repos/OpenGreekAndLatin/First1KGreek/contents/
 * data/tlg0363`, confirmed via `curl` against the live GitHub API, not
 * assumed). PerseusDL/canonical-greekLit's `data/tlg0363/` holds only
 * tlg007, with a second, different edition of the same work.
 *
 * 1. ALMAGEST (Syntaxis mathematica) - Greek: IMPORTED as ptolemy-almagest-grc.
 *    tlg0363.tlg001.1st1K-grc1.xml, First1KGreek. Its own `__cts__.xml`:
 *    "Claudius Ptolemaeus. Claudii Ptolemaei Opera quae exstant omnia,
 *    Volume 1, Part 1-2. Heiberg, J.L., editor. Leipzig: Teubner,
 *    1898-1903." - exactly the Heiberg 1898-1903 edition the brief asked to
 *    check for. This is a REAL, keyed transcription (not OCR): 2.9 MB, 13
 *    `subtype="book"` divisions (matches the Almagest's 13 books exactly)
 *    each containing a `subtype="section"` leaf per chapter (158 total,
 *    including one `n="toc"` table-of-contents section per book, itself
 *    genuine printed content - Heiberg's edition opens every book with its
 *    own chapter-title list). Nothing indicates this transcription is
 *    partial; all 13 books are present with the expected chapter range per
 *    book. Heiberg's apparatus (3236 `<note type="footnote">`, 1 misspelled
 *    `type="foornote">`, 628 `<del>`, 1992 `<gap reason="omitted"/>`) and the
 *    Book-7/8 star-catalogue's 33 `<note type="marginal">` constellation
 *    running-heads are handled per teiWalker.ts's module doc. Those 1992
 *    gaps are themselves a MATERIAL INCOMPLETENESS of this transcription,
 *    not mere apparatus - they are the OMITTED NUMERIC ENTRIES (longitude/
 *    latitude/magnitude) of Ptolemy's Book VII-VIII star catalogue; the
 *    descriptive text of each row survives, the numbers do not - disclosed
 *    in its own about.json section ("Material incompleteness"), per-book
 *    counts logged in anomalies.json (2026-09-23 coordinator follow-up).
 *    295 `<figure>` open tags occur (2 of them NESTED one directly inside
 *    another - see teiWalker.ts - so 293 chapter-level Passage.figure
 *    occurrences result); 6 carry a `<figDesc>`, 5 of those with real
 *    transcribed table text (Book I's Table of Chords, split across several
 *    page images - see tableOrFigure.ts) which is kept as ordinary
 *    Passage.TEXT (never a note); the remaining 288 are bare `<graphic/>`
 *    pointers to a page-scan URL with no transcribed content - contribute
 *    NOTHING to Passage.text and are disclosed solely via a combined,
 *    per-chapter Passage.figure.note (diagram count + every one of that
 *    chapter's scan-page URLs, table-bearing figures' URLs included), never
 *    as fabricated text or image (see about.json's "Diagrams and tables";
 *    2026-09-23 coordinator follow-up moved this out of Passage.text, where
 *    an earlier version of this importer had wrongly left it). Licence:
 *    CC BY-SA 4.0 (First1KGreek's own `<availability><licence target=
 *    "https://creativecommons.org/licenses/by-sa/4.0/">`).
 *
 * 2. TETRABIBLOS (Apotelesmatica) - Greek: IMPORTED as ptolemy-tetrabiblos-grc.
 *    Two witnesses exist; BOTH were fetched and structurally compared before
 *    choosing:
 *      - First1KGreek tlg0363.tlg007.1st1K-grc1.xml: "Claudii Ptolemaei
 *        opera quae exstant omnia, Volume 3.1. Boll, Franz, and Boer,
 *        Emilie, editors. Leipzig: Teubner, 1954." - 4 books, 63 chapters,
 *        but with an EXTRA `subtype="section"` level nested inside every
 *        chapter (611 of them) - i.e. this source itself paragraph-numbers
 *        below the chapter.
 *      - PerseusDL/canonical-greekLit tlg0363.tlg007.perseus-grc2.xml:
 *        "Ptolemy. Tetrabiblos. Robbins, Frank Egleston, editor. Cambridge,
 *        MA: Harvard University Press; London: William Heinemann Ltd., 1964
 *        (printing)." - the Loeb Classical Library Greek text (the same
 *        Robbins edition the brief itself named), 4 books, 63 chapters,
 *        book -> chapter directly (no extra level). Chosen as the primary
 *        text: identical book/chapter coverage to the First1KGreek witness,
 *        a simpler (and hence more directly citable) division scheme, and
 *        it is the specific edition named in this task's own brief. Its
 *        Book 4 prints TWO alternative endings for the final chapter -
 *        `n="10a"` "Conclusion according to Parisinus 2425" and `n="10b"`
 *        "Conclusion according to MADProc.Cam." - both kept as their own
 *        chapters (disclosed in about.json, not merged or chosen between).
 *        Licence: CC BY-SA 4.0 (Perseus's own standard licence for
 *        canonical-greekLit; same wording used throughout this app already).
 *
 * 3. TETRABIBLOS - English: IMPORTED as ptolemy-tetrabiblos-en. J. M.
 *    Ashmand's 1822 translation, via sacred-texts.com (see fetchAshmand.ts).
 *    Verified COMPLETE: Title Page, Advertisement, Preface, then all 4 Books
 *    (I: 27 chapters, II: 14, III: 19, IV: 10 - 70 chapters total, per the
 *    site's own table of contents, fetched directly, not assumed), matching
 *    Ashmand's well-documented print structure. Ashmand's own chapter
 *    division is a DIFFERENT (older, more finely subdivided) scheme from
 *    the Greek editions above and does NOT correspond 1:1 to them chapter-
 *    for-chapter - disclosed in about.json, not reconciled or renumbered.
 *    sacred-texts.com also carries a 4-item appendix (two Almagest extracts,
 *    the pseudo-Ptolemaic "Centiloquy", and a "Zodiacal Planisphere") and an
 *    errata page appended by the site/Ashmand's editors; NONE of these are
 *    part of the Tetrabiblos itself and none are imported here (see
 *    about.json). sacred-texts.com's own text is itself in the public
 *    domain (a 1822 translation; the site states no additional copyright
 *    claim over the transcription itself, consistent with how this app
 *    already treats other sacred-texts.com/Wikisource PD translations).
 *
 * 4. GEOGRAPHIA - Greek: NOT IMPORTED. Neither First1KGreek nor
 *    PerseusDL/canonical-greekLit has ANY `tlg0363` work whose title is
 *    Geographia (confirmed: the only entries under `data/tlg0363/` in
 *    either repo are tlg001/tlg007/tlg011 - no tlg002, no tlg014, nothing
 *    else). The Perseus CATALOG (catalog.perseus.org, a bibliographic
 *    index separate from the canonical-greekLit git repos) does list a
 *    "Geographia (Book IV-VIII)" record, urn:cts:greekLit:tlg0363.tlg014,
 *    Nobbe's 1843/1845 edition - but its own "Get to the Text" links point
 *    only to HathiTrust/Google Books page-image scans ("digitized other
 *    analog" per the catalog's own status field), not a machine-readable
 *    transcription, and even that print record covers only Books IV-VIII
 *    (Geographia has 8 books - this would be incomplete even if it were
 *    digitised). Per this task's explicit policy, archive.org/HathiTrust
 *    OCR of a mathematically-dense Greek geographical text (full of
 *    coordinate tables) is NOT an acceptable substitute for a real
 *    transcription. No transcription exists anywhere else that was found
 *    either (Wikisource el.wikisource.org has no Ptolemy Geographia page).
 *    DECISION: do not import; no faithful digital transcription exists.
 *
 * 5. HARMONICS (Harmonica) - Greek: NOT IMPORTED. First1KGreek's tlg0363.
 *    tlg011 is titled "Musica" in its own `__cts__.xml`
 *    ("Claudius Ptolemaeus. Musici Scriptores Graeci. Jan, Karl von,
 *    editor. Leipzig: Teubner, 1895.") and so looked like a match - but
 *    direct inspection of the file itself (540 lines, 40 KB - implausibly
 *    short for a 3-book treatise) shows it is NOT the Harmonics: its own
 *    `<pb n="…"/>` markers run only 411 through 423 (13 pages) of von Jan's
 *    much larger composite volume, its body mixes Latin editorial prose
 *    directly into the running text (not confined to `<note>` apparatus -
 *    e.g. "ne librarii qui transscriberent mutarent rerum ordinem." sits in
 *    an ordinary `<p>`), and it is structured as 27 flat, unlabelled
 *    `subtype="paragraph"` divisions with NO book grouping at all - all of
 *    which is consistent with a short EXCERPT/testimonia fragment (from von
 *    Jan's back-matter apparatus on later citations of Ptolemy), not a
 *    transcription of the actual 3-book, ~90-chapter Harmonics. No other
 *    digital transcription of the real Harmonics was found (Perseus has no
 *    tlg0363 entry for it at all). DECISION: do not import; what exists
 *    under this title is not a complete (or even genuine) transcription of
 *    the work.
 *
 * 6. OPTICS (Latin, via the Arabic, ed. Lejeune 1956): NOT IMPORTED. The
 *    Greek original is lost entirely; the standard edition is Albert
 *    Lejeune's 1956 Latin text (from Eugene of Palermo's c.1154 Latin
 *    translation of a lost Arabic version). No digital transcription of
 *    Lejeune's edition was found anywhere (First1KGreek/Perseus carry no
 *    tlg0363 Optics entry of any kind - unsurprising, since it is a Latin,
 *    not Greek, tradition and outside those two Greek-focused projects'
 *    scope - and no other public-domain transcription surfaced in general
 *    search). DECISION: do not import.
 *
 * 7. PLANETARY HYPOTHESES: NOT IMPORTED. The standard edition is Heiberg's
 *    Opera astronomica minora (1907, part of the same Teubner Opera quae
 *    exstant omnia series as the Almagest); only Book 1 survives in Greek,
 *    the rest only via a medieval Arabic translation (Nix's German
 *    rendering of that Arabic is what Heiberg prints). No digital
 *    transcription of any part of this was found - only page-image scans
 *    of Heiberg's printed volume on the Internet Archive, which this task's
 *    policy against OCR of mathematically-dense Greek/Arabic-derived text
 *    already rules out even if a scan-to-OCR pass existed. DECISION: do not
 *    import.
 *
 * 8. PHASEIS (Phases of the Fixed Stars): NOT IMPORTED. Also edited in
 *    Heiberg's Opera astronomica minora (1907). Same situation as Planetary
 *    Hypotheses: no digital transcription found anywhere, only page-image
 *    scans of the printed volume. DECISION: do not import.
 *
 * ============================================================================
 * Mathematical tables (task-level disclosure; corrected 2026-09-23 - an
 * earlier draft of this note wrongly claimed every OTHER numeric table
 * survives as ordinary prose; the coordinator's review caught that this is
 * only sometimes true): the Almagest's Table of Chords (Book I) is the one
 * table this transcription carries AS A TABLE - via `<figDesc><list
 * rend="table">…</list></figDesc>` (see tableOrFigure.ts) - kept, verbatim,
 * as row-serialised text on that chapter's own Passage.TEXT (an ordinary
 * paragraph, not a note - see index.ts), not discarded and not rendered as
 * an image. The Book VII-VIII star catalogue's descriptive columns (each
 * star's identification within its constellation) likewise survive as
 * ordinary running `<p>` prose - but its NUMERIC columns (longitude,
 * latitude, magnitude) do NOT: they are the transcription's 1992 `<gap
 * reason="omitted"/>` markers (see above and about.json's "Material
 * incompleteness" section) - a real, disclosed gap in this specific
 * source, not a table this importer chose to handle differently.
 */

export type GrcSource = 'first1k-almagest' | 'perseus-tetrabiblos-grc';

export interface GrcWorkEntry {
  workId: string;
  source: GrcSource;
  file: string;
  titleConventional: string;
  titleGreek: string;
  editor: string;
  edition: string;
  ctsUrn: string;
  /** the leaf (chapter-equivalent) div's own subtype name in THIS source */
  chapterSubtype: string;
  expectedBooks: number;
  expectedChapters: number;
  /** label used to build Passage.figure.source citations, e.g. "Heiberg, Syntaxis mathematica" */
  figureCiteLabel: string;
}

export const GRC_WORKS: GrcWorkEntry[] = [
  {
    workId: 'ptolemy-almagest-grc',
    source: 'first1k-almagest',
    file: 'tlg0363.tlg001.1st1K-grc1.xml',
    titleConventional: 'Almagest',
    titleGreek: 'Μαθηματικὴ Σύνταξις',
    editor: 'J. L. Heiberg',
    edition: 'Claudii Ptolemaei Opera quae exstant omnia, Volume 1, Parts 1-2 (Heiberg, ed., Teubner, 1898-1903)',
    ctsUrn: 'urn:cts:greekLit:tlg0363.tlg001.1st1K-grc1',
    chapterSubtype: 'section',
    expectedBooks: 13,
    expectedChapters: 158,
    figureCiteLabel: 'Heiberg, Syntaxis mathematica',
  },
  {
    workId: 'ptolemy-tetrabiblos-grc',
    source: 'perseus-tetrabiblos-grc',
    file: 'tlg0363.tlg007.perseus-grc2.xml',
    titleConventional: 'Tetrabiblos',
    titleGreek: 'Τετράβιβλος',
    editor: 'Frank Egleston Robbins',
    edition: 'Ptolemy: Tetrabiblos (Robbins, ed. and tr., Loeb Classical Library, Harvard University Press / William Heinemann, 1964 printing)',
    ctsUrn: 'urn:cts:greekLit:tlg0363.tlg007.perseus-grc2',
    chapterSubtype: 'chapter',
    expectedBooks: 4,
    expectedChapters: 63,
    figureCiteLabel: 'Robbins, Tetrabiblos',
  },
];

export const NOT_IMPORTED: Array<{ work: string; reason: string }> = [
  {
    work: 'Geographia (Greek)',
    reason: 'No machine-readable transcription exists in First1KGreek or PerseusDL/canonical-greekLit; the Perseus Catalog bibliographic record (tlg0363.tlg014, Nobbe 1843-45) links only to HathiTrust/Google Books page-image scans ("digitized other analog"), and even that print record covers only Books IV-VIII of 8. OCR of a coordinate-table-heavy mathematical Greek text is not acceptable per policy.',
  },
  {
    work: 'Harmonics (Harmonica)',
    reason: 'First1KGreek\'s tlg0363.tlg011 ("Musica") is not the work: direct inspection shows a 13-page (pb 411-423), 27-paragraph excerpt/testimonia fragment from the back matter of von Jan\'s 1895 composite volume, with Latin editorial prose embedded directly in the running text and no book/chapter structure at all - not a transcription of the actual 3-book Harmonics. No other transcription was found.',
  },
  {
    work: 'Optics (Latin, ed. Lejeune 1956)',
    reason: 'The Greek original is lost; Lejeune\'s 1956 Latin edition (from a 12th-century Latin translation of a lost Arabic version) has no known digital transcription anywhere.',
  },
  {
    work: 'Planetary Hypotheses',
    reason: 'Edited in Heiberg\'s Opera astronomica minora (1907); no digital transcription found, only page-image scans of the printed volume on the Internet Archive.',
  },
  {
    work: 'Phaseis (Phases of the Fixed Stars)',
    reason: 'Edited in Heiberg\'s Opera astronomica minora (1907); no digital transcription found, only page-image scans of the printed volume on the Internet Archive.',
  },
];
