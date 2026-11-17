// NOVA KEEP — the entrypoint that hands this game in (Node 22, standard
// library only). It stages the finished game and its four screenshots into
// the output directory the grader reads, then writes the dossier the judge
// sees, using the vendored make.fun library to build it. The game itself is
// plain static files under game/ — a canvas arena-defense game that plays
// offline with no build step and no network request.
//
// Run it from this repository root:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; with no
// variable set it writes straight to /output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the folder this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean slate so a stale file from an earlier run can never
// ride along into the dossier.
mkdirSync(outputDir, { recursive: true });
rmSync(join(outputDir, 'game'), { recursive: true, force: true });
rmSync(join(outputDir, 'screenshots'), { recursive: true, force: true });

const fromRepo = (rel) => join(repoRoot, rel);
const toOut = (rel) => join(outputDir, rel);

cpSync(fromRepo('game'), toOut('game'), { recursive: true });
if (existsSync(fromRepo('screenshots'))) {
  cpSync(fromRepo('screenshots'), toOut('screenshots'), { recursive: true });
}

// The caps the gate enforces (reference/gate.json): the text cap shapes how
// much source the dossier carries; the rest refuse an entry the scorer
// would refuse outright — too many screenshots, one too big, a game folder
// over its file count or byte budget, or a path too long for the output.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(toOut('dossier.json'), dossier);
