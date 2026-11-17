// NOVA KEEP — wave definitions and the spawner. Each wave is a queue of
// enemy types dealt in a shuffled order; waves 5 and 10 end with a boss.
'use strict';

const NKWaves = {
  // The mix an ordinary wave of number `n` is built from.
  composition(n) {
    const list = [];
    const drifters = 4 + n;
    const darters = n >= 2 ? 2 + n : 0;
    const splitters = n >= 3 ? 1 + Math.floor(n / 2) : 0;
    const wardens = n >= 4 ? Math.floor(n / 2) : 0;
    for (let i = 0; i < drifters; i++) list.push('drifter');
    for (let i = 0; i < darters; i++) list.push('darter');
    for (let i = 0; i < splitters; i++) list.push('splitter');
    for (let i = 0; i < wardens; i++) list.push('warden');
    return list;
  },

  // Build the spawn queue for wave `n`: shuffled mix, boss last on 5 and 10.
  buildWave(n, rng) {
    const queue = this.composition(n);
    // Fisher-Yates shuffle with the run's seeded RNG.
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
    if (n === 5 || n === 10) queue.push('boss');
    return queue;
  },

  // How many enemies a wave holds in total (queue length at build time).
  totalFor(n) {
    let total = this.composition(n).length;
    if (n === 5 || n === 10) total += 1;
    return total;
  },

  // Human line shown on the wave banner.
  banner(n) {
    if (n === 5 || n === 10) return 'WAVE ' + n + ' — THE VOID TITAN AWAKENS';
    if (n === 1) return 'WAVE 1 — THEY COME FOR THE LIGHT';
    return 'WAVE ' + n;
  },

  // New enemy flavours introduced on this wave (shown as a tip line).
  tip(n) {
    if (n === 2) return 'New: Darters — fast and fragile. Lead your shots.';
    if (n === 3) return 'New: Splitters — they burst into two minis when killed.';
    if (n === 4) return 'New: Wardens — shielded. Break the ring first.';
    if (n === 5) return 'The Void Titan has come. Aim for the big one.';
    if (n === 10) return 'Final wave. The Titan returns — hold the line.';
    return '';
  },
};
