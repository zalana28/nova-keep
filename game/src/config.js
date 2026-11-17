// NOVA KEEP — tuning constants. Every number that shapes the game lives here
// so the feel can be re-balanced without touching the logic files.
'use strict';

const NK_CONFIG = {
  // Canvas the game is drawn on (fixed internal resolution, scaled by CSS).
  W: 1280,
  H: 720,
  CORE_X: 640,
  CORE_Y: 360,
  CORE_R: 34,
  CORE_MAX_HP: 100,

  // The star-core's turret.
  TURRET: {
    baseFireRate: 6, // shots per second
    baseDamage: 10,
    bulletSpeed: 760,
    bulletRadius: 5,
    bulletLife: 1.4, // seconds before a bolt fizzles
    baseMultishot: 1,
    basePierce: 0,
    baseCritChance: 0.05,
    critMultiplier: 2,
    spread: 0.14, // radians between multishot bolts
  },

  // Enemy catalogue: silhouette, colour, health, speed, size, core damage, score.
  ENEMIES: {
    drifter: { hp: 34, speed: 55, r: 18, dmg: 8, score: 50, color: '#ffb347', name: 'Drifter' },
    darter: { hp: 12, speed: 155, r: 11, dmg: 5, score: 40, color: '#ff4fd8', name: 'Darter' },
    splitter: { hp: 26, speed: 78, r: 16, dmg: 8, score: 60, color: '#7CFC9A', name: 'Splitter' },
    mini: { hp: 8, speed: 125, r: 8, dmg: 4, score: 20, color: '#7CFC9A', name: 'Mini' },
    warden: { hp: 95, speed: 38, r: 24, dmg: 15, score: 120, color: '#b78cff', name: 'Warden' },
    boss: { hp: 950, speed: 28, r: 56, dmg: 30, score: 1000, color: '#ff3b5b', name: 'Void Titan' },
  },

  // Health grows a little every wave so late waves stay dangerous.
  HP_SCALE_PER_WAVE: 0.12,

  // How many waves the run lasts. Survive them all to win.
  TOTAL_WAVES: 10,

  // Spawn pacing: seconds between spawns, shrinking as waves climb.
  spawnInterval: (wave) => Math.max(0.28, 0.95 - wave * 0.055),

  // Seconds of calm between the wave-clear banner and the upgrade draft.
  BETWEEN_WAVE_DELAY: 1.2,

  // Combo: each kill without the core taking a hit raises the multiplier.
  COMBO_STEP: 0.05,
  COMBO_MAX: 3.0,

  // Screen shake caps so big explosions stay readable.
  SHAKE_MAX: 14,

  // Palette: neon on deep navy.
  PALETTE: {
    bgTop: '#050818',
    bgBottom: '#0a1030',
    nebulaA: 'rgba(64, 32, 140, 0.35)',
    nebulaB: 'rgba(8, 120, 140, 0.28)',
    nebulaC: 'rgba(160, 32, 96, 0.22)',
    core: '#7df9ff',
    coreRing: '#22d3ee',
    text: '#eaf6ff',
    dim: '#9db8d6',
    gold: '#ffd166',
    danger: '#ff3b5b',
    panel: 'rgba(8, 14, 38, 0.88)',
    panelEdge: 'rgba(125, 249, 255, 0.45)',
  },

  // Upgrade draft: three cards, pick one.
  UPGRADE_CHOICES: 3,
};
