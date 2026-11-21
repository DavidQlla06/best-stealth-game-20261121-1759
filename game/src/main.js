// Quiet Courier — browser bootstrap: canvas setup, keyboard and mouse
// input, the animation loop, sound triggers, and the screenshot mode
// that freezes one posed scene for the headless camera.

import { WORLD } from './levels.js';
import { createGame, startLevel, update, parcelsLeft } from './engine.js';
import { draw, buttonsFor } from './render.js';
import { applyShot } from './shots.js';
import {
  ensureAudio, setMuted, isMuted,
  blipPickup, blipStep, blipCaught, blipClick, jingleWin, jingleLevel,
} from './audio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = WORLD.w;
canvas.height = WORLD.h;

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const game = createGame(seed);
const keys = new Set();
let clickTarget = null;
let hoverId = null;
let view = { scale: 1, ox: 0, oy: 0 };

function say(text) {
  if (statusEl) statusEl.textContent = text;
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / WORLD.w, window.innerHeight / WORLD.h);
  const w = Math.floor(WORLD.w * scale);
  const h = Math.floor(WORLD.h * scale);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.left = Math.floor((window.innerWidth - w) / 2) + 'px';
  canvas.style.top = Math.floor((window.innerHeight - h) / 2) + 'px';
  view = { scale, ox: (window.innerWidth - w) / 2, oy: (window.innerHeight - h) / 2 };
}

function toWorld(event) {
  return {
    x: (event.clientX - view.ox) / view.scale,
    y: (event.clientY - view.oy) / view.scale,
  };
}

function freshRun(levelIndex) {
  game.score = 0;
  game.time = 0;
  game.strikes = 0;
  startLevel(game, levelIndex);
  clickTarget = null;
  say('Level ' + (levelIndex + 1) + ': ' + game.level.name + '. ' + game.level.brief);
}

function activate(id) {
  blipClick();
  if (id === 'start') freshRun(0);
  else if (id === 'level-0') freshRun(0);
  else if (id === 'level-1') freshRun(1);
  else if (id === 'level-2') freshRun(2);
  else if (id === 'retry') {
    startLevel(game, game.levelIndex);
    clickTarget = null;
    say('Level restarted. ' + game.level.brief);
  } else if (id === 'next') {
    startLevel(game, game.levelIndex + 1);
    clickTarget = null;
    say('Level ' + (game.levelIndex + 1) + ': ' + game.level.name + '. ' + game.level.brief);
  } else if (id === 'again') freshRun(0);
  else if (id === 'resume') game.mode = 'playing';
}

function contextAction() {
  if (game.mode === 'title') activate('start');
  else if (game.mode === 'caught') activate('retry');
  else if (game.mode === 'leveldone') activate('next');
  else if (game.mode === 'victory') activate('again');
  else if (game.mode === 'paused') activate('resume');
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

window.addEventListener('keydown', (event) => {
  const code = event.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
    event.preventDefault();
  }
  ensureAudio();
  keys.add(code);
  if (code === 'Enter' || code === 'Space') contextAction();
  else if (code === 'KeyP' || code === 'Escape') {
    if (game.mode === 'playing') { game.mode = 'paused'; say('Paused.'); }
    else if (game.mode === 'paused') { game.mode = 'playing'; say('Resumed.'); }
  } else if (code === 'KeyR' && game.level) {
    startLevel(game, game.levelIndex);
    clickTarget = null;
    say('Level restarted.');
  } else if (code === 'KeyM') {
    setMuted(!isMuted());
    say(isMuted() ? 'Sound off.' : 'Sound on.');
  }
});

window.addEventListener('keyup', (event) => keys.delete(event.code));

canvas.addEventListener('mousemove', (event) => {
  const p = toWorld(event);
  hoverId = null;
  for (const b of buttonsFor(game)) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) hoverId = b.id;
  }
  canvas.style.cursor = hoverId ? 'pointer' : 'crosshair';
});

canvas.addEventListener('click', (event) => {
  ensureAudio();
  const p = toWorld(event);
  for (const b of buttonsFor(game)) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      activate(b.id);
      return;
    }
  }
  if (game.mode === 'playing') {
    clickTarget = { x: p.x, y: p.y };
    blipClick();
  }
});

function readInput() {
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (dx !== 0 || dy !== 0) clickTarget = null;
  return {
    dx,
    dy,
    sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    target: clickTarget,
    onArrive: () => { clickTarget = null; },
  };
}

function drainEvents() {
  while (game.events.length > 0) {
    const e = game.events.shift();
    if (e === 'pickup') {
      blipPickup();
      const left = parcelsLeft(game);
      say(left === 0 ? 'All parcels collected. Reach the exit.' : 'Parcel collected. ' + left + ' to go.');
    } else if (e === 'step') blipStep(game.player.sneaking);
    else if (e === 'caught') {
      blipCaught();
      say('Spotted! Press Enter to try the level again.');
    } else if (e === 'level-done') {
      jingleLevel();
      say('Delivered. Press Enter for the next level.');
    } else if (e === 'victory') {
      jingleWin();
      say('All deliveries done. Final score ' + game.score + '.');
    }
  }
}

const shotMode = shotName ? applyShot(game, shotName) : false;
if (shotMode) say('Screenshot scene: ' + shotName);
else {
  startLevel(game, 0);
  game.mode = 'title';
  say('Quiet Courier. Press Enter or click Start delivery.');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
  last = now;
  if (!shotMode) {
    update(game, readInput(), dt);
    drainEvents();
  }
  draw(ctx, game, hoverId);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
