// NOVA KEEP — the game loop and state machine. Wires input, audio, waves,
// upgrades and rendering together: title → playing → upgrade → victory /
// game over, with pause and restart on top of every state.
'use strict';

const NKGame = {
  state: 'title', // title | playing | upgrade | victory | gameover
  paused: false,
  time: 0,
  runTime: 0,
  wave: 0,
  coreHp: NK_CONFIG.CORE_MAX_HP,
  coreMaxHp: NK_CONFIG.CORE_MAX_HP,
  shield: 0,
  stats: null,
  aim: -Math.PI / 2,
  firing: false,
  fireAnim: 0,
  fireCooldown: 0,
  spawnQueue: [],
  spawnTimer: 0,
  enemies: [],
  bullets: [],
  particles: [],
  texts: [],
  score: 0,
  combo: 0,
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  shake: 0,
  bannerT: 0,
  bannerText: '',
  bannerSub: '',
  clearTimer: -1,
  choices: [],
  ownedUpgrades: {},
  upgradesTaken: 0,
  bestScore: 0,
  requestStart: false,
  requestRestart: false,
  requestChoice: -1,
  shotMode: false,
};

function nkLoadBest() {
  try {
    NKGame.bestScore = Number(window.localStorage.getItem('nova-keep-best') || 0) || 0;
  } catch (e) {
    NKGame.bestScore = 0;
  }
}

function nkSaveBest() {
  try {
    window.localStorage.setItem('nova-keep-best', String(NKGame.bestScore));
  } catch (e) { /* storage unavailable: best score just lives for the session */ }
}

function nkResetStats() {
  NKGame.stats = {
    fireRate: NK_CONFIG.TURRET.baseFireRate,
    damage: NK_CONFIG.TURRET.baseDamage,
    multishot: NK_CONFIG.TURRET.baseMultishot,
    pierce: NK_CONFIG.TURRET.basePierce,
    critChance: NK_CONFIG.TURRET.baseCritChance,
    shieldMax: 0,
    magnet: 0,
  };
}

function nkNewRun() {
  nkReseed((Date.now() % 2147483647) || 1);
  nkResetStats();
  NKGame.coreHp = NK_CONFIG.CORE_MAX_HP;
  NKGame.coreMaxHp = NK_CONFIG.CORE_MAX_HP;
  NKGame.shield = 0;
  NKGame.score = 0;
  NKGame.combo = 0;
  NKGame.kills = 0;
  NKGame.shotsFired = 0;
  NKGame.shotsHit = 0;
  NKGame.runTime = 0;
  NKGame.upgradesTaken = 0;
  NKGame.ownedUpgrades = {};
  NKGame.enemies = [];
  NKGame.bullets = [];
  NKGame.particles = [];
  NKGame.texts = [];
  NKGame.shake = 0;
  NKGame.paused = false;
  NKGame.clearTimer = -1;
  nkStartWave(1);
}

function nkStartWave(n) {
  NKGame.wave = n;
  NKGame.spawnQueue = NKWaves.buildWave(n, nkRng);
  NKGame.spawnTimer = 0.6;
  NKGame.state = 'playing';
  NKGame.bannerText = NKWaves.banner(n);
  NKGame.bannerSub = NKWaves.tip(n);
  NKGame.bannerT = 2.6;
  NKAudio.horn();
}

function nkFireVolley() {
  const g = NKGame;
  const a = g.aim;
  const n = g.stats.multishot;
  const spread = NK_CONFIG.TURRET.spread;
  for (let i = 0; i < n; i++) {
    const offset = (i - (n - 1) / 2) * spread;
    const crit = nkRng.next() < g.stats.critChance;
    const dmg = g.stats.damage * (crit ? NK_CONFIG.TURRET.critMultiplier : 1);
    const bx = NK_CONFIG.CORE_X + Math.cos(a + offset) * 44;
    const by = NK_CONFIG.CORE_Y + Math.sin(a + offset) * 44;
    g.bullets.push(NKEntities.makeBullet(bx, by, a + offset, dmg, g.stats.pierce, crit));
  }
  g.shotsFired += n;
  g.fireAnim = 0.08;
  NKAudio.shoot();
}

function nkBurst(x, y, color, count, speed, life, size) {
  NKGame.particles.push(...NKEntities.makeParticle(x, y, color, count, speed, life, size));
}

function nkAddScore(base, x, y) {
  const mult = 1 + NKGame.combo * NK_CONFIG.COMBO_STEP;
  const pts = Math.round(base * mult);
  NKGame.score += pts;
  NKGame.texts.push(NKEntities.makeFloatText(x, y, '+' + pts, '#ffd166', 16));
  return pts;
}

function nkKillEnemy(e) {
  const g = NKGame;
  g.kills += 1;
  g.combo += 1;
  nkAddScore(e.score, e.x, e.y - e.r - 6);
  nkBurst(e.x, e.y, e.color, e.type === 'boss' ? 60 : 16, e.type === 'boss' ? 420 : 260, 0.7, 3.5);
  if (e.type === 'boss') {
    g.shake = Math.min(NK_CONFIG.SHAKE_MAX, g.shake + 12);
    NKAudio.explode();
    g.texts.push(NKEntities.makeFloatText(e.x, e.y - 70, 'TITAN DOWN!', '#ff3b5b', 30));
  } else {
    g.shake = Math.min(NK_CONFIG.SHAKE_MAX, g.shake + 2.5);
    NKAudio.explode();
  }
  if (e.type === 'splitter') {
    for (const m of NKEntities.splitMinis(e, g.wave)) g.enemies.push(m);
  }
}

function nkDamageCore(dmg) {
  const g = NKGame;
  g.combo = 0;
  let rest = dmg;
  if (g.shield > 0) {
    const absorbed = Math.min(g.shield, rest);
    g.shield -= absorbed;
    rest -= absorbed;
  }
  g.coreHp -= rest;
  g.shake = Math.min(NK_CONFIG.SHAKE_MAX, g.shake + 8);
  nkBurst(NK_CONFIG.CORE_X, NK_CONFIG.CORE_Y, '#ff3b5b', 26, 320, 0.8, 4);
  NKAudio.coreHit();
  if (g.coreHp <= 0) {
    g.coreHp = 0;
    nkEndRun(false);
  }
}

function nkEndRun(won) {
  const g = NKGame;
  g.state = won ? 'victory' : 'gameover';
  g.enemies = [];
  g.bullets = [];
  if (g.score > g.bestScore) {
    g.bestScore = g.score;
    nkSaveBest();
  }
  if (won) NKAudio.victory(); else NKAudio.defeat();
}

function nkWaveCleared() {
  const g = NKGame;
  if (g.wave >= NK_CONFIG.TOTAL_WAVES) {
    g.texts.push(NKEntities.makeFloatText(NK_CONFIG.CORE_X, 260, 'THE VOID RETREATS', '#7df9ff', 28));
    nkEndRun(true);
    return;
  }
  g.bannerText = 'WAVE ' + g.wave + ' CLEARED';
  g.bannerSub = '';
  g.bannerT = 1.4;
  g.clearTimer = NK_CONFIG.BETWEEN_WAVE_DELAY;
}

function nkOpenUpgrade() {
  const g = NKGame;
  g.choices = NKUpgrades.draft(nkRng, g.ownedUpgrades);
  g.state = 'upgrade';
  NKAudio.upgrade();
}

function nkUpdatePlaying(dt) {
  const g = NKGame;
  g.runTime += dt;
  g.aim = NKInput.aimAngle();
  g.firing = NKInput.firing();
  if (g.fireAnim > 0) g.fireAnim -= dt;

  // Firing.
  g.fireCooldown -= dt;
  if (g.firing && g.fireCooldown <= 0) {
    nkFireVolley();
    g.fireCooldown = Math.max(g.fireCooldown + 1 / g.stats.fireRate, -0.05);
    if (g.fireCooldown < 0) g.fireCooldown = 0;
  }

  // Spawning.
  if (g.spawnQueue.length > 0) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      const type = g.spawnQueue.shift();
      g.enemies.push(NKEntities.spawnAtEdge(type, g.wave));
      g.spawnTimer = NK_CONFIG.spawnInterval(g.wave);
    }
  }

  // Shield regen.
  if (g.stats.shieldMax > 0 && g.shield < g.stats.shieldMax) {
    g.shield = Math.min(g.stats.shieldMax, g.shield + 2 * dt);
  }

  // Bullets.
  const magnetSlow = g.stats.magnet > 0;
  for (const b of g.bullets) NKEntities.stepBullet(b, dt);
  for (const b of g.bullets) {
    if (b.dead) continue;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      const rr = e.r + b.r;
      if (dx * dx + dy * dy < rr * rr) {
        g.shotsHit += 1;
        const killed = NKEntities.damageEnemy(e, b.damage);
        nkBurst(b.x, b.y, e.color, 4, 140, 0.3, 2.5);
        if (b.crit) g.texts.push(NKEntities.makeFloatText(e.x, e.y - e.r - 4, 'CRIT ' + Math.round(b.damage), '#ffd166', 15));
        NKAudio.hit();
        if (killed) nkKillEnemy(e);
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.dead = true;
        }
        break;
      }
    }
  }
  g.bullets = g.bullets.filter((b) => !b.dead);

  // Enemies.
  for (const e of g.enemies) {
    NKEntities.stepEnemy(e, dt, g.time, magnetSlow);
    if (e.hitCore) nkDamageCore(e.dmg);
  }
  g.enemies = g.enemies.filter((e) => !e.dead);

  // Particles and floating text.
  for (const p of g.particles) NKEntities.stepParticle(p, dt);
  g.particles = g.particles.filter((p) => p.life > 0);
  for (const f of g.texts) NKEntities.stepFloatText(f, dt);
  g.texts = g.texts.filter((f) => f.life > 0);

  if (g.bannerT > 0) g.bannerT -= dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 26);

  // Wave cleared?
  if (g.spawnQueue.length === 0 && g.enemies.length === 0) {
    if (g.clearTimer < 0) nkWaveCleared();
  }
  if (g.clearTimer > 0) {
    g.clearTimer -= dt;
    if (g.clearTimer <= 0) {
      g.clearTimer = -1;
      nkOpenUpgrade();
    }
  }
}

function nkUpdate(dt) {
  const g = NKGame;
  g.time += dt;

  // Global keys.
  if (NKInput.wasPressed('KeyM')) NKAudio.toggleMute();
  if (NKInput.wasPressed('KeyR') && g.state !== 'title') {
    nkNewRun();
    return;
  }
  if (NKInput.wasPressed('KeyP') && g.state === 'playing') {
    g.paused = !g.paused;
  }
  if (NKInput.wasPressed('Escape') && g.state === 'playing') {
    g.paused = !g.paused;
  }

  if (g.state === 'title') {
    if (NKInput.wasPressed('Enter') || NKInput.wasPressed('Space') || g.requestStart) {
      g.requestStart = false;
      NKAudio.ensure();
      nkNewRun();
    }
    return;
  }

  if (g.state === 'upgrade') {
    const pick = g.requestChoice;
    let idx = -1;
    if (pick >= 0) idx = pick;
    else if (NKInput.wasPressed('Digit1')) idx = 0;
    else if (NKInput.wasPressed('Digit2')) idx = 1;
    else if (NKInput.wasPressed('Digit3')) idx = 2;
    g.requestChoice = -1;
    if (idx >= 0 && idx < g.choices.length) {
      NKUpgrades.applyChoice(g, g.choices[idx]);
      NKAudio.upgrade();
      nkStartWave(g.wave + 1);
    }
    return;
  }

  if (g.state === 'victory' || g.state === 'gameover') {
    if (NKInput.wasPressed('Enter') || NKInput.wasPressed('Space') || g.requestRestart) {
      g.requestRestart = false;
      nkNewRun();
    }
    return;
  }

  // Playing.
  if (g.paused) {
    return; // the P / Escape toggle above already flipped it back
  }
  nkUpdatePlaying(dt);
}

function nkRender(ctx) {
  const g = NKGame;
  const shX = g.shake > 0 ? (nkRng.next() - 0.5) * g.shake : 0;
  const shY = g.shake > 0 ? (nkRng.next() - 0.5) * g.shake : 0;
  ctx.save();
  ctx.translate(shX, shY);
  NKRender.drawBackground(ctx, g.time, shX, shY);
  if (g.state === 'title') {
    NKRender.drawCore(ctx, g, g.time);
    NKRender.drawTitle(ctx, g, g.time);
    ctx.restore();
    return;
  }
  NKRender.drawCore(ctx, g, g.time);
  for (const e of g.enemies) NKRender.drawEnemy(ctx, e, g.time);
  for (const b of g.bullets) NKRender.drawBullet(ctx, b);
  NKRender.drawParticles(ctx, g.particles);
  NKRender.drawFloatTexts(ctx, g.texts);
  ctx.restore();
  if (g.state === 'playing' || g.state === 'upgrade') NKRender.drawHUD(ctx, g);
  if (g.state === 'upgrade') NKRender.drawUpgrade(ctx, g);
  if (g.state === 'victory') NKRender.drawEnd(ctx, g, true);
  if (g.state === 'gameover') NKRender.drawEnd(ctx, g, false);
  if (g.state === 'playing' && g.paused) NKRender.drawPaused(ctx, g);
}

function nkLoop(now) {
  const g = NKGame;
  const t = now / 1000;
  if (!nkLoop.last) nkLoop.last = t;
  let dt = Math.min(0.05, t - nkLoop.last);
  nkLoop.last = t;
  if (g.shotMode) {
    // Screenshot mode: one frozen frame, no simulation.
    nkRender(nkLoop.ctx);
    if (!window.__ready) window.__ready = true;
  } else {
    nkUpdate(dt);
    nkRender(nkLoop.ctx);
    NKInput.endFrame();
  }
  requestAnimationFrame(nkLoop);
}

function nkBoot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  nkLoop.ctx = ctx;
  nkLoadBest();
  nkResetStats();
  NKInput.init(canvas);
  // Deterministic screenshot states (?shot=start|play|upgrade|end&seed=N).
  const params = new URLSearchParams(window.location.search);
  if (params.has('shot')) {
    NKGame.shotMode = true;
    NKShots.setup(params.get('shot'), Number(params.get('seed') || 1));
    nkRender(ctx);
    window.__ready = true;
  }
  requestAnimationFrame(nkLoop);
}

nkBoot();
