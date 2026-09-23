# Plutarch import - work table (workId -> tlg -> title -> witnesses -> chapter counts)

Generated from the actual imported data (`data/plutarch-<slug>-{grc,en}/work.json`), not assumed.
66 works (48 Lives + 18 Comparisons; 4 unpaired Lives: Pyrrhus, Caius Marius, Alexander, Caesar all paired 
but lack a surviving Comparison, plus Phocion, Cato the Younger, Aratus, Artaxerxes, Galba, Otho are 
themselves unpaired or paired without a surviving Comparison - see "notes" column) x 2 languages = 132 editions.

| tlg | workId (grc / en) | English title | Greek witness | English witness | chapters | notes |
|-----|--------------------|---------------|----------------|------------------|----------|-------|
| tlg001 | `plutarch-theseus-grc` / `plutarch-theseus-en` | Theseus | perseus-grc2 | perseus-eng3 | 36 | English witness is perseus-eng3 (older digitization); "Socius Senecio" not "Sossius Senecio" in this witness |
| tlg002 | `plutarch-romulus-grc` / `plutarch-romulus-en` | Romulus | perseus-grc2 | perseus-eng2 | 29 | - |
| tlg003 | `plutarch-comparison-of-theseus-and-romulus-grc` / `plutarch-comparison-of-theseus-and-romulus-en` | Comparison of Theseus and Romulus | perseus-grc2 | perseus-eng2 | 6 | - |
| tlg004 | `plutarch-lycurgus-grc` / `plutarch-lycurgus-en` | Lycurgus | perseus-grc2 | perseus-eng2 | 31 | - |
| tlg005 | `plutarch-numa-grc` / `plutarch-numa-en` | Numa | perseus-grc2 | perseus-eng2 | 22 | - |
| tlg006 | `plutarch-comparison-of-lycurgus-and-numa-grc` / `plutarch-comparison-of-lycurgus-and-numa-en` | Comparison of Lycurgus and Numa | perseus-grc2 | perseus-eng2 | 4 | - |
| tlg007 | `plutarch-solon-grc` / `plutarch-solon-en` | Solon | perseus-grc2 | perseus-eng2 | 32 | - |
| tlg008 | `plutarch-publicola-grc` / `plutarch-publicola-en` | Publicola | perseus-grc2 | perseus-eng2 | 23 | - |
| tlg009 | `plutarch-comparison-of-solon-and-publicola-grc` / `plutarch-comparison-of-solon-and-publicola-en` | Comparison of Solon and Publicola | perseus-grc2 | perseus-eng2 | 4 | - |
| tlg010 | `plutarch-themistocles-grc` / `plutarch-themistocles-en` | Themistocles | perseus-grc2 | perseus-eng2 | 32 | - |
| tlg011 | `plutarch-camillus-grc` / `plutarch-camillus-en` | Camillus | perseus-grc2 | perseus-eng2 | 43 | - |
| tlg012 | `plutarch-pericles-grc` / `plutarch-pericles-en` | Pericles | perseus-grc2 | perseus-eng2 | 39 | - |
| tlg013 | `plutarch-fabius-maximus-grc` / `plutarch-fabius-maximus-en` | Fabius Maximus | perseus-grc2 | perseus-eng2 | 27 | - |
| tlg014 | `plutarch-comparison-of-pericles-and-fabius-maximus-grc` / `plutarch-comparison-of-pericles-and-fabius-maximus-en` | Comparison of Pericles and Fabius Maximus | perseus-grc2 | perseus-eng2 | 3 | - |
| tlg015 | `plutarch-alcibiades-grc` / `plutarch-alcibiades-en` | Alcibiades | perseus-grc2 | perseus-eng2 | 39 | - |
| tlg016 | `plutarch-caius-marcius-coriolanus-grc` / `plutarch-caius-marcius-coriolanus-en` | Caius Marcius Coriolanus | perseus-grc2 | perseus-eng2 | 39 | - |
| tlg017 | `plutarch-comparison-of-alcibiades-and-coriolanus-grc` / `plutarch-comparison-of-alcibiades-and-coriolanus-en` | Comparison of Alcibiades and Coriolanus | perseus-grc2 | perseus-eng2 | 5 | - |
| tlg018 | `plutarch-timoleon-grc` / `plutarch-timoleon-en` | Timoleon | perseus-grc2 | perseus-eng2 | 40 | chapters numbered 0..39 (proem is ch. 0) |
| tlg019 | `plutarch-aemilius-paulus-grc` / `plutarch-aemilius-paulus-en` | Aemilius Paulus | perseus-grc2 | perseus-eng2 | 38 | - |
| tlg020 | `plutarch-comparison-of-timoleon-and-aemilius-grc` / `plutarch-comparison-of-timoleon-and-aemilius-en` | Comparison of Timoleon and Aemilius | perseus-grc2 | perseus-eng2 | 2 | - |
| tlg021 | `plutarch-pelopidas-grc` / `plutarch-pelopidas-en` | Pelopidas | perseus-grc2 | perseus-eng2 | 35 | - |
| tlg022 | `plutarch-marcellus-grc` / `plutarch-marcellus-en` | Marcellus | perseus-grc2 | perseus-eng2 | 30 | - |
| tlg023 | `plutarch-comparison-of-pelopidas-and-marcellus-grc` / `plutarch-comparison-of-pelopidas-and-marcellus-en` | Comparison of Pelopidas and Marcellus | perseus-grc2 | perseus-eng2 | 3 | - |
| tlg024 | `plutarch-aristides-grc` / `plutarch-aristides-en` | Aristides | perseus-grc2 | perseus-eng2 | 27 | - |
| tlg025 | `plutarch-marcus-cato-grc` / `plutarch-marcus-cato-en` | Marcus Cato | perseus-grc2 | perseus-eng2 | 27 | - |
| tlg026 | `plutarch-comparison-of-aristides-and-marcus-cato-grc` / `plutarch-comparison-of-aristides-and-marcus-cato-en` | Comparison of Aristides and Marcus Cato | perseus-grc2 | perseus-eng2 | 6 | - |
| tlg027 | `plutarch-philopoemen-grc` / `plutarch-philopoemen-en` | Philopoemen | perseus-grc2 | perseus-eng2 | 21 | - |
| tlg028 | `plutarch-titus-flamininus-grc` / `plutarch-titus-flamininus-en` | Titus Flamininus | perseus-grc2 | perseus-eng2 | 21 | - |
| tlg029 | `plutarch-comparison-of-philopoemen-and-titus-grc` / `plutarch-comparison-of-philopoemen-and-titus-en` | Comparison of Philopoemen and Titus | perseus-grc2 | perseus-eng2 | 3 | - |
| tlg030 | `plutarch-pyrrhus-grc` / `plutarch-pyrrhus-en` | Pyrrhus | perseus-grc2 | perseus-eng2 | 34 | - |
| tlg031 | `plutarch-caius-marius-grc` / `plutarch-caius-marius-en` | Caius Marius | perseus-grc2 | perseus-eng2 | 46 | - |
| tlg032 | `plutarch-lysander-grc` / `plutarch-lysander-en` | Lysander | perseus-grc2 | perseus-eng2 | 30 | - |
| tlg033 | `plutarch-sulla-grc` / `plutarch-sulla-en` | Sulla | perseus-grc2 | perseus-eng2 | 38 | - |
| tlg034 | `plutarch-comparison-of-lysander-and-sulla-grc` / `plutarch-comparison-of-lysander-and-sulla-en` | Comparison of Lysander and Sulla | perseus-grc2 | perseus-eng2 | 5 | - |
| tlg035 | `plutarch-cimon-grc` / `plutarch-cimon-en` | Cimon | perseus-grc2 | perseus-eng2 | 19 | - |
| tlg036 | `plutarch-lucullus-grc` / `plutarch-lucullus-en` | Lucullus | perseus-grc2 | perseus-eng2 | 43 | - |
| tlg037 | `plutarch-comparison-of-lucullus-and-cimon-grc` / `plutarch-comparison-of-lucullus-and-cimon-en` | Comparison of Lucullus and Cimon | perseus-grc2 | perseus-eng2 | 3 | - |
| tlg038 | `plutarch-nicias-grc` / `plutarch-nicias-en` | Nicias | perseus-grc2 | perseus-eng2 | 30 | - |
| tlg039 | `plutarch-crassus-grc` / `plutarch-crassus-en` | Crassus | perseus-grc2 | perseus-eng2 | 33 | - |
| tlg040 | `plutarch-comparison-of-nicias-and-crassus-grc` / `plutarch-comparison-of-nicias-and-crassus-en` | Comparison of Nicias and Crassus | perseus-grc2 | perseus-eng2 | 5 | - |
| tlg041 | `plutarch-eumenes-grc` / `plutarch-eumenes-en` | Eumenes | perseus-grc2 | perseus-eng2 | 19 | - |
| tlg042 | `plutarch-sertorius-grc` / `plutarch-sertorius-en` | Sertorius | perseus-grc2 | perseus-eng2 | 27 | - |
| tlg043 | `plutarch-comparison-of-sertorius-and-eumenes-grc` / `plutarch-comparison-of-sertorius-and-eumenes-en` | Comparison of Sertorius and Eumenes | perseus-grc2 | perseus-eng2 | 2 | - |
| tlg044 | `plutarch-agesilaus-grc` / `plutarch-agesilaus-en` | Agesilaus | perseus-grc2 | perseus-eng2 | 40 | - |
| tlg045 | `plutarch-pompey-grc` / `plutarch-pompey-en` | Pompey | perseus-grc2 | perseus-eng2 | 80 | - |
| tlg046 | `plutarch-comparison-of-agesilaus-and-pompey-grc` / `plutarch-comparison-of-agesilaus-and-pompey-en` | Comparison of Agesilaus and Pompey | perseus-grc2 | perseus-eng2 | 5 | - |
| tlg047 | `plutarch-alexander-grc` / `plutarch-alexander-en` | Alexander | perseus-grc2 | perseus-eng2 | 77 | - |
| tlg048 | `plutarch-caesar-grc` / `plutarch-caesar-en` | Caesar | perseus-grc2 | perseus-eng2 | 69 | - |
| tlg049 | `plutarch-phocion-grc` / `plutarch-phocion-en` | Phocion | perseus-grc2 | perseus-eng2 | 38 | - |
| tlg050 | `plutarch-cato-the-younger-grc` / `plutarch-cato-the-younger-en` | Cato the Younger | perseus-grc2 | perseus-eng2 | 73 | - |
| tlg051 | `plutarch-agis-and-cleomenes-grc` / `plutarch-agis-and-cleomenes-en` | Agis and Cleomenes | perseus-grc1 | perseus-eng1 | 60 | double life: book-level parts, chapter numbers restart per part |
| tlg052 | `plutarch-tiberius-and-caius-gracchus-grc` / `plutarch-tiberius-and-caius-gracchus-en` | Tiberius and Caius Gracchus | perseus-grc1 | perseus-eng1 | 40 | double life: book-level parts, chapter numbers restart per part |
| tlg053 | `plutarch-comparison-of-agis-and-cleomenes-and-the-gracchi-grc` / `plutarch-comparison-of-agis-and-cleomenes-and-the-gracchi-en` | Comparison of Agis and Cleomenes and the Gracchi | perseus-grc2 | perseus-eng2 | 5 | - |
| tlg054 | `plutarch-demosthenes-grc` / `plutarch-demosthenes-en` | Demosthenes | perseus-grc2 | perseus-eng2 | 31 | - |
| tlg055 | `plutarch-cicero-grc` / `plutarch-cicero-en` | Cicero | perseus-grc2 | perseus-eng2 | 49 | - |
| tlg056 | `plutarch-comparison-of-demosthenes-and-cicero-grc` / `plutarch-comparison-of-demosthenes-and-cicero-en` | Comparison of Demosthenes and Cicero | perseus-grc2 | perseus-eng2 | 5 | - |
| tlg057 | `plutarch-demetrius-grc` / `plutarch-demetrius-en` | Demetrius | perseus-grc2 | perseus-eng2 | 53 | - |
| tlg058 | `plutarch-antony-grc` / `plutarch-antony-en` | Antony | perseus-grc2 | perseus-eng2 | 87 | - |
| tlg059 | `plutarch-comparison-of-demetrius-and-antony-grc` / `plutarch-comparison-of-demetrius-and-antony-en` | Comparison of Demetrius and Antony | perseus-grc2 | perseus-eng2 | 6 | - |
| tlg060 | `plutarch-dion-grc` / `plutarch-dion-en` | Dion | perseus-grc2 | perseus-eng2 | 58 | - |
| tlg061 | `plutarch-brutus-grc` / `plutarch-brutus-en` | Brutus | perseus-grc2 | perseus-eng2 | 53 | - |
| tlg062 | `plutarch-comparison-of-dion-and-brutus-grc` / `plutarch-comparison-of-dion-and-brutus-en` | Comparison of Dion and Brutus | perseus-grc2 | perseus-eng2 | 5 | - |
| tlg063 | `plutarch-aratus-grc` / `plutarch-aratus-en` | Aratus | perseus-grc2 | perseus-eng2 | 54 | - |
| tlg064 | `plutarch-artaxerxes-grc` / `plutarch-artaxerxes-en` | Artaxerxes | perseus-grc2 | perseus-eng2 | 30 | - |
| tlg065 | `plutarch-galba-grc` / `plutarch-galba-en` | Galba | perseus-grc2 | perseus-eng2 | 29 | - |
| tlg066 | `plutarch-otho-grc` / `plutarch-otho-en` | Otho | perseus-grc2 | perseus-eng2 | 18 | - |

Total: 66 works, 1966 chapters (Greek), 132 editions.

## Unpaired Lives (no surviving Comparison)

Pyrrhus (tlg030) & Caius Marius (tlg031) are paired by tradition but no Comparison survives between them.
Alexander (tlg047) & Caesar (tlg048) are paired but no Comparison survives.
Phocion (tlg049), Cato the Younger (tlg050), Aratus (tlg063), Artaxerxes (tlg064), and Galba (tlg065) / Otho (tlg066) (paired with each other but no surviving Comparison) round out the corpus to 66.

## Double lives (book-level exception)

tlg051 (Agis and Cleomenes) and tlg052 (Tiberius and Caius Gracchus) use witnesses perseus-grc1/perseus-eng1 (not grc2/eng2) and carry an extra book-level Division per named part (Agis/Cleomenes; Tiberius/Caius), because the source restarts chapter numbering at 1 within each part. See scripts/import-plutarch-shared/workTable.ts `parts` and convert.ts.
