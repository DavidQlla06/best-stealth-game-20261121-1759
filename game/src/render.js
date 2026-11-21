// Quiet Courier — canvas rendering. Everything is drawn from the engine
// state each frame: floor, cover, vision cones clipped by raycasts,
// couriers and guards, the HUD strip, and the overlay screens. Buttons
// are laid out here so the input code can hit-test the same rectangles.

import { WORLD, LEVELS } from './levels.js';
import {
  PLAYER_R, GUARD_R, VISION_RANGE, VISION_HALF,
  castRay, parcelsLeft, ratingFor,
} from './engine.js';

const INK = '#e8ecf4';
const DIM = '#9aa7bd';
const FLOOR = '#1b2233';
const FLOOR_LINE = '#232d44';
const WALL = '#3d4a68';
const WALL_TOP = '#55688f';
const CRATE = '#8a5a2b';
const CRATE_EDGE = '#c98f4a';
const BUSH = '#1e4632';
const BUSH_LEAF = '#2c6b4a';
const TEAL = '#2ee6c8';
const GREEN = '#57e389';
const RED = '#ff5d5d';
const AMBER = '#ffc857';

export function buttonsFor(game) {
  const cx = WORLD.w / 2;
  if (game.mode === 'title') {
    return [
      { id: 'start', label: 'Start delivery', x: cx - 130, y: 300, w: 260, h: 44 },
      { id: 'level-0', label: '1 · Depot Yard', x: cx - 300, y: 362, w: 190, h: 36 },
      { id: 'level-1', label: '2 · Cold Storage', x: cx - 95, y: 362, w: 190, h: 36 },
      { id: 'level-2', label: '3 · Night Docks', x: cx + 110, y: 362, w: 190, h: 36 },
    ];
  }
  if (game.mode === 'caught') {
    return [{ id: 'retry', label: 'Try the level again', x: cx - 140, y: 300, w: 280, h: 44 }];
  }
  if (game.mode === 'leveldone') {
    return [{ id: 'next', label: 'Next level', x: cx - 110, y: 308, w: 220, h: 44 }];
  }
  if (game.mode === 'victory') {
    return [{ id: 'again', label: 'Run it again', x: cx - 110, y: 322, w: 220, h: 44 }];
  }
  if (game.mode === 'paused') {
    return [{ id: 'resume', label: 'Resume', x: cx - 100, y: 268, w: 200, h: 42 }];
  }
  return [];
}

function fmtTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

function drawFloor(ctx) {
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, WORLD.hud, WORLD.w, WORLD.h - WORLD.hud);
  ctx.strokeStyle = FLOOR_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 40; x < WORLD.w; x += 40) {
    ctx.moveTo(x, WORLD.hud);
    ctx.lineTo(x, WORLD.h);
  }
  for (let y = WORLD.hud + 40; y < WORLD.h; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.w, y);
  }
  ctx.stroke();
}

function drawBushes(ctx, level) {
  for (const b of level.bushes) {
    ctx.fillStyle = BUSH;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = BUSH_LEAF;
    for (let x = b.x + 8; x < b.x + b.w - 6; x += 16) {
      for (let y = b.y + 8; y < b.y + b.h - 6; y += 14) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawWalls(ctx, level) {
  for (const w of level.walls) {
    ctx.fillStyle = WALL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(w.x, w.y, w.w, Math.min(5, w.h));
  }
}

function drawCrates(ctx, level) {
  for (const c of level.crates) {
    ctx.fillStyle = CRATE;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = CRATE_EDGE;
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    ctx.beginPath();
    ctx.moveTo(c.x + 3, c.y + 3);
    ctx.lineTo(c.x + c.w - 3, c.y + c.h - 3);
    ctx.moveTo(c.x + c.w - 3, c.y + 3);
    ctx.lineTo(c.x + 3, c.y + c.h - 3);
    ctx.stroke();
  }
}

function drawExit(ctx, game) {
  const e = game.level.exit;
  const open = parcelsLeft(game) === 0;
  ctx.fillStyle = open ? 'rgba(87,227,137,0.30)' : 'rgba(120,130,150,0.22)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? GREEN : DIM;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
  ctx.setLineDash([]);
  ctx.fillStyle = open ? GREEN : DIM;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 5);
}

function drawParcels(ctx, game) {
  const pulse = 0.5 + 0.5 * Math.sin(game.time * 3.2);
  for (const p of game.parcels) {
    if (p.taken) continue;
    ctx.fillStyle = 'rgba(46,230,200,' + (0.16 + pulse * 0.12).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TEAL;
    ctx.fillRect(p.x - 10, p.y - 8, 20, 16);
    ctx.strokeStyle = '#0d5c4d';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 10, p.y - 8, 20, 16);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 8);
    ctx.lineTo(p.x, p.y + 8);
    ctx.moveTo(p.x - 10, p.y);
    ctx.lineTo(p.x + 10, p.y);
    ctx.stroke();
    ctx.fillStyle = '#0d5c4d';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCone(ctx, game, guard) {
  const rays = 26;
  const heat = guard.alert / 100;
  const r = Math.round(255);
  const g = Math.round(214 - heat * 140);
  const b = Math.round(84 - heat * 44);
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i++) {
    const a = guard.angle - VISION_HALF + (VISION_HALF * 2 * i) / rays;
    const d = castRay(guard.x, guard.y, a, VISION_RANGE, game.solids);
    ctx.lineTo(guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.30 + heat * 0.18).toFixed(3) + ')';
  ctx.fill();
  ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  ctx.fillStyle = '#7a2e35';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c94f5e';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD_R - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd9a0';
  const fx = guard.x + Math.cos(guard.angle) * (GUARD_R - 2);
  const fy = guard.y + Math.sin(guard.angle) * (GUARD_R - 2);
  ctx.beginPath();
  ctx.arc(fx, fy, 4, 0, Math.PI * 2);
  ctx.fill();
  if (guard.alert >= 95) {
    ctx.fillStyle = RED;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - GUARD_R - 8);
  } else if (guard.alert >= 35) {
    ctx.fillStyle = AMBER;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - GUARD_R - 8);
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  ctx.fillStyle = p.sneaking ? '#1f7a6d' : '#2aa198';
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#bff5ea';
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_R - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d5c4d';
  const fx = p.x + Math.cos(p.angle) * (PLAYER_R - 1);
  const fy = p.y + Math.sin(p.angle) * (PLAYER_R - 1);
  ctx.beginPath();
  ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(46,230,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = '#121828';
  ctx.fillRect(0, 0, WORLD.w, WORLD.hud);
  ctx.strokeStyle = FLOOR_LINE;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.hud - 0.5);
  ctx.lineTo(WORLD.w, WORLD.hud - 0.5);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = INK;
  const levelName = game.level ? game.level.name : '';
  ctx.fillText('QUIET COURIER', 14, 28);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText(levelName ? 'Level ' + (game.levelIndex + 1) + ' · ' + levelName : '', 176, 28);
  ctx.fillStyle = INK;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('TIME ' + fmtTime(game.time), 470, 28);
  ctx.fillText('SCORE ' + game.score, 590, 28);
  const total = game.parcels.length;
  const got = total - parcelsLeft(game);
  ctx.fillText('PARCELS ' + got + '/' + total, 730, 28);
  ctx.fillText('STRIKES ' + game.strikes, 880, 28);
  // Alert meter
  ctx.fillStyle = DIM;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('ALERT', 1010, 28);
  ctx.fillStyle = '#2a3350';
  ctx.fillRect(1060, 14, 170, 14);
  const heat = Math.max(0, Math.min(100, game.alert)) / 100;
  ctx.fillStyle = heat > 0.7 ? RED : heat > 0.35 ? AMBER : GREEN;
  ctx.fillRect(1060, 14, Math.round(170 * heat), 14);
  ctx.strokeStyle = FLOOR_LINE;
  ctx.strokeRect(1060.5, 14.5, 170, 14);
}

function drawButtons(ctx, game, hoverId) {
  for (const b of buttonsFor(game)) {
    const hot = b.id === hoverId;
    ctx.fillStyle = hot ? '#2f6f5e' : '#22304d';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = hot ? TEAL : '#4a5b80';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = INK;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
  }
}

function overlay(ctx, title, lines) {
  ctx.fillStyle = 'rgba(8,11,20,0.78)';
  ctx.fillRect(0, WORLD.hud, WORLD.w, WORLD.h - WORLD.hud);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(title, WORLD.w / 2, 190);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = DIM;
  lines.forEach((line, i) => ctx.fillText(line, WORLD.w / 2, 228 + i * 24));
}

export function draw(ctx, game, hoverId) {
  ctx.fillStyle = '#0d1220';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  if (game.level) {
    drawFloor(ctx);
    drawBushes(ctx, game.level);
    drawExit(ctx, game);
    drawParcels(ctx, game);
    for (const guard of game.guards) drawCone(ctx, game, guard);
    drawWalls(ctx, game.level);
    drawCrates(ctx, game.level);
    for (const guard of game.guards) drawGuard(ctx, guard);
    if (game.mode !== 'title') drawPlayer(ctx, game);
  }
  drawHud(ctx, game);
  if (game.mode === 'title') {
    overlay(ctx, 'QUIET COURIER', [
      'Sneak through three night depots. Grab every parcel, reach the exit unseen.',
      'Move: WASD / arrows, or click to walk there · Sneak: hold Shift · Pause: P · Restart: R · Mute: M',
      'Stay out of the vision cones. Crates and walls break sight; bushes hide you.',
    ]);
    drawButtons(ctx, game, hoverId);
  } else if (game.mode === 'caught') {
    overlay(ctx, 'SPOTTED!', [
      'A guard got a clean look at you. The parcel run restarts.',
      'Score ' + game.score + ' · Strikes ' + game.strikes + ' · Time ' + fmtTime(game.time),
    ]);
    drawButtons(ctx, game, hoverId);
  } else if (game.mode === 'leveldone') {
    overlay(ctx, 'DELIVERED', [
      game.level.name + ' cleared in ' + fmtTime(game.levelTime) + '.',
      'Level score +' + game.lastLevelScore + (game.lastGhost ? ' (ghost bonus earned)' : '') + ' · Total ' + game.score,
    ]);
    drawButtons(ctx, game, hoverId);
  } else if (game.mode === 'victory') {
    overlay(ctx, 'ALL DELIVERIES DONE', [
      'Final score ' + game.score + ' · Time ' + fmtTime(game.time) + ' · Strikes ' + game.strikes,
      'Rating: ' + ratingFor(game.score),
    ]);
    drawButtons(ctx, game, hoverId);
  } else if (game.mode === 'paused') {
    overlay(ctx, 'PAUSED', ['Press P or click Resume to keep sneaking.']);
    drawButtons(ctx, game, hoverId);
  }
}

export { LEVELS };
