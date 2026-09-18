import { loadGaps, loadIndex } from '../corpus/corpus.ts';
import { useResource } from '../ui/useResource.ts';
import { TopBar } from '../components/TopBar.tsx';

export function AboutScreen() {
  const { data: gaps } = useResource(loadGaps, 'gaps');
  const { data: index } = useResource(loadIndex, 'summa-index');
  const filled = index?.filledLacunae?.items ?? [];
  const byWitness = (w: string) =>
    filled.filter((f) => f.witness === w).map((f) => f.citation);
  const wikisourceFills = byWitness('wikisource-la');
  const leonineFills = byWitness('corpusthomisticum');

  return (
    <>
      <TopBar back="/" title="About & text source" />
      <main className="page page--narrow">
        <div className="prose">
          <h2>Western Canon</h2>
          <p>
            An offline reader for the classical canon. Homer's{' '}
            <em>Iliad</em> and <em>Odyssey</em>, Hesiod's{' '}
            <em>Theogony</em>, <em>Works and Days</em>, and{' '}
            <em>Shield of Heracles</em>, and Virgil's <em>Aeneid</em> each
            carry their original-language text (Greek: Monro/Allen; Latin:
            Greenough) and a public-domain English translation (Murray;
            Evelyn-White; Williams). Plato's thirteen core dialogues —{' '}
            <em>Euthyphro</em>, <em>Apology</em>, <em>Crito</em>,{' '}
            <em>Phaedo</em>, <em>Symposium</em>, <em>Phaedrus</em>,{' '}
            <em>Protagoras</em>, <em>Gorgias</em>, <em>Meno</em>,{' '}
            <em>Ion</em>, <em>Timaeus</em>, <em>Laws</em>, and the{' '}
            <em>Republic</em> — carry Burnet's Greek text and an English
            translation (the Loeb Classical Library translators, or, for the{' '}
            <em>Republic</em>, Jowett — see that work's own About page for
            why). Aristotle's <em>Categories</em> and{' '}
            <em>De Interpretatione</em>, and Porphyry's <em>Isagoge</em>, each
            carry three editions — Greek (Bekker / Busse), the Latin
            translation of Boethius, and an English translation (Edghill 1928;
            Owen 1853). Euclid's <em>Elements</em> carries the Greek text
            (Heiberg), many propositions with a real hand-sourced diagram, and
            Heath's 1908 English translation. Augustine of Hippo's{' '}
            <em>Confessions</em>, <em>City of God</em>, and{' '}
            <em>On Christian Doctrine</em> each carry the Latin original and a
            public-domain English translation (Pilkington, Dods, Shaw). Thomas
            Aquinas's <em>Summa Theologiae</em> is complete in Latin — the
            Proœmium, the four Partes, and the{' '}
            <em>Supplementum Tertiae Partis</em> with its Appendices de
            Purgatorio — with an English edition (the Dominican Fathers'
            translation) alongside it. A work with more than one edition
            collapses under one row in the Library; authors sort earliest
            first. Each work has its own “About the text” page with its
            edition, provenance and licensing; open a work and follow the link
            at the foot of its contents.
          </p>
          <p>
            Nothing is fetched at runtime, and no text is translated,
            modernised, reconstructed or silently corrected — a source gap or
            irregularity is preserved and noted, never papered over.
          </p>

          <h2>The Summa text &amp; its sources</h2>
          <p>
            The Latin text of the <em>Summa Theologiae</em> is in the public
            domain. Parts&nbsp;I–III (Prima Pars, Prima Secundae, Secunda
            Secundae, Tertia Pars) rest on the aggregated transcription at{' '}
            <a href="https://github.com/vicmortelmans/summa" rel="noreferrer">
              github.com/vicmortelmans/summa
            </a>{' '}
            (the parallel Dutch translation was removed during import). Every
            question and every numbered article in those parts is now present and
            contiguous; a handful of questions the Leonine prints with a single
            un-numbered article (I&nbsp;q.&nbsp;71, I&nbsp;q.&nbsp;72,
            II-II&nbsp;q.&nbsp;128, II-II&nbsp;q.&nbsp;143) are shown as{' '}
            <em>Articulus unicus</em>.
          </p>
          <p>
            <strong>Thirteen passages absent from that transcription were
            supplied verbatim from public-domain original-language witnesses</strong>{' '}
            (each is flagged in the reader and listed in{' '}
            <code>index.json → filledLacunae</code>):
          </p>
          <ul>
            <li>
              <strong>Latin Wikisource</strong>, “Summa Theologiae / Prima pars”
              (the Leonine text) —{' '}
              {wikisourceFills.length
                ? wikisourceFills.join(', ')
                : 'I q. 2 a. 1, I q. 57 a. 4, I q. 72, I q. 84 a. 2'}
              .
            </li>
            <li>
              <strong>corpusthomisticum.org</strong>, <em>Textum Leoninum</em>{' '}
              (Rome 1888/1899, rec. E. Alarcón) —{' '}
              {leonineFills.length
                ? leonineFills.join(', ')
                : 'I-II q. 42 a. 2, I-II q. 104 a. 2, II-II q. 57 a. 3, II-II q. 137 a. 2, II-II q. 143, III q. 2 a. 6, III q. 7 a. 9, III q. 15 a. 9, III q. 56 a. 1'}
              .
            </li>
          </ul>

          <h2>The English Summa &amp; its source</h2>
          <p>
            The English edition is the Fathers of the English Dominican
            Province's translation (2nd and revised edition, 1920), a
            complete public-domain rendering of all five sections — Prima
            Pars, Prima Secundae, Secunda Secundae, Tertia Pars, and the
            Supplementum with both its Appendices de Purgatorio — via{' '}
            <a href="https://www.newadvent.org/summa/" rel="noreferrer">
              newadvent.org/summa
            </a>
            . Every Question and Article (3,125 articles across 614 pages)
            was fetched and parsed directly from that transcription; inline
            cross-reference links to the <em>Catholic Encyclopedia</em> were
            unwrapped to plain text as ordinary HTML cleanup, and nothing
            else was altered — 1920 British spelling and punctuation are
            kept as printed.
          </p>
          <p>
            This translation carries no continuous prooemium prose before a
            Question's first Article (New Advent prints only a linked list
            of short article topics), so every English{' '}
            <code>Question.prooemium</code> is <code>null</code> — a
            difference from the Latin edition's own prooemium paragraphs, not
            a gap. Conversely, every English Question has its own short title
            (New Advent's page heading), which the Latin edition lacks. New
            Advent numbers every article, including questions with only one;
            the Latin edition's rare unnumbered <em>Articulus unicus</em> has
            no counterpart here. <strong>58 irregularities already present in
            New Advent's own transcription</strong> — objection/reply
            numbers that don't line up, a handful of double "On the
            contrary" paragraphs, a few articles with no "I answer that,"
            and the like — are kept exactly as printed and logged in{' '}
            <code>data/summa-en/anomalies.json</code>, never silently
            renumbered or corrected.
          </p>

          <h2>The Supplementum Tertiae Partis</h2>
          <p>
            The Supplementum (qq.&nbsp;1–99) with its two Appendices de
            Purgatorio (App.&nbsp;I&nbsp;qq.&nbsp;1–2, App.&nbsp;II&nbsp;q.&nbsp;1)
            is a <strong>posthumous compilation</strong>: assembled after
            Aquinas' death (c.&nbsp;1274) by Reginald (Rainaldus) of Piperno from
            Aquinas' earlier <em>Scriptum super libros Sententiarum</em>,
            Book&nbsp;IV. It is <em>not</em> part of the Summa as Aquinas wrote
            it, and is shown here set apart, after Tertia Pars.
          </p>
          <p>
            No clean digital Latin of the Supplementum exists, so it is
            transcribed from OCR of two public-domain printed editions and
            cross-checked one against the other:
          </p>
          <ul>
            <li>
              <strong>base text</strong> — the Marietti edition (<em>Summa
              Theologica</em>, Turin 1926/1931), via the CC0 transcription at{' '}
              <a
                href="https://github.com/pantaleonfassbender-coder/Aquinas-summa"
                rel="noreferrer"
              >
                github.com/pantaleonfassbender-coder/Aquinas-summa
              </a>
              ;
            </li>
            <li>
              <strong>second witness</strong> — the <em>Editio altera Romana</em>,
              vol.&nbsp;V (<em>Tertiae Partis Supplementum</em>, Rome: Forzani,
              1894), Internet Archive{' '}
              <a
                href="https://archive.org/details/divithomaeaquina0005thom"
                rel="noreferrer"
              >
                divithomaeaquina0005thom
              </a>
              .
            </li>
          </ul>
          <p>
            The cleanup is transcription hygiene only — mangled scan characters,
            words split at line-ends, running heads, page numbers and the
            editorial <em>Conclusio</em> synopses are removed; where the Marietti
            OCR is column-scrambled the aligned reading of the 1894 edition is
            used instead. The edition's own words are never altered, and where a
            reading stays uncertain after checking both witnesses it is flagged,
            not guessed:{' '}
            <strong>
              about 45 of the Supplementum's 456 articles carry such a note
            </strong>{' '}
            (the full log is <code>suppl-anomalies.json</code>). The Supplementum
            keeps its editions' 19th-century orthography (consonantal{' '}
            <em>j</em>, <em>ae</em>), which differs from the Leonine spelling of
            Parts&nbsp;I–III; this is preserved, not regularised.
          </p>

          <h2>Remaining notes</h2>
          <ul>
            <li>
              <strong>No Latin quaestio titles.</strong> The Latin sources
              carry no “De…” title for any question (the English edition's
              own question titles are unrelated — see above), so Latin
              question screens lead with the number; a muted preview line
              shows the first article’s <em>utrum</em> question where
              available.
            </li>
            {gaps && gaps.count === 0 ? (
              <li>
                <strong>No remaining lacunae.</strong> After the fills above,{' '}
                <code>gaps.json</code> is empty — every question and article in
                all five sections carries its original Latin.
              </li>
            ) : gaps ? (
              <li>
                <strong>{gaps.count} passage(s) still absent:</strong>{' '}
                {[...gaps.missingQuestions, ...gaps.missingArticles].join('; ')}.
              </li>
            ) : (
              <li>Loading the exact list of any remaining gaps…</li>
            )}
            <li>
              <strong>~30 articles have no recovered <em>utrum</em> line</strong>{' '}
              (it could not be parsed from the question’s prooemium, or the
              Supplementum OCR title was unusable). Those show “Articulus N” with
              no question line; the article body is complete.
            </li>
          </ul>
          <p className="muted">
            Nothing is fetched at runtime and no Latin is translated,
            reconstructed or conjecturally emended.
          </p>

          <h2>Typeface</h2>
          <p>
            Latin is set in <strong>EB Garamond</strong> (Georg Duffner &amp;
            Octavio Pardo); Greek in <strong>Gentium Plus</strong> (SIL), which
            covers polytonic Greek in full. Both are used under the SIL Open
            Font License 1.1 and bundled (subset) with the app; see{' '}
            <code>FONTS.md</code> in the source tree.
          </p>
        </div>
      </main>
    </>
  );
}
