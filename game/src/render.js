// NOVA KEEP — every pixel the player sees. Background, core, creatures,
// bolts, particles, HUD and all four screens. Drawing only: no game logic.
'use strict';

const NKRender = {
  // Fixed starfield, seeded once so the sky never flickers between frames.
  stars: (() => {
    const rng = nkMakeRng(1337);
    const list = [];
    for (let i = 0; i < 170; i++) {
      list.push({
        x: rng.range(0, NK_CONFIG.W),
        y: rng.range(0, NK_CONFIG.H),
        r: rng.range(0.6, 2.2),
        depth: rng.range(0.25, 1), // parallax factor
        tw: rng.range(0, Math.PI * 2),
        twSpeed: rng.range(0.5, 2.5),
      });
    }
    return list;
  })(),

  // Soft nebula blobs, fixed positions.
  nebulae: [
    { x: 220, y: 150, r: 260, color: 'rgba(64, 32, 140, 0.30)' },
    { x: 1060, y: 560, r: 300, color: 'rgba(8, 120, 140, 0.24)' },
    { x: 980, y: 110, r: 200, color: 'rgba(160, 32, 96, 0.20)' },
    { x: 180, y: 620, r: 220, color: 'rgba(20, 60, 160, 0.20)' },
  ],

  drawBackground(ctx, time, shakeX, shakeY) {
    const W = NK_CONFIG.W, H = NK_CONFIG.H;
    const P = NK_CONFIG.PALETTE;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, P.bgTop);
    grad.addColorStop(1, P.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    for (const n of this.nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    // Parallax stars drift a touch with the shake, twinkle with time.
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(time * s.twSpeed + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath();
      ctx.arc(s.x + shakeX * s.depth * 0.4, s.y + shakeY * s.depth * 0.4, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // The star-core: pulsing orb, two orbit rings, glow.
  drawCore(ctx, game, time) {
    const cx = NK_CONFIG.CORE_X, cy = NK_CONFIG.CORE_Y;
    const pulse = 1 + Math.sin(time * 2.4) * 0.05;
    const lowHp = game.coreHp / game.coreMaxHp < 0.3;
    const coreColor = lowHp ? '#ff5b6e' : NK_CONFIG.PALETTE.core;
    ctx.save();
    ctx.shadowBlur = 34;
    ctx.shadowColor = coreColor;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, NK_CONFIG.CORE_R * pulse);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, coreColor);
    g.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, NK_CONFIG.CORE_R * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Orbit rings.
    for (let i = 0; i < 2; i++) {
      const rr = NK_CONFIG.CORE_R + 14 + i * 12;
      ctx.save();
      ctx.strokeStyle = i === 0 ? 'rgba(125,249,255,0.55)' : 'rgba(255,79,216,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, time * (0.6 + i * 0.3), time * (0.6 + i * 0.3) + Math.PI * 1.4);
      ctx.stroke();
      ctx.restore();
    }
    // Turret barrel, aimed at the pointer.
    const a = game.aim;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = '#0b1533';
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(30, -5);
    ctx.lineTo(38, 0);
    ctx.lineTo(30, 5);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Muzzle glow while firing.
    if (game.firing && game.fireAnim > 0) {
      const mx = cx + Math.cos(a) * 42, my = cy + Math.sin(a) * 42;
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#7df9ff';
      ctx.fillStyle = '#d9fbff';
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  drawEnemy(ctx, e, time) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    const flash = e.flash > 0;
    const body = flash ? '#ffffff' : e.color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = e.color;
    ctx.fillStyle = body;
    ctx.strokeStyle = body;
    ctx.lineWidth = 2;
    if (e.type === 'drifter') {
      // Slow hexagon tank.
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + time * 0.4;
        const px = Math.cos(a) * e.r, py = Math.sin(a) * e.r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(5,8,24,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'darter') {
      // Fast dart: sharp triangle with swept wings.
      ctx.beginPath();
      ctx.moveTo(e.r * 1.5, 0);
      ctx.lineTo(-e.r, -e.r * 0.8);
      ctx.lineTo(-e.r * 0.4, 0);
      ctx.lineTo(-e.r, e.r * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'splitter' || e.type === 'mini') {
      // Spiky orb that bursts into minis.
      ctx.beginPath();
      const spikes = e.type === 'mini' ? 5 : 8;
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? e.r : e.r * 0.55;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'warden') {
      // Armoured square with a shield ring.
      ctx.beginPath();
      ctx.rect(-e.r * 0.8, -e.r * 0.8, e.r * 1.6, e.r * 1.6);
      ctx.fill();
      ctx.fillStyle = 'rgba(5,8,24,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (e.shield > 0) {
        ctx.strokeStyle = 'rgba(183,140,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, e.r + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (e.type === 'boss') {
      // The Void Titan: big jagged star with a burning eye.
      ctx.beginPath();
      for (let i = 0; i < 10 * 2; i++) {
        const a = (i / 20) * Math.PI * 2 + Math.sin(time * 0.8) * 0.08;
        const rr = i % 2 === 0 ? e.r : e.r * 0.62;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#ff3b5b';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3b5b';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Health bar above anything hurt.
    if (e.hp < e.maxHp || e.type === 'boss') {
      const w = e.type === 'boss' ? 110 : e.r * 2;
      const y = e.y - e.r - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - w / 2, y, w, 5);
      ctx.fillStyle = e.type === 'boss' ? '#ff3b5b' : e.color;
      ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  },

  drawBullet(ctx, b) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = b.crit ? '#ffd166' : '#7df9ff';
    ctx.strokeStyle = b.crit ? '#ffd166' : '#a5f3fc';
    ctx.lineWidth = b.crit ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.crit ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawParticles(ctx, parts) {
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  drawFloatTexts(ctx, texts) {
    ctx.textAlign = 'center';
    for (const f of texts) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.font = 'bold ' + f.size + 'px Verdana, sans-serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  },

  // Small rounded panel used by HUD chips and menus.
  panel(ctx, x, y, w, h) {
    const P = NK_CONFIG.PALETTE;
    ctx.fillStyle = P.panel;
    ctx.strokeStyle = P.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
  },

  // Clickable button; returns true when the click lands on it this frame.
  button(ctx, x, y, w, h, label, accent) {
    const hovered = NKInput.mouseX >= x && NKInput.mouseX <= x + w &&
      NKInput.mouseY >= y && NKInput.mouseY <= y + h;
    ctx.fillStyle = hovered ? 'rgba(34,211,238,0.35)' : 'rgba(34,211,238,0.14)';
    ctx.strokeStyle = accent || '#7df9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 20px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    return NKInput.clickedIn(x, y, w, h);
  },

  drawHUD(ctx, game) {
    const P = NK_CONFIG.PALETTE;
    const W = NK_CONFIG.W;
    ctx.textAlign = 'left';
    // Top-left: score + combo.
    ctx.fillStyle = P.text;
    ctx.font = 'bold 26px Verdana, sans-serif';
    ctx.fillText('SCORE ' + game.score.toLocaleString('en-US'), 24, 38);
    const mult = (1 + game.combo * NK_CONFIG.COMBO_STEP).toFixed(2);
    ctx.font = 'bold 16px Verdana, sans-serif';
    ctx.fillStyle = game.combo >= 10 ? P.gold : P.dim;
    ctx.fillText('COMBO x' + mult + '  (' + game.combo + ' kills)', 24, 62);
    // Top-centre: wave + enemies left.
    ctx.textAlign = 'center';
    ctx.fillStyle = P.text;
    ctx.font = 'bold 24px Verdana, sans-serif';
    ctx.fillText('WAVE ' + game.wave + ' / ' + NK_CONFIG.TOTAL_WAVES, W / 2, 36);
    ctx.font = '16px Verdana, sans-serif';
    ctx.fillStyle = P.dim;
    const left = game.spawnQueue.length + game.enemies.length;
    ctx.fillText(left + ' void creatures remain', W / 2, 60);
    // Top-right: pause + mute buttons.
    ctx.textAlign = 'left';
    const muteLabel = NKAudio.muted ? 'SOUND OFF' : 'SOUND ON';
    if (this.button(ctx, W - 250, 16, 110, 34, 'II PAUSE')) game.paused = true;
    if (this.button(ctx, W - 132, 16, 110, 34, muteLabel)) NKAudio.toggleMute();
    // Bottom-centre: core HP bar (+ shield).
    const bw = 420, bx = (W - bw) / 2, by = NK_CONFIG.H - 44;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(bx - 4, by - 4, bw + 8, 26, 8);
    ctx.fill();
    const hpFrac = Math.max(0, game.coreHp / game.coreMaxHp);
    const hpGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    hpGrad.addColorStop(0, hpFrac < 0.3 ? '#ff3b5b' : '#22d3ee');
    hpGrad.addColorStop(1, hpFrac < 0.3 ? '#ff7a5b' : '#7df9ff');
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw * hpFrac, 18, 6);
    ctx.fill();
    if (game.shield > 0) {
      ctx.fillStyle = 'rgba(183,140,255,0.85)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw * Math.min(1, game.shield / game.stats.shieldMax), 18, 6);
      ctx.fill();
    }
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 14px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CORE ' + Math.ceil(game.coreHp) + ' / ' + game.coreMaxHp +
      (game.shield > 0 ? '   + SHIELD ' + Math.ceil(game.shield) : ''), W / 2, by + 14);
    ctx.textAlign = 'left';
    // Wave banner (fades after a couple of seconds).
    if (game.bannerT > 0) {
      const a = Math.min(1, game.bannerT);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Verdana, sans-serif';
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#22d3ee';
      ctx.fillText(game.bannerText, W / 2, 150);
      ctx.shadowBlur = 0;
      if (game.bannerSub) {
        ctx.font = '18px Verdana, sans-serif';
        ctx.fillStyle = P.dim;
        ctx.fillText(game.bannerSub, W / 2, 184);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  },

  drawTitle(ctx, game, time) {
    const W = NK_CONFIG.W, H = NK_CONFIG.H;
    const P = NK_CONFIG.PALETTE;
    // Big glowing title.
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowBlur = 34;
    ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px Verdana, sans-serif';
    ctx.fillText('NOVA KEEP', W / 2, 172);
    ctx.restore();
    ctx.fillStyle = '#ff4fd8';
    ctx.font = 'bold 26px Verdana, sans-serif';
    ctx.fillText('HOLD THE STAR-CORE  •  TEN WAVES  •  NO RETREAT', W / 2, 216);
    ctx.fillStyle = P.dim;
    ctx.font = '19px Verdana, sans-serif';
    ctx.fillText('Aim with the mouse — hold click or SPACE to fire. Enemies that reach', W / 2, 272);
    ctx.fillText('the core damage it. Between waves, draft an upgrade. Survive wave 10.', W / 2, 300);
    // Start button (pulses gently).
    const bw = 300, bh = 64, bx = (W - bw) / 2, by = 432;
    const pulse = 0.7 + Math.sin(time * 3) * 0.3;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(34,211,238,0.25)';
    ctx.beginPath();
    ctx.roundRect(bx - 6, by - 6, bw + 12, bh + 12, 12);
    ctx.fill();
    ctx.restore();
    if (this.button(ctx, bx, by, bw, bh, '▶  START DEFENSE')) game.requestStart = true;
    ctx.fillStyle = P.dim;
    ctx.font = '16px Verdana, sans-serif';
    ctx.fillText('ENTER / SPACE to start   •   P pause   •   M mute   •   R restart', W / 2, 544);
    ctx.fillText('Upgrades: press 1 / 2 / 3 or click a card between waves', W / 2, 572);
    if (game.bestScore > 0) {
      ctx.fillStyle = P.gold;
      ctx.font = 'bold 18px Verdana, sans-serif';
      ctx.fillText('BEST SCORE: ' + game.bestScore.toLocaleString('en-US'), W / 2, 618);
    }
    ctx.textAlign = 'left';
  },

  drawUpgrade(ctx, game) {
    const W = NK_CONFIG.W, H = NK_CONFIG.H;
    const P = NK_CONFIG.PALETTE;
    ctx.fillStyle = 'rgba(3, 6, 20, 0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Verdana, sans-serif';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#22d3ee';
    ctx.fillText('WAVE ' + game.wave + ' CLEARED', W / 2, 110);
    ctx.shadowBlur = 0;
    ctx.fillStyle = P.gold;
    ctx.font = 'bold 22px Verdana, sans-serif';
    ctx.fillText('Choose an upgrade — press 1, 2 or 3, or click a card', W / 2, 150);
    const cw = 300, ch = 240, gap = 36;
    const total = cw * 3 + gap * 2;
    const x0 = (W - total) / 2, y0 = 210;
    game.choices.forEach((u, i) => {
      const x = x0 + i * (cw + gap);
      const hovered = NKInput.mouseX >= x && NKInput.mouseX <= x + cw &&
        NKInput.mouseY >= y0 && NKInput.mouseY <= y0 + ch;
      this.panel(ctx, x, y0, cw, ch);
      if (hovered) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y0, cw, ch, 10);
        ctx.stroke();
      }
      ctx.fillStyle = u.id === 'repair' ? '#7CFC9A' : '#7df9ff';
      ctx.font = 'bold 54px Verdana, sans-serif';
      ctx.fillText(u.icon, x + cw / 2, y0 + 78);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Verdana, sans-serif';
      ctx.fillText(u.name, x + cw / 2, y0 + 128);
      ctx.fillStyle = P.dim;
      ctx.font = '16px Verdana, sans-serif';
      this.wrapText(ctx, u.desc, x + cw / 2, y0 + 162, cw - 36, 22);
      ctx.fillStyle = P.gold;
      ctx.font = 'bold 18px Verdana, sans-serif';
      ctx.fillText('[' + (i + 1) + ']', x + cw / 2, y0 + ch - 22);
      if (NKInput.clickedIn(x, y0, cw, ch)) game.requestChoice = i;
    });
    ctx.fillStyle = P.dim;
    ctx.font = '16px Verdana, sans-serif';
    ctx.fillText('Score ' + game.score.toLocaleString('en-US') + '   •   Core ' +
      Math.ceil(game.coreHp) + '/' + game.coreMaxHp, W / 2, 520);
    ctx.textAlign = 'left';
  },

  // Simple centred word-wrap for card descriptions.
  wrapText(ctx, text, cx, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, yy);
        line = word;
        yy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx, yy);
  },

  drawEnd(ctx, game, won) {
    const W = NK_CONFIG.W, H = NK_CONFIG.H;
    const P = NK_CONFIG.PALETTE;
    ctx.fillStyle = 'rgba(3, 6, 20, 0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = won ? '#7df9ff' : '#ff3b5b';
    ctx.fillStyle = won ? '#7df9ff' : '#ff5b6e';
    ctx.font = 'bold 76px Verdana, sans-serif';
    ctx.fillText(won ? 'VICTORY' : 'THE CORE FALLS', W / 2, 210);
    ctx.restore();
    ctx.fillStyle = P.text;
    ctx.font = '22px Verdana, sans-serif';
    ctx.fillText(won
      ? 'Ten waves. The star-core still burns. The void retreats — for now.'
      : 'The void swallowed the light. The core can be rebuilt. Try again.', W / 2, 258);
    // Results panel.
    const pw = 520, ph = 220, px = (W - pw) / 2, py = 300;
    this.panel(ctx, px, py, pw, ph);
    const mins = Math.floor(game.runTime / 60);
    const secs = Math.floor(game.runTime % 60).toString().padStart(2, '0');
    const acc = game.shotsFired > 0 ? Math.round((game.shotsHit / game.shotsFired) * 100) : 0;
    ctx.fillStyle = P.text;
    ctx.font = 'bold 20px Verdana, sans-serif';
    const rows = [
      ['FINAL SCORE', game.score.toLocaleString('en-US')],
      ['WAVE REACHED', game.wave + ' / ' + NK_CONFIG.TOTAL_WAVES],
      ['TIME', mins + ':' + secs],
      ['ACCURACY', acc + '%  (' + game.shotsHit + ' / ' + game.shotsFired + ' hits)'],
      ['KILLS', String(game.kills)],
    ];
    rows.forEach((row, i) => {
      const y = py + 36 + i * 34;
      ctx.textAlign = 'left';
      ctx.fillStyle = P.dim;
      ctx.fillText(row[0], px + 30, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = i === 0 ? P.gold : P.text;
      ctx.fillText(row[1], px + pw - 30, y);
    });
    ctx.textAlign = 'center';
    if (game.score > 0 && game.score >= game.bestScore) {
      ctx.fillStyle = P.gold;
      ctx.font = 'bold 20px Verdana, sans-serif';
      ctx.fillText('★ NEW BEST SCORE ★', W / 2, py + ph + 40);
    }
    if (this.button(ctx, (W - 300) / 2, 570, 300, 60, '↻  PLAY AGAIN')) game.requestRestart = true;
    ctx.fillStyle = P.dim;
    ctx.font = '16px Verdana, sans-serif';
    ctx.fillText('Press R or ENTER to restart', W / 2, 662);
    ctx.textAlign = 'left';
  },

  drawPaused(ctx, game) {
    const W = NK_CONFIG.W, H = NK_CONFIG.H;
    ctx.fillStyle = 'rgba(3, 6, 20, 0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Verdana, sans-serif';
    ctx.fillText('PAUSED', W / 2, 330);
    ctx.fillStyle = NK_CONFIG.PALETTE.dim;
    ctx.font = '20px Verdana, sans-serif';
    ctx.fillText('Press P to resume', W / 2, 378);
    if (this.button(ctx, (W - 260) / 2, 420, 260, 56, 'RESUME')) game.paused = false;
    ctx.textAlign = 'left';
  },
};
