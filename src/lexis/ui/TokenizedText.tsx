/**
 * Renders one passage's text as tokens (plan §3 tokenizer): word tokens as
 * tappable `<span class="lx-w">`s carrying the status highlight, everything
 * else (spaces — including the newlines pre-line relies on — punctuation,
 * numbers) as plain text nodes. The concatenation of every token's `surface`
 * reconstructs `text` exactly, so the rendered textContent is byte-identical
 * to `text` whether or not any word happens to render a highlight class.
 */
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { tokenize } from '../tokenize.ts';
import { readingsFor } from '../index.ts';
import type { KnownWord, LexLang, WorkLexis } from '../types.ts';
import { WordCard } from './WordCard.tsx';

export interface TokenizedTextProps {
  text: string;
  lang: LexLang;
  workId: string;
  divId: string;
  bundle: WorkLexis;
  statuses: Map<string, KnownWord>;
  highlight: 'none' | 'new' | 'all';
  morphOnFirstLevel: boolean;
}

interface OpenWord {
  surface: string;
  formKey: string;
}

export function TokenizedText({
  text,
  lang,
  workId,
  divId,
  bundle,
  statuses,
  highlight,
  morphOnFirstLevel,
}: TokenizedTextProps) {
  const tokens = useMemo(() => tokenize(text, lang), [text, lang]);
  const [open, setOpen] = useState<OpenWord | null>(null);

  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind !== 'word') return t.surface;

        const readings = readingsFor(bundle, t.key, lang);
        const top = readings[0];
        const lexemeId = top ? top[0] : `${lang}:?:${t.key}`;
        const status = statuses.get(lexemeId);
        const shown =
          highlight === 'all' ||
          (highlight === 'new' && (!status || status.status === 'new'));

        const openThis = () => setOpen({ surface: t.surface, formKey: t.key });

        return (
          <span
            key={i}
            className={clsx('lx-w', shown && 'lx-w--hl')}
            data-status={status?.status ?? 'new'}
            tabIndex={0}
            role="button"
            onClick={openThis}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openThis();
              }
            }}
          >
            {t.surface}
          </span>
        );
      })}
      {open ? (
        <WordCard
          surface={open.surface}
          formKey={open.formKey}
          lang={lang}
          workId={workId}
          divId={divId}
          readings={readingsFor(bundle, open.formKey, lang)}
          bundle={bundle}
          morphOnFirstLevel={morphOnFirstLevel}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
