/**
 * Pulls all 13 generated `data/archimedes-<slug>/types.ts` files into the
 * `tsc --noEmit -p tsconfig.scripts.json` compilation graph.
 *
 * tsconfig.scripts.json's `include` list enumerates `scripts/**\/*.ts` plus a
 * few hand-picked `data/**\/*.ts` paths; it does not (and, per this project's
 * file-ownership rules, this importer cannot from here) list all 13
 * Archimedes work directories. This file lives under `scripts/**` - already
 * covered by that glob - and type-only-imports every one of the 13 generated
 * files, so each is pulled into the same compilation and checked exactly as
 * if it had been listed explicitly.
 *
 * Each import is "used" (and so never flagged by `noUnusedLocals`) by being a
 * member of the exported `AllArchimedesGenericWorkTypes` tuple below - a
 * type-level assertion, at zero runtime cost, that all 13 files continue to
 * export a `GenericWork` shape.
 *
 * Run `npm run import:archimedes` at least once before typechecking: these 13
 * files are generated output (committed to the repo, exactly like
 * data/isagoge-grc/types.ts), not present before the importer has run once on
 * a from-scratch clone.
 */

import type { GenericWork as SphereCylinder } from '../../data/archimedes-sphere-cylinder/types.ts';
import type { GenericWork as MeasurementCircle } from '../../data/archimedes-measurement-circle/types.ts';
import type { GenericWork as ConoidsSpheroids } from '../../data/archimedes-conoids-spheroids/types.ts';
import type { GenericWork as Spirals } from '../../data/archimedes-spirals/types.ts';
import type { GenericWork as PlaneEquilibrium } from '../../data/archimedes-plane-equilibrium/types.ts';
import type { GenericWork as SandReckoner } from '../../data/archimedes-sand-reckoner/types.ts';
import type { GenericWork as QuadratureParabola } from '../../data/archimedes-quadrature-parabola/types.ts';
import type { GenericWork as FloatingBodies } from '../../data/archimedes-floating-bodies/types.ts';
import type { GenericWork as Stomachion } from '../../data/archimedes-stomachion/types.ts';
import type { GenericWork as Method } from '../../data/archimedes-method/types.ts';
import type { GenericWork as LiberAssumptorum } from '../../data/archimedes-liber-assumptorum/types.ts';
import type { GenericWork as CattleProblem } from '../../data/archimedes-cattle-problem/types.ts';
import type { GenericWork as Fragments } from '../../data/archimedes-fragments/types.ts';

export type AllArchimedesGenericWorkTypes = [
  SphereCylinder,
  MeasurementCircle,
  ConoidsSpheroids,
  Spirals,
  PlaneEquilibrium,
  SandReckoner,
  QuadratureParabola,
  FloatingBodies,
  Stomachion,
  Method,
  LiberAssumptorum,
  CattleProblem,
  Fragments,
];
