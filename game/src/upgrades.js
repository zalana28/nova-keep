// NOVA KEEP — the upgrade draft between waves. Three cards are drawn from
// the pool (no repeats in one draft); the player picks one and its effect
// applies to the run's stats immediately.
'use strict';

const NKUpgrades = {
  // id, name, one-line pitch, and the stat it changes. `max` caps stacking.
  POOL: [
    {
      id: 'firerate', name: 'Overclock', icon: '»', max: 5,
      desc: '+25% fire rate. More bolts, more often.',
      apply: (s) => { s.stats.fireRate *= 1.25; },
    },
    {
      id: 'damage', name: 'Heavy Bolts', icon: '◆', max: 5,
      desc: '+30% bolt damage. Punch through the big ones.',
      apply: (s) => { s.stats.damage *= 1.3; },
    },
    {
      id: 'multishot', name: 'Split Cannon', icon: '✦', max: 3,
      desc: '+1 bolt per shot, fanned out.',
      apply: (s) => { s.stats.multishot += 1; },
    },
    {
      id: 'piercing', name: 'Lance Rounds', icon: '→', max: 3,
      desc: 'Bolts pass through +1 enemy each.',
      apply: (s) => { s.stats.pierce += 1; },
    },
    {
      id: 'repair', name: 'Core Patch', icon: '+', max: 99,
      desc: 'Restore 40 core HP right now.',
      apply: (s) => { s.coreHp = Math.min(s.coreMaxHp, s.coreHp + 40); },
    },
    {
      id: 'shield', name: 'Aegis Ring', icon: '○', max: 3,
      desc: '+25 max shield that regens 2 HP/s.',
      apply: (s) => { s.stats.shieldMax += 25; s.shield = Math.min(s.stats.shieldMax, s.shield + 25); },
    },
    {
      id: 'magnet', name: 'Gravity Well', icon: '◎', max: 2,
      desc: 'Enemies near the core crawl at half speed.',
      apply: (s) => { s.stats.magnet += 1; },
    },
    {
      id: 'crit', name: 'Deadeye', icon: '✕', max: 4,
      desc: '+10% crit chance. Crits deal double damage.',
      apply: (s) => { s.stats.critChance += 0.1; },
    },
  ],

  // Draw `count` distinct upgrades the player can still take.
  draft(rng, owned) {
    const available = this.POOL.filter((u) => (owned[u.id] || 0) < u.max);
    const picks = [];
    const bag = available.slice();
    while (picks.length < NK_CONFIG.UPGRADE_CHOICES && bag.length > 0) {
      const i = Math.floor(rng.next() * bag.length);
      picks.push(bag.splice(i, 1)[0]);
    }
    // If the pool is exhausted (very long runs), fall back to a repair card.
    while (picks.length < NK_CONFIG.UPGRADE_CHOICES) picks.push(this.POOL[4]);
    return picks;
  },

  // Apply a chosen card to the run state and record it as owned.
  applyChoice(game, upgrade) {
    upgrade.apply(game);
    game.ownedUpgrades[upgrade.id] = (game.ownedUpgrades[upgrade.id] || 0) + 1;
    game.upgradesTaken += 1;
  },
};
