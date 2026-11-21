// Quiet Courier — tiny WebAudio synth. No audio files: every sound is a
// short oscillator blip shaped by an envelope, made on the first user
// gesture so the browser allows playback. In screenshot mode the synth
// stays silent because no gesture ever arrives.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type, gain, slideTo) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0008, t0 + seconds);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.02);
}

export function blipPickup() {
  tone(880, 0.09, 'sine', 0.16);
  setTimeout(() => tone(1318, 0.12, 'sine', 0.14), 60);
}

export function blipStep(sneaking) {
  tone(sneaking ? 180 : 230, 0.05, 'triangle', sneaking ? 0.03 : 0.06);
}

export function blipSuspicion() {
  tone(520, 0.08, 'square', 0.05, 640);
}

export function blipCaught() {
  tone(320, 0.28, 'sawtooth', 0.18, 90);
  setTimeout(() => tone(160, 0.3, 'sawtooth', 0.14, 70), 90);
}

export function blipClick() {
  tone(660, 0.05, 'sine', 0.1);
}

export function jingleWin() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.16, 'triangle', 0.15), i * 110));
}

export function jingleLevel() {
  const notes = [440, 587, 880];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.14, 'triangle', 0.14), i * 95));
}
