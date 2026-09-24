# Lexis — Latin data package report

Built 2026-09-24T18:19:43.936Z. Primary analyser: kaikki.org Latin Wiktionary extract (CC BY-SA). Fallback: whitakers-words 0.1.1 (MIT), gated to lemmas kaikki or Lewis & Short also know. Lewis & Short (Perseus TEI, CC BY-SA 4.0) supplies the full html article always, and the gloss only when kaikki has none.

## Fix batch 1 (coordinator probe fixes, 2026-09-24)

Rebuilt with kaikki.org as the PRIMARY analyser (romance-v0’s local copy of kaikki-la.jsonl, tag-mapping ideas ported from romance-v0/scripts/dict-lib.mjs); Whitaker’s Words is now a fallback gated to lemmas some other dictionary also knows; Lewis & Short gloss extraction uses a much stricter grammar-note filter. Exact probes requested:

| key | new top reading | gloss | confidence | alt. readings |
|---|---|---|---:|---:|
| hominum | homo (noun gen pl m) | human, person, man | 0.9 | 1 |
| civium | civis (noun gen pl m) | citizen | 0.9 | 1 |
| viros | vir (noun acc pl) | man (adult male human) | 0.9 | 1 |
| dominorum | dominus (noun gen pl) | master, owner, possessor, proprietor | 0.9 | 1 |
| civitatis | civitas (noun gen sg f) | citizenship and its rights; often referring to Roman citizenship. | 0.8 | 2 |
| civitas | civitas (noun nom sg f) | citizenship and its rights; often referring to Roman citizenship. | 0.8 | 3 |
| esse | sum (verb pres inf act) | to be, exist | 0.8 | 7 |
| fuit | sum (verb perf ind act 3 sg) | to be, exist | 0.9 | 1 |
| omnia | omnis (adj nom pl n) | every | 0.8 | 7 |
| quae | qui (pron nom sg f) | who, that, which, what | 0.8 | 8 |
| urbem | urbs (noun acc sg) | a city, walled town | 0.8 | 2 |
| libros | liber (noun acc pl) | book | 0.9 | 1 |
| auctoritate | auctoritas (noun abl sg f) | credibility, prestige, reputation, importance | 0.9 | 1 |
| respondere | respondeo (verb pres inf act) | to reply, answer, respond | 0.8 | 3 |
| amici | amicus (adj gen sg m) | friendly, well-disposed, amicable | 0.8 | 8 |
| minus | minor (adj nom sg n) | less; lesser; inferior; smaller | 0.8 | 3 |
| qui | qui (pron nom sg) | who, that, which, what | 0.8 | 14 |
| ille | ille (pron nom sg) | that one; that (thing); those ones (in the plural); those (things); he, she, it | 0.8 | 4 |

New coverage after fix batch 1: **99.47%** running tokens (1,392,564/1,399,948), of which kaikki resolved 92,479 keys directly, Whitaker’s (gated) fallback resolved 4,250 more, and 7,094 were proper-name fallbacks.

## Coverage

- Corpus: 44 Latin works, 1,399,948 running word tokens, 108,026 unique loose keys.
- **Running-token recognition: 99.47%** (1,392,564/1,399,948) — target was ≥ 96%.
- Unique-key recognition: 96.11% (103,823/108,026).
- Lexicon entries shipped: 33,095; gloss source kaikki 19,754, Lewis & Short fallback 345; 7,094 proper-name-fallback lexemes; html article present for 17,184 lexemes.
- lex/la shards: 1256.

## Per-work coverage

| work | tokens | recognized | % |
|---|---:|---:|---:|
| augustine-city-of-god-la | 282,361 | 281,152 | 99.6% |
| newton-principia-la | 113,669 | 111,003 | 97.7% |
| in-verrem-la | 100,439 | 100,341 | 99.9% |
| augustine-confessions-la | 78,771 | 78,537 | 99.7% |
| aeneid-la | 63,347 | 63,242 | 99.8% |
| de-oratore-la | 61,797 | 61,721 | 99.9% |
| philippics-la | 52,571 | 52,561 | 100.0% |
| de-bello-gallico-la | 51,300 | 51,291 | 100.0% |
| de-finibus-la | 47,072 | 46,992 | 99.8% |
| tusculan-disputations-la | 47,043 | 46,333 | 98.5% |
| ad-atticum-selection-la | 41,812 | 41,719 | 99.8% |
| augustine-christian-doctrine-la | 40,047 | 39,955 | 99.8% |
| de-natura-deorum-la | 36,015 | 35,892 | 99.7% |
| de-officiis-la | 34,012 | 33,835 | 99.5% |
| de-bello-civili-la | 32,338 | 32,309 | 99.9% |
| de-divinatione-la | 27,541 | 27,228 | 98.9% |
| brutus-la | 25,029 | 24,951 | 99.7% |
| boethius-consolatio-la | 24,595 | 24,477 | 99.5% |
| ad-familiares-selection-la | 22,494 | 22,425 | 99.7% |
| de-republica-la | 22,223 | 22,141 | 99.6% |
| dante-monarchia-la | 19,160 | 19,021 | 99.3% |
| de-legibus-la | 18,701 | 18,572 | 99.3% |
| orator-la | 18,361 | 18,305 | 99.7% |
| pro-sestio-la | 16,786 | 16,743 | 99.7% |
| pro-roscio-amerino-la | 13,249 | 13,247 | 100.0% |
| in-catilinam-la | 12,555 | 12,552 | 100.0% |
| dante-de-vulgari-eloquentia-la | 11,394 | 10,978 | 96.3% |
| pro-milone-la | 10,515 | 10,512 | 100.0% |
| de-amicitia-la | 9,336 | 9,331 | 99.9% |
| categoriae-la | 9,197 | 9,146 | 99.4% |
| pro-caelio-la | 8,469 | 8,469 | 100.0% |
| de-senectute-la | 8,259 | 8,252 | 99.9% |
| de-interpretatione-la | 5,948 | 5,915 | 99.4% |
| boethius-contra-eutychen-la | 5,858 | 5,816 | 99.3% |
| isagoge-la | 5,137 | 5,086 | 99.0% |
| ad-quintum-fratrem-selection-la | 4,555 | 4,553 | 100.0% |
| pro-ligario-la | 3,280 | 3,279 | 100.0% |
| pro-archia-la | 3,117 | 3,117 | 100.0% |
| boethius-de-trinitate-la | 2,940 | 2,923 | 99.4% |
| pro-marcello-la | 2,767 | 2,767 | 100.0% |
| ad-brutum-selection-la | 2,011 | 2,009 | 99.9% |
| boethius-de-fide-catholica-la | 1,928 | 1,922 | 99.7% |
| boethius-quomodo-substantiae-la | 1,390 | 1,389 | 99.9% |
| boethius-utrum-pater-la | 559 | 555 | 99.3% |

## Sizes

- data/lexis/works/*.json (44 Latin bundles): 57733 KB total; largest augustine-city-of-god-la.json at 5525 KB.
- data/lexis/lex/la/*.json (1256 shards): 34488 KB total; largest volo__.json at 298 KB (over the ~250 KB target).
- Grand total (works + lex/la): 90.1 MB.

## 30 random Latin tokens, 5 works — for hand spot-checking

| work | surface | top reading | gloss | confidence |
|---|---|---|---|---:|
| de-interpretatione-la | rei | res (noun gen sg f) | thing, object, stuff | 0.8 |
| de-interpretatione-la | inlitterati | inlitteratus (adj gen sg m) | ignorant, illiterate | 0.7 |
| de-interpretatione-la | alteram | alter (adj acc sg f) | one or both | 0.7 |
| de-interpretatione-la | nunc | nunc (adv) | right now, at present, at this time, at this very moment | 0.9 |
| de-interpretatione-la | contradictone | contradico (verb ptcp perf pass dat sg m encl) | to speak or allege against, oppose; contradict, gainsay | 0.7 |
| de-interpretatione-la | uim | vis (noun acc sg f) | force | 0.9 |
| de-senectute-la | queo | queo (verb pres ind act 1 sg) | to be able, can | 0.9 |
| de-senectute-la | audisse | audio (verb perf inf act) | to hear, listen to | 0.9 |
| de-senectute-la | assensus | assentior (verb ptcp perf act nom sg m) | to agree with; assent to, approve, give assent or approval | 0.8 |
| de-senectute-la | fletu | fleo (verb sup abl) | to weep, cry | 0.8 |
| de-senectute-la | praeclare | praeclarus (adj voc sg m) | very clear or bright | 0.8 |
| de-senectute-la | posteris | posterus (adj dat pl m) | following, next, coming after | 0.8 |
| pro-archia-la | fudit | fundo (verb perf ind act 3 sg) | to pour out, shed | 0.9 |
| pro-archia-la | doctrinam | doctrina (noun acc sg f) | teaching, instruction | 0.9 |
| pro-archia-la | dignus | dignus (adj nom sg m) | appropriate, fitting, worthy, meet, deserving, fit, proper, suitable, becoming | 0.9 |
| pro-archia-la | re | res (noun abl sg f) | thing, object, stuff | 0.8 |
| pro-archia-la | sapientissimi | sapientissimus (adj gen sg m) | discerning, wise, judicious | 0.8 |
| pro-archia-la | abhorreat | abhorreo (verb pres subj act 3 sg) | to abhor, shudder at, recoil or shrink back from | 0.9 |
| boethius-quomodo-substantiae-la | lasciuia | lascivia (noun nom sg f) | wantonness, jollity | 0.8 |
| boethius-quomodo-substantiae-la | aptabitur | apto (verb fut ind pass 3 sg) | to fasten, fit, apply, adjust | 0.9 |
| boethius-quomodo-substantiae-la | accepta | accepta (noun nom sg) | a portion of land granted by the state | 0.8 |
| boethius-quomodo-substantiae-la | iustus | iustus (adj nom sg m) | just, righteous | 0.9 |
| boethius-quomodo-substantiae-la | ipsa | ipse (pron nom sg f) | pron. demonstr | 0.7 |
| boethius-quomodo-substantiae-la | ab | ab (prep) | from, away from, out of | 0.9 |
| boethius-contra-eutychen-la | gratia | gratia (noun nom sg f) | grace | 0.8 |
| boethius-contra-eutychen-la | inquirebam | inquiro (verb impf ind act 1 sg) | to seek after, search for, inquire into something; investigate; pry, examine | 0.9 |
| boethius-contra-eutychen-la | definitio | definitio (noun nom sg f) | definition; precise description | 0.8 |
| boethius-contra-eutychen-la | re | res (noun abl sg f) | thing, object, stuff | 0.8 |
| boethius-contra-eutychen-la | scripsi | scribo (verb perf ind act 1 sg) | to write | 0.9 |
| boethius-contra-eutychen-la | sanctos | sanctus (noun acc pl m) | A saint; person who lives a holy and virtuous life. | 0.8 |

## 200 most frequent unrecognised Latin forms

No reading is fabricated for any of these; each is simply absent from `forms` in every bundle that uses it.

| form | corpus count | guessed reason |
|---|---:|---|
| à | 293 | very short — likely an abbreviation or OCR fragment |
| adeoq | 153 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quàm | 140 | non-Latin-letter characters — OCR noise or transliteration |
| quad | 105 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| uult | 77 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quodvis | 45 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| verò | 43 | non-Latin-letter characters — OCR noise or transliteration |
| sqrt | 41 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quamproxime | 37 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ciuium | 35 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| reciprocè | 32 | non-Latin-letter characters — OCR noise or transliteration |
| proximè | 28 | non-Latin-letter characters — OCR noise or transliteration |
| cub | 27 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| è | 24 | very short — likely an abbreviation or OCR fragment |
| emergentiæ | 23 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| temporaliter | 22 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| usq | 20 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quacunq | 20 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ǫ | 20 | very short — likely an abbreviation or OCR fragment |
| ciuibus | 19 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| horarius | 19 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| theologian | 18 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| semidiameter | 18 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| inmerito | 17 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| poëtae | 17 | non-Latin-letter characters — OCR noise or transliteration |
| utcunq | 17 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| semidiametri | 17 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| inversè | 17 | non-Latin-letter characters — OCR noise or transliteration |
| oboedienter | 16 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| mutuò | 16 | non-Latin-letter characters — OCR noise or transliteration |
| mod | 15 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quibuscunq | 15 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| cujuscunq | 15 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| superferebatur | 14 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| che | 14 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| absq | 14 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| centroq | 14 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| eiq | 14 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| semidiametrum | 14 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| uultis | 13 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| motrices | 13 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quinq | 13 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| seorsim | 13 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| qualicumque | 12 | possible enclitic that still could not be split |
| undiq | 12 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quæq | 12 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| plusquam | 12 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| oscillantis | 12 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| adeò | 12 | non-Latin-letter characters — OCR noise or transliteration |
| directè | 12 | non-Latin-letter characters — OCR noise or transliteration |
| quamproximè | 12 | non-Latin-letter characters — OCR noise or transliteration |
| endecasyllabum | 11 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| cujusq | 11 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| utrinq | 11 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| idq | 11 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| min | 11 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| semidiametrorum | 11 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| uxus | 11 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| modò | 11 | non-Latin-letter characters — OCR noise or transliteration |
| accuratè | 11 | non-Latin-letter characters — OCR noise or transliteration |
| qualecumque | 10 | possible enclitic that still could not be split |
| seruorum | 10 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| tur | 10 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| cci | 10 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quocunq | 10 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| misericorditer | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| suapte | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| gressibile | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| poe | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| motrix | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| utroq | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quamcunq | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| semidiametro | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| convolutione | 9 | possible enclitic that still could not be split |
| centrifuga | 9 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| maximè | 9 | non-Latin-letter characters — OCR noise or transliteration |
| inconuenienter | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| idest | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| pneu | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| specialissima | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| specialissimum | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quoq | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| sexdecim | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| proindeq | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| sesquiplicata | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| oo | 8 | very short — likely an abbreviation or OCR fragment |
| utcunque | 8 | possible enclitic that still could not be split |
| centrifugæ | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| dig | 8 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| respectivè | 8 | non-Latin-letter characters — OCR noise or transliteration |
| horâ | 8 | non-Latin-letter characters — OCR noise or transliteration |
| ín | 7 | very short — likely an abbreviation or OCR fragment |
| miserabiliter | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| qualescumque | 7 | possible enclitic that still could not be split |
| incredibilius | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| significatiua | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| septuagensimo | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| subsistentiam | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| eptasyllabum | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| dieresim | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| consignificat | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quotcunq | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| utrumq | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| centrifugis | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| mb | 7 | very short — likely an abbreviation or OCR fragment |
| concentricis | 7 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| tardiùs | 7 | non-Latin-letter characters — OCR noise or transliteration |
| perpetuò | 7 | non-Latin-letter characters — OCR noise or transliteration |
| tB | 7 | very short — likely an abbreviation or OCR fragment |
| nón | 6 | non-Latin-letter characters — OCR noise or transliteration |
| summissius | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| qualiumcumque | 6 | possible enclitic that still could not be split |
| inmundissimos | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| sublimiter | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| euidentior | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| qualemcumque | 6 | possible enclitic that still could not be split |
| intellegibiliter | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| theurgicis | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| inmortaliter | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| pnoh | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| vinulentia | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| us | 6 | very short — likely an abbreviation or OCR fragment |
| córpus | 6 | non-Latin-letter characters — OCR noise or transliteration |
| permotione | 6 | possible enclitic that still could not be split |
| poëtis | 6 | non-Latin-letter characters — OCR noise or transliteration |
| poëtam | 6 | non-Latin-letter characters — OCR noise or transliteration |
| utraq | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ubiq | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| æquivelocia | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| mr | 6 | very short — likely an abbreviation or OCR fragment |
| concentricas | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quodq | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| bbO | 6 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| longè | 6 | non-Latin-letter characters — OCR noise or transliteration |
| dam | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| teipsum | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| hyssopo | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| cuiuis | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| inmorari | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| cen | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| theurgian | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| theurgica | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ineffabiliter | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| centensimo | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quadragensimo | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| subsistentiae | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| exquisitius | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| poetati | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| paterfamilias | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| rithimi | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| superpositionis | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ómnia | 5 | non-Latin-letter characters — OCR noise or transliteration |
| enuntiatiua | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| conlocatione | 5 | possible enclitic that still could not be split |
| dlx | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| hinnibile | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| conversim | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| mk×ms | 5 | non-Latin-letter characters — OCR noise or transliteration |
| concentricarum | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| nbB | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| nnoo | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| æquivelocium | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| minimè | 5 | non-Latin-letter characters — OCR noise or transliteration |
| facilè | 5 | non-Latin-letter characters — OCR noise or transliteration |
| mTl | 5 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| cY | 5 | very short — likely an abbreviation or OCR fragment |
| coss | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| laudabilius | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| retrorsus | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| aër | 4 | non-Latin-letter characters — OCR noise or transliteration |
| indecenter | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| perpetratione | 4 | possible enclitic that still could not be split |
| teletas | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| horoscopum | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| inmutauerunt | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| beian | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| teletis | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ordinatissima | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| rutunditas | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| qeia | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| rutunda | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ur | 4 | very short — likely an abbreviation or OCR fragment |
| bus | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| quaquaversum | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| laudabilior | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| superferri | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| inl | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| excons | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| ord | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| turn | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| tatem | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| bicubitum | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| conuersim | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| rithimos | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| eptasyllabo | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| volitum | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| duelliones | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| interemptionem | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| virtuosius | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
| cetrati | 4 | not in kaikki’s Latin extract or Whitaker’s dictionary — rare word, name, or archaic/OCR-era spelling |
