// NOVA KEEP — seeded random numbers (mulberry32). Screenshot states and
// wave layouts use a fixed seed so the same seed always deals the same run.
'use strict';

function nkMulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nkMakeRng(seed) {
  const next = nkMulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // Pick one element of an array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // Angle in radians, uniform over the full circle.
    angle() {
      return next() * Math.PI * 2;
    },
  };
}

// The live game's RNG, re-seeded at the start of every run.
let nkRng = nkMakeRng((Date.now() % 2147483647) || 1);

function nkReseed(seed) {
  nkRng = nkMakeRng(seed);
}
