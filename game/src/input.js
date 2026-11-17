// NOVA KEEP — keyboard, mouse and touch input. The game reads this module's
// state each frame; it never listens inside the game loop itself.
'use strict';

const NKInput = {
  mouseX: 640,
  mouseY: 200,
  mouseDown: false,
  // Keys currently held, by KeyboardEvent.code.
  keys: {},
  // Keys pressed since the last frame was consumed (edge-triggered actions).
  pressed: {},
  // The most recent click position, for button hit-testing.
  clickX: -1,
  clickY: -1,
  clickFresh: false,
  touchMode: false,

  init(canvas) {
    const rectOf = () => canvas.getBoundingClientRect();
    const scalePos = (cx, cy) => {
      const r = rectOf();
      return {
        x: ((cx - r.left) / r.width) * NK_CONFIG.W,
        y: ((cy - r.top) / r.height) * NK_CONFIG.H,
      };
    };
    canvas.addEventListener('mousemove', (e) => {
      const p = scalePos(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouseDown = true;
      const p = scalePos(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.clickX = p.x;
      this.clickY = p.y;
      this.clickFresh = true;
      NKAudio.ensure();
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touchMode = true;
      const t = e.touches[0];
      const p = scalePos(t.clientX, t.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mouseDown = true;
      this.clickX = p.x;
      this.clickY = p.y;
      this.clickFresh = true;
      NKAudio.ensure();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const p = scalePos(t.clientX, t.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.mouseDown = false;
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      NKAudio.ensure();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouseDown = false;
    });
  },

  // True only on the frame the key went down.
  wasPressed(code) {
    return !!this.pressed[code];
  },

  firing() {
    return this.mouseDown || !!this.keys['Space'];
  },

  // Aim angle from the core to the pointer.
  aimAngle() {
    return Math.atan2(this.mouseY - NK_CONFIG.CORE_Y, this.mouseX - NK_CONFIG.CORE_X);
  },

  // Call at the end of each frame: edge triggers live for one frame only.
  endFrame() {
    this.pressed = {};
    this.clickFresh = false;
  },

  // True if the last click landed inside the given rect (and consumed it).
  clickedIn(x, y, w, h) {
    if (!this.clickFresh) return false;
    return this.clickX >= x && this.clickX <= x + w && this.clickY >= y && this.clickY <= y + h;
  },
};
