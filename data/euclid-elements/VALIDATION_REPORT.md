# Euclid *Elements* validation report

Generated: 2026-09-07T02:44:15.145Z

**Result: PASS** - 0 error(s), 2 warning(s).

## Counts

- Books: 13
- leaf divisions (definitions/postulates/common notions/propositions): 611
- passages: 2378
- total passage chars: 745000
- Passage.figure objects: 493
- anomalies.json entries: 1039 (figure markers: 498, <del> exclusions: 507, <add> insertions: 4)
- leaf divisions carrying Heiberg's bracketed-interpolation text (documented): book-1-cn-4, book-1-cn-5, book-1-cn-6, book-6-def-2, book-6-def-5

## Verbatim spot-check

- OK - Book I, Definition 1 reads exactly the expected text
  - got: `σημεῖόν ἐστιν, οὗ μέρος οὐθέν.`
- OK - Book XIII's final proposition ends with the expected text
  - got: `α ἡ ὑπὸ ΑΒΓ τοῦ πενταγώνου γωνία μιᾶς ἐστιν ὀρθῆς καὶ πέμπτου· ὅπερ ἔδει δεῖξαι.`

## Errors

_none_

## Warnings

- **[bracketed-interpolation-leaves]** 5 leaf division(s) carry Heiberg's own bracketed (probable-interpolation) text rather than his critically-accepted wording, as documented: book-1-cn-4, book-1-cn-5, book-1-cn-6, book-6-def-2, book-6-def-5
- **[no-combining-marks]** 1 documented standalone combining diacritic preserved verbatim (Book XI, Proposition 31, "Σο͂") - not corrected, per this app's source-fidelity policy
