# On the Motion of Animals (English, Farquharson 1912) validation report

Generated: 2026-09-23T05:17:55.272Z

**Result: PASS** — 0 error(s), 0 warning(s).

## Counts

- top-level divisions: 11
- chapters: 11
- total passage chars: 31358
- 11 chapters (numbers 1-11)

## Verbatim spot-check

- OK — first chapter incipit
  - got: `ELSEWHERE we have investigated in detail the movement of animals after their various kinds`
- OK — last chapter explicit
  - got: `of sleep, of memory, and of movement in general; it remains to speak of animal generation.`

## Anomalies (preserved, not corrected)

- **de-motu-animalium-en / page** — 4 page-furniture line(s) skipped (interwiki/category links, "BOOK N" running titles, trailing External-links/Notes sections): THE END | {{rule}} | [[el:Περί ζώων κινήσεως]] | {{translation license|original={{PD-old}}|translation={{PD/US|1942}}}}.
- **de-motu-animalium-en / page** — 49 translator/editorial footnote marker(s) (<ref>...</ref>) removed from the reading text; the footnotes are apparatus, not Aristotle's words, and their content is not preserved anywhere in this build.
- **de-motu-animalium-en / source technique** — Every page of this work is ORDINARY WIKITEXT on English Wikisource (action=parse&prop=wikitext returns the real prose), not a djvu page-scan transclusion like data/metaphysics-en or data/categoriae-en. The translation is the same public-domain Oxford text, but the digitisation is a plaintext one: it prints no page-scan/proofreading markup, and marks its chapters with wiki-heading-N marker(s). Disclosed rather than described as a page-scan provenance it does not have.
- **de-motu-animalium-en / footnotes stripped** — 49 inline <ref>...</ref> footnote marker(s) were removed from the reading text across the whole work; the footnotes are translator/editorial apparatus, not Aristotle's text, and their content is not preserved anywhere in this build.
- **de-motu-animalium-en / CONTENT-VERIFIED before import** — This batch's brief flagged De motu animalium as "blue-linked, NOT yet content-verified" — the existence of a link was not to be trusted as evidence of transcribed text. It was verified before this importer was written: "On the Motion of Animals" redirects to "On the Movement of Animals", and that page carries 38 KB of real prose in 11 numbered chapters with 49 footnotes, no red links and no stub markers. Genuine content; nothing was skipped and nothing was fabricated.
- **de-motu-animalium-en / title redirect** — The title given in this import's brief, "On the Motion of Animals", is a REDIRECT on English Wikisource; the actual page is "On the Movement of Animals". The redirect was resolved through the API and followed, rather than the title being assumed correct or the work being reported missing.
- **de-motu-animalium-en / chapter marker shape** — This page marks chapters with "==N==" headings whose text is nothing but the chapter number — a shape no other page in this batch uses (its batch-mates use "==Part N==", a bare "Part N" line, or a bare number line). Verified for this work specifically rather than assumed from any sibling.
- **de-motu-animalium-en / Bekker markers present (unlike its batch-mates)** — This is the ONLY plain-wikitext work in this batch whose source prints Bekker page markers: it carries them as {{verse|verse=698a}} templates. They are captured per chapter, in document order, and become a real Division.ref (a single page token, or first–last as a range when a chapter spans pages); the markers themselves are removed from the reading text, where they are marginalia rather than words. Passage.ref remains null, as no marker is printed at every paragraph break.
- **de-motu-animalium-en / completeness** — COMPLETE: all 11 chapters of the standard division are present and untruncated.
- **de-motu-animalium-en / reference scheme** — Division.ref carries the Bekker page reference reconstructed from the source's own {{verse|verse=NNNa}} markers, in document order (a single page token when the chapter falls on one page, otherwise first–last). Passage.ref is null throughout: the source prints no marker at every paragraph break, so a per-paragraph reference would have to be invented.
- **de-motu-animalium-en / relation to the Greek sibling** — This English edition was parsed entirely independently of any Greek edition of the same treatise in this library; the two are not forced to agree on chapter boundaries, and no division in de-motu-animalium-en was adjusted to match a Greek text.

## Errors

_none_

## Warnings

_none_
