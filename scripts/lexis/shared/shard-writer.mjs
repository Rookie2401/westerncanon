// Shared lex/<lang>/*.json shard writer (docs/LEXIS-PLAN.md §2): groups LexEntry records by
// `shardPrefix()` (scripts/lexis/lib.mjs — a 2-char plain-lemma prefix), splitting any group over
// ~250 KB into longer prefixes (3, 4, … chars of the plain lemma) so the client's longest-prefix
// resolution against the manifest still finds the right file. Used by build-latin.mjs and
// build-italian.mjs so the two language packages shard identically.
//
// COORDINATOR FIX (2026-09-24): the client resolves a lexeme's shard by trying decreasing-length
// PREFIXES of its plain lemma against the manifest (longest first) — it never guesses a "-N"
// suffix or a padded "_" character that isn't actually part of the lemma. An oversized shard must
// therefore split by EXTENDING the prefix with the lemma's own next real character (κα -> κατ,
// καλ, καρ…), and an entry whose plain lemma is SHORTER than the new depth (nothing to extend
// with) must stay behind in the shorter prefix's own shard file, which must then still exist as
// its own file rather than being absorbed into a padded child. `plainLemma` is exported so
// scripts/lexis/shared/check-bundles.mjs can replay the exact same resolution the client does.
// The client's own resolver only ever tries prefix lengths 4, 3, 2, 1, then "_" (coordinator: "I
// am updating the client resolver in parallel to try prefixes 4→1 then _") — so maxDepth here MUST
// stay 4; a 5+-character shard filename would be unreachable by any real lookup.
import fs from 'node:fs';
import path from 'node:path';
import { shardPrefix } from '../lib.mjs';

export function plainLemma(id) {
  return id
    .split(':')
    .slice(2)
    .join(':')
    .replace(/#\d+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ς/g, 'σ'); // matches shardPrefix()'s own fold (lib.mjs), so a deeper split never diverges from the 2-char root
}

/** Writes `entries` (each a LexEntry with `.id`/`.lemma`) into lexDir, clearing any stale shard
 * files first. Returns the list of shard filenames written. */
/** Windows refuses files whose stem is a legacy device name (aux.json, con.json...), and git
 *  cannot open them - such prefixes (Latin aux-, con-) get a trailing "_" in the FILE name only;
 *  the manifest keeps the bare prefix as the key (build-manifest.mjs strips the escape). */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
export function shardFileStem(prefix) {
  return RESERVED.test(prefix) ? `${prefix}_` : prefix;
}
export function shardPrefixOfFile(file) {
  const stem = file.replace(/\.json$/, '');
  return stem !== '_' && /_$/.test(stem) && RESERVED.test(stem.slice(0, -1)) ? stem.slice(0, -1) : stem;
}

export function writeLexShards(lexDir, entries, { maxBytes = 250 * 1024, maxDepth = 4 } = {}) {
  fs.mkdirSync(lexDir, { recursive: true });
  for (const f of fs.readdirSync(lexDir)) fs.unlinkSync(path.join(lexDir, f));

  function writeFile(prefix, list) {
    const obj = {};
    for (const e of list) obj[e.id] = e;
    fs.writeFileSync(path.join(lexDir, `${shardFileStem(prefix)}.json`), JSON.stringify(obj));
  }

  function writeShardTree(prefix, list, depth) {
    const bytes = Buffer.byteLength(JSON.stringify(Object.fromEntries(list.map((e) => [e.id, e]))));
    if (bytes <= maxBytes || depth >= maxDepth || list.length <= 1) {
      writeFile(prefix, list);
      return;
    }
    const stay = []; // plain lemma has no character at `depth`: nothing to extend the prefix with
    const sub = new Map(); // subPrefix (prefix + next real character) -> entries
    for (const e of list) {
      const plain = plainLemma(e.id);
      const ch = plain[depth];
      if (ch === undefined) {
        stay.push(e);
        continue;
      }
      const subPrefix = prefix + ch;
      (sub.get(subPrefix) ?? sub.set(subPrefix, []).get(subPrefix)).push(e);
    }
    if (stay.length) writeFile(prefix, stay); // the shorter prefix's own shard must still exist
    for (const [subPrefix, sublist] of sub) writeShardTree(subPrefix, sublist, depth + 1);
  }

  const byPrefix2 = new Map();
  for (const e of entries) {
    const p = shardPrefix(e.id);
    (byPrefix2.get(p) ?? byPrefix2.set(p, []).get(p)).push(e);
  }
  for (const [prefix, list] of byPrefix2) writeShardTree(prefix, list, 2);
  return fs.readdirSync(lexDir);
}
