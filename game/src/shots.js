// NOVA KEEP — deterministic screenshot states. Reads ?shot= and &seed= from
// the URL and stages one exact, frozen frame for the bounty screenshots:
//   start   — the title screen
//   play    — mid-wave 4, HUD up, enemies, bolts and particles in flight
//   upgrade — the between-wave draft with three cards
//   end     — the victory screen with final results
// The main loop renders the staged frame and flips window.__ready on.
'use strict';

const NKShots = {
  setup(kind, seed) {
    const g = NKGame;
    nkReseed(seed || 1);
    g.time = 2.5; // fixed clock so pulsing and twinkle never vary
    nkResetStats();
    if (kind === 'start') {
      g.state = 'title';
      return;
    }
    if (kind === 'play') {
      this.stagePlay(g, seed || 1);
      return;
    }
    if (kind === 'upgrade') {
      this.stageUpgrade(g, seed || 1);
      return;
    }
    if (kind === 'end') {
      this.stageEnd(g, seed || 1);
      return;
    }
    g.state = 'title';
  },

  // Mid-wave 4: a busy arena with every enemy flavour on screen.
  stagePlay(g, seed) {
    nkReseed(seed);
    g.state = 'playing';
    g.wave = 4;
    g.score = 2450;
    g.combo = 12;
    g.kills = 31;
    g.shotsFired = 210;
    g.shotsHit = 168;
    g.runTime = 187;
    g.coreHp = 78;
    g.coreMaxHp = 100;
    g.shield = 12;
    g.stats.shieldMax = 25;
    g.stats.multishot = 2;
    g.stats.pierce = 1;
    g.aim = -0.6;
    g.firing = true;
    g.fireAnim = 0.05;
    g.bannerText = 'WAVE 4';
    g.bannerSub = 'New: Wardens — shielded. Break the ring first.';
    g.bannerT = 1.0;
    g.spawnQueue = ['drifter', 'darter', 'splitter', 'drifter', 'warden', 'darter'];
    const spots = [
      ['drifter', 250, 180], ['darter', 1010, 150], ['splitter', 880, 520],
      ['warden', 320, 520], ['darter', 1080, 380], ['drifter', 180, 380],
      ['mini', 950, 250], ['drifter', 430, 240], ['darter', 700, 590],
      ['splitter', 210, 570],
    ];
    g.enemies = spots.map(([type, x, y]) => {
      const e = NKEntities.makeEnemy(type, x, y, 4);
      if (type === 'warden') e.shield = 20;
      if (type === 'drifter') e.hp = Math.round(e.maxHp * 0.6);
      return e;
    });
    // A fan of bolts mid-flight from the turret toward the aim.
    for (let i = 0; i < 5; i++) {
      const d = 90 + i * 46;
      g.bullets.push(NKEntities.makeBullet(
        NK_CONFIG.CORE_X + Math.cos(g.aim) * d,
        NK_CONFIG.CORE_Y + Math.sin(g.aim) * d,
        g.aim, 13, 1, i === 2,
      ));
    }
    g.particles.push(...NKEntities.makeParticle(880, 520, '#7CFC9A', 14, 240, 0.7, 3.5));
    g.particles.push(...NKEntities.makeParticle(1010, 150, '#ff4fd8', 10, 200, 0.6, 3));
    g.texts.push(NKEntities.makeFloatText(880, 480, '+90', '#ffd166', 17));
    g.texts.push(NKEntities.makeFloatText(1010, 120, 'CRIT 26', '#ffd166', 15));
  },

  // Between waves: wave 4 cleared, three upgrade cards on the table.
  stageUpgrade(g, seed) {
    nkReseed(seed);
    g.state = 'upgrade';
    g.wave = 4;
    g.score = 3120;
    g.combo = 0;
    g.coreHp = 64;
    g.coreMaxHp = 100;
    g.shield = 0;
    g.runTime = 244;
    g.choices = NKUpgrades.draft(nkRng, {});
    g.bannerText = '';
    g.bannerSub = '';
    g.bannerT = 0;
  },

  // The run is won: full results panel, new best score.
  stageEnd(g, seed) {
    nkReseed(seed);
    g.state = 'victory';
    g.wave = 10;
    g.score = 18420;
    g.kills = 214;
    g.shotsFired = 1420;
    g.shotsHit = 1103;
    g.runTime = 512;
    g.coreHp = 42;
    g.coreMaxHp = 100;
    g.bestScore = 18420;
    g.upgradesTaken = 9;
  },
};
