// NOVA KEEP — the things that move: the turret, bolts, void creatures,
// particles and floating score text. Factories build them, step functions
// advance them one frame, and nothing here draws anything (see render.js).
'use strict';

const NKEntities = {
  // A bolt fired from the core's turret.
  makeBullet(x, y, angle, damage, pierce, crit) {
    const sp = NK_CONFIG.TURRET.bulletSpeed;
    return {
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      damage,
      pierce, // how many more enemies this bolt may pass through
      crit,
      life: NK_CONFIG.TURRET.bulletLife,
      r: NK_CONFIG.TURRET.bulletRadius,
      dead: false,
    };
  },

  stepBullet(b, dt) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) b.dead = true;
    if (b.x < -20 || b.x > NK_CONFIG.W + 20 || b.y < -20 || b.y > NK_CONFIG.H + 20) b.dead = true;
  },

  // A void creature. `type` picks its stats from the config catalogue.
  makeEnemy(type, x, y, wave) {
    const base = NK_CONFIG.ENEMIES[type];
    const hpScale = 1 + NK_CONFIG.HP_SCALE_PER_WAVE * (wave - 1);
    const e = {
      type,
      x, y,
      r: base.r,
      hp: Math.round(base.hp * hpScale),
      maxHp: Math.round(base.hp * hpScale),
      speed: base.speed * nkRng.range(0.92, 1.08),
      dmg: base.dmg,
      score: base.score,
      color: base.color,
      angle: Math.atan2(NK_CONFIG.CORE_Y - y, NK_CONFIG.CORE_X - x),
      wobble: nkRng.range(0, Math.PI * 2),
      wobbleSpeed: nkRng.range(1.5, 3.5),
      shield: type === 'warden' ? Math.round(base.hp * 0.5) : 0,
      maxShield: type === 'warden' ? Math.round(base.hp * 0.5) : 0,
      flash: 0, // white hit-flash timer
      dead: false,
      hitCore: false,
      slow: 0, // magnet slow timer
    };
    return e;
  },

  // Spawn just outside a random screen edge, aimed at the core.
  spawnAtEdge(type, wave) {
    const W = NK_CONFIG.W, H = NK_CONFIG.H;
    const side = nkRng.int(0, 3);
    let x, y;
    if (side === 0) { x = nkRng.range(0, W); y = -30; }
    else if (side === 1) { x = W + 30; y = nkRng.range(0, H); }
    else if (side === 2) { x = nkRng.range(0, W); y = H + 30; }
    else { x = -30; y = nkRng.range(0, H); }
    return this.makeEnemy(type, x, y, wave);
  },

  stepEnemy(e, dt, time, magnetSlow) {
    if (e.flash > 0) e.flash -= dt;
    if (e.slow > 0) e.slow -= dt;
    const dx = NK_CONFIG.CORE_X - e.x;
    const dy = NK_CONFIG.CORE_Y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    let vx = (dx / dist) * e.speed;
    let vy = (dy / dist) * e.speed;
    // Darters weave side to side; minis jitter.
    if (e.type === 'darter' || e.type === 'mini') {
      const wob = Math.sin(time * e.wobbleSpeed + e.wobble) * 0.7;
      vx += -dy / dist * wob * e.speed * 0.5;
      vy += dx / dist * wob * e.speed * 0.5;
    }
    // The magnet upgrade drags nearby enemies into a slow crawl.
    const slowFactor = (e.slow > 0 || magnetSlow) ? 0.55 : 1;
    e.x += vx * slowFactor * dt;
    e.y += vy * slowFactor * dt;
    e.angle = Math.atan2(dy, dx);
    // Reached the core: it bites, then bursts.
    if (dist < NK_CONFIG.CORE_R + e.r * 0.6) {
      e.hitCore = true;
      e.dead = true;
    }
  },

  // Damage an enemy; returns true if the hit killed it.
  damageEnemy(e, dmg) {
    if (e.shield > 0) {
      const absorbed = Math.min(e.shield, dmg);
      e.shield -= absorbed;
      dmg -= absorbed;
    }
    e.hp -= dmg;
    e.flash = 0.09;
    if (e.hp <= 0) {
      e.dead = true;
      return true;
    }
    return false;
  },

  // Splitter death: two minis burst out of the husk.
  splitMinis(e, wave) {
    const minis = [];
    for (let i = 0; i < 2; i++) {
      const m = this.makeEnemy('mini', e.x + nkRng.range(-14, 14), e.y + nkRng.range(-14, 14), wave);
      minis.push(m);
    }
    return minis;
  },

  // A glowing spark: position, velocity, life, colour, size.
  makeParticle(x, y, color, count, speed, life, size) {
    const parts = [];
    for (let i = 0; i < count; i++) {
      const a = nkRng.angle();
      const s = nkRng.range(speed * 0.3, speed);
      parts.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: nkRng.range(life * 0.5, life),
        maxLife: life,
        color,
        size: nkRng.range(size * 0.5, size * 1.4),
        drag: 0.92,
      });
    }
    return parts;
  },

  stepParticle(p, dt) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.life -= dt;
  },

  // Floating "+120" text that rises and fades.
  makeFloatText(x, y, text, color, size) {
    return { x, y, text, color, size: size || 16, life: 0.9, maxLife: 0.9 };
  },

  stepFloatText(f, dt) {
    f.y -= 42 * dt;
    f.life -= dt;
  },
};
