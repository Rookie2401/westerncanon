/**
 * The 44-work slug/title table for this batch, in the exact document order
 * produced by source.ts's loadSource() (Sonnets, then the 38 plays in the
 * PG file's own Contents order, then the 5 narrative/shorter poems). Each
 * entry's `sourceIndex` is that position, so `WORKS[k]` always describes
 * `loadSource().works[k]`; this file supplies only the app-facing slug and a
 * clean display title (the source's own exact heading text, kept verbatim,
 * lives in WorkBound.sourceTitle and is what about.json quotes).
 */

export interface WorkMeta {
  slug: string;
  /** clean display title for work.json/about.json - NOT necessarily the
   *  source's exact heading casing/wording (that is sourceTitle from
   *  source.ts); used for about.json's "title" and the UI. */
  title: string;
}

export const WORKS: WorkMeta[] = [
  { slug: 'sonnets', title: 'The Sonnets' },
  { slug: 'alls-well-that-ends-well', title: "All's Well That Ends Well" },
  { slug: 'antony-and-cleopatra', title: 'Antony and Cleopatra' },
  { slug: 'as-you-like-it', title: 'As You Like It' },
  { slug: 'the-comedy-of-errors', title: 'The Comedy of Errors' },
  { slug: 'coriolanus', title: 'Coriolanus' },
  { slug: 'cymbeline', title: 'Cymbeline' },
  { slug: 'hamlet', title: 'Hamlet, Prince of Denmark' },
  { slug: 'henry-iv-part-1', title: 'Henry IV, Part 1' },
  { slug: 'henry-iv-part-2', title: 'Henry IV, Part 2' },
  { slug: 'henry-v', title: 'Henry V' },
  { slug: 'henry-vi-part-1', title: 'Henry VI, Part 1' },
  { slug: 'henry-vi-part-2', title: 'Henry VI, Part 2' },
  { slug: 'henry-vi-part-3', title: 'Henry VI, Part 3' },
  { slug: 'henry-viii', title: 'Henry VIII' },
  { slug: 'king-john', title: 'King John' },
  { slug: 'julius-caesar', title: 'Julius Caesar' },
  { slug: 'king-lear', title: 'King Lear' },
  { slug: 'loves-labours-lost', title: "Love's Labour's Lost" },
  { slug: 'macbeth', title: 'Macbeth' },
  { slug: 'measure-for-measure', title: 'Measure for Measure' },
  { slug: 'the-merchant-of-venice', title: 'The Merchant of Venice' },
  { slug: 'the-merry-wives-of-windsor', title: 'The Merry Wives of Windsor' },
  { slug: 'a-midsummer-nights-dream', title: "A Midsummer Night's Dream" },
  { slug: 'much-ado-about-nothing', title: 'Much Ado About Nothing' },
  { slug: 'othello', title: 'Othello, the Moor of Venice' },
  { slug: 'pericles', title: 'Pericles, Prince of Tyre' },
  { slug: 'richard-ii', title: 'King Richard the Second' },
  { slug: 'richard-iii', title: 'King Richard the Third' },
  { slug: 'romeo-and-juliet', title: 'Romeo and Juliet' },
  { slug: 'the-taming-of-the-shrew', title: 'The Taming of the Shrew' },
  { slug: 'the-tempest', title: 'The Tempest' },
  { slug: 'timon-of-athens', title: 'Timon of Athens' },
  { slug: 'titus-andronicus', title: 'Titus Andronicus' },
  { slug: 'troilus-and-cressida', title: 'Troilus and Cressida' },
  { slug: 'twelfth-night', title: 'Twelfth Night; or, What You Will' },
  { slug: 'the-two-gentlemen-of-verona', title: 'The Two Gentlemen of Verona' },
  { slug: 'the-two-noble-kinsmen', title: 'The Two Noble Kinsmen' },
  { slug: 'the-winters-tale', title: "The Winter's Tale" },
  { slug: 'a-lovers-complaint', title: "A Lover's Complaint" },
  { slug: 'the-passionate-pilgrim', title: 'The Passionate Pilgrim' },
  { slug: 'the-phoenix-and-the-turtle', title: 'The Phoenix and the Turtle' },
  { slug: 'the-rape-of-lucrece', title: 'The Rape of Lucrece' },
  { slug: 'venus-and-adonis', title: 'Venus and Adonis' },
];

if (WORKS.length !== 44) throw new Error(`WORKS must have exactly 44 entries, has ${WORKS.length}`);

export function workId(slug: string): string {
  return `shakespeare-${slug}-en`;
}
