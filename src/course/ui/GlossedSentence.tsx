/**
 * A Stage 0 micro-passage (docs/COURSE-PLAN.md §1): the sentence verbatim,
 * each word tappable for its lemma, form and gloss (shipped in the pack: no
 * bundle needed), with its citation and a link to the section it comes from.
 * Reads the text through the same tokenizer as the reader so the surface is
 * reproduced exactly; the glosses are matched to the word tokens in order.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { tokenize } from '../../lexis/tokenize.ts';
import { describeMorph, posLabel } from '../../lexis/morph.ts';
import type { LexLang, Pos } from '../../lexis/types.ts';
import { authorById, workById } from '../../library/registry.ts';
import type { MicroPassage } from '../types.ts';

export function GlossedSentence({ passage, lang }: { passage: MicroPassage; lang: LexLang }) {
  const [open, setOpen] = useState<number | null>(null);
  const tokens = tokenize(passage.text, lang);
  const work = workById(passage.work);
  const author = work ? authorById(work.authorId) : undefined;
  let wordIndex = -1;
  const word = open !== null ? passage.words[open] : undefined;
  return (
    <div className="co-micro">
      <p className={clsx('co-micro__text', lang === 'grc' && 'reader__prose--grc')} lang={lang}>
        {tokens.map((t, i) => {
          if (t.kind !== 'word') return t.surface;
          wordIndex++;
          const wi = wordIndex;
          return (
            <button
              key={i}
              type="button"
              className={clsx('lx-w', 'co-micro__w', open === wi && 'co-micro__w--open')}
              onClick={() => setOpen(open === wi ? null : wi)}
            >
              {t.surface}
            </button>
          );
        })}
      </p>
      {word ? (
        <p className="co-micro__gloss" lang="en">
          <b lang={lang}>{word.lemma}</b> · {posLabel(word.pos as Pos)}
          {word.morph ? ` · ${describeMorph(word.morph)}` : ''}
          {word.gloss ? ` — ${word.gloss}` : ' — no gloss in the dictionary'}
        </p>
      ) : null}
      <p className="co-micro__cite" lang="en">
        {author ? `${author.displayName}, ` : ''}
        {work ? <i>{work.commonTitle ?? work.title}</i> : passage.work}
        {passage.cite ? `, ${passage.cite}` : ''} ·{' '}
        <Link to={`/read/${passage.work}/${passage.div}`}>read in place →</Link>
      </p>
    </div>
  );
}
