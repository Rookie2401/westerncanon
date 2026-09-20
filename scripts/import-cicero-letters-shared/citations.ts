/**
 * Shared citation strings for the Cicero letters-selection importers,
 * transcribed verbatim from each work's own __cts__.xml
 * (raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/
 * phi0474/phi0NN/__cts__.xml), fetched and inspected directly - not
 * assumed identical across the four collections (they are not: three
 * different Purser volumes and two different years).
 */

export const SHUCKBURGH_CITATION =
  'Evelyn S. Shuckburgh, trans., The Letters of Cicero: The Whole Extant Correspondence in Chronological Order (London: George Bell & Sons, 1899–1900).';

export const SHUCKBURGH_LICENSE =
  'Shuckburgh’s 1899–1900 translation is in the public domain (published well over 95 years ago). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export const PURSER_LICENSE =
  'Purser’s critical Latin text is a scholarly edition of a text in the public domain (Cicero, d. 43 BC). The digital transcription is distributed by the Perseus Digital Library / OpenGreekAndLatin canonical-latinLit under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).';

export const PURSER_CITATIONS: Record<'phi056' | 'phi057' | 'phi058' | 'phi059', string> = {
  phi057: 'Cicero. Ciceronis, M. Tullius. Epistulae, Vol. II. Pars Prior and Pars Posterior. Purser, Louis Claude, editor. Oxford: Clarendon Press, 1903.',
  phi056: 'Cicero. Ciceronis, M. Tullius. Epistulae, Vol. 1. Purser, Louis Claude, editor. Oxford: Clarendon Press, 1901.',
  phi058: 'Cicero. Ciceronis, M. Tullius. Epistulae, Vol. III. Purser, Louis Claude, editor. Oxford: Clarendon Press, 1901.',
  phi059: 'Cicero. Ciceronis, M. Tullius. Epistulae, Vol. III. Purser, Louis Claude, editor. Oxford: Clarendon Press, 1901.',
};
