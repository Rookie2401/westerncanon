# English Euclid *Elements* (Heath, 1908) validation report

Generated: 2026-09-18T00:22:17.475Z

**Result: PASS** - 0 error(s), 1 warning(s).

## Counts

- Books: 13
- leaf divisions (definitions/postulates/common notions/propositions): 607
- passages: 6106
- total passage chars: 840559
- leaves carrying a verbatim printed sourceHeading (proposition leaves only): 465
- anomalies.json entries: 659

## Verbatim spot-check

- OK - Book I, Definition 1 reads exactly the expected text
  - got: `A point is that which has no part.`
- OK - Book XIII's final passage ends with the expected text
  - got: `FBC; therefore the whole angle ABC of the pentagon consists of one right angle and a fifth. Q. E. D.`

## Errors

_none_

## Warnings

- **[known-empty-leaf]** book-6-def-5 carries its documented honest placeholder (Heath omits this definition outright; the only genuinely empty <p></p> in the source) rather than a translated definition
