// NOVA KEEP — all sound is synthesized with the Web Audio API: no audio
// files, no network. A quiet pad loop hums underneath; every action gets a
// short synth blip. Mute silences everything.
'use strict';

const NKAudio = {
  ctx: null,
  master: null,
  padNodes: null,
  muted: false,

  // Create the context on the first user gesture (browsers block audio before it).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startPad();
      return true;
    } catch (e) {
      return false;
    }
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  },

  // Two detuned triangle waves through a slow LFO: a soft deep-space drone.
  startPad() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    gain.connect(this.master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    const notes = [55, 82.41, 110];
    const oscs = notes.map((freq, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = freq;
      o.detune.value = i * 4 - 4;
      o.connect(gain);
      o.start();
      return o;
    });
    lfo.start();
    this.padNodes = { gain, oscs, lfo };
  },

  // One short enveloped oscillator burst. The whole SFX kit is built on this.
  blip(type, freqA, freqB, dur, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t0);
    if (freqB !== freqA) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  // Filtered noise burst for explosions and impacts.
  noise(dur, vol, cutoff = 1200, when = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t0);
  },

  shoot() { this.blip('square', 880, 320, 0.09, 0.10); },
  hit() { this.blip('triangle', 240, 140, 0.06, 0.12); },
  explode() { this.noise(0.35, 0.35, 900); this.blip('sine', 160, 40, 0.3, 0.25); },
  coreHit() { this.noise(0.25, 0.3, 500); this.blip('sawtooth', 120, 55, 0.3, 0.22); },
  upgrade() { this.blip('sine', 523, 523, 0.12, 0.16); this.blip('sine', 659, 659, 0.12, 0.16, 0.09); this.blip('sine', 784, 784, 0.2, 0.18, 0.18); },
  horn() { this.blip('sawtooth', 98, 98, 0.5, 0.16); this.blip('sawtooth', 147, 147, 0.5, 0.12, 0.05); },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => this.blip('sine', f, f, 0.35, 0.18, i * 0.13));
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => this.blip('sawtooth', f, f * 0.94, 0.4, 0.14, i * 0.16));
  },
  click() { this.blip('sine', 660, 660, 0.05, 0.1); },
};
