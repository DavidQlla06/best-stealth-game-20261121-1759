// Quiet Courier — game engine: state, movement, patrols, vision cones,
// detection, scoring. Pure logic with no DOM access, so the same code
// drives live play and the frozen screenshot scenes.

import { LEVELS, WORLD } from './levels.js';

export const PLAYER_R = 12;
export const GUARD_R = 13;
export const WALK_SPEED = 152;
export const SNEAK_SPEED = 84;
export const VISION_RANGE = 196;
export const VISION_HALF = 0.56; // radians, about 32 degrees
export const ALERT_FILL = 62; // alert points per second at point blank
export const ALERT_DECAY = 20;
export const SUSPICION_AT = 35;
export const CAUGHT_PENALTY = 200;
export const GHOST_BONUS = 400;
export const GHOST_LIMIT = 60;

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function solidsOf(level) {
  return level.walls.concat(level.crates);
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function circleHitsRect(x, y, radius, r) {
  const nx = Math.max(r.x, Math.min(x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(y, r.y + r.h));
  const dx = x - nx;
  const dy = y - ny;
  return dx * dx + dy * dy < radius * radius;
}

function moveCircle(body, radius, dx, dy, solids) {
  let nx = body.x + dx;
  if (!solids.some((r) => circleHitsRect(nx, body.y, radius, r))) body.x = nx;
  let ny = body.y + dy;
  if (!solids.some((r) => circleHitsRect(body.x, ny, radius, r))) body.y = ny;
  body.x = Math.max(radius + 10, Math.min(WORLD.w - radius - 10, body.x));
  body.y = Math.max(WORLD.hud + radius + 10, Math.min(WORLD.h - radius - 10, body.y));
}

// Distance from (x, y) along a ray until it enters a rectangle, or
// maxDist when nothing is hit. Used to clip vision cones against cover.
export function castRay(x, y, angle, maxDist, solids) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const r of solids) {
    let tmin = 0;
    let tmax = best;
    if (Math.abs(dx) < 1e-9) {
      if (x < r.x || x > r.x + r.w) continue;
    } else {
      let t1 = (r.x - x) / dx;
      let t2 = (r.x + r.w - x) / dx;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (Math.abs(dy) < 1e-9) {
      if (y < r.y || y > r.y + r.h) continue;
    } else {
      let t1 = (r.y - y) / dy;
      let t2 = (r.y + r.h - y) / dy;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (tmin < best && tmin > 0) best = tmin;
  }
  return best;
}

export function losBlocked(x1, y1, x2, y2, solids) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return false;
  const hit = castRay(x1, y1, Math.atan2(dy, dx), dist, solids);
  return hit < dist - 2;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export function createGame(seed) {
  return {
    mode: 'title',
    rng: makeRng(seed || 1),
    levelIndex: 0,
    level: null,
    solids: [],
    player: { x: 0, y: 0, angle: 0, moving: false, sneaking: false, stepClock: 0 },
    guards: [],
    parcels: [],
    alert: 0,
    maxAlert: 0,
    time: 0,
    levelTime: 0,
    score: 0,
    strikes: 0,
    lastLevelScore: 0,
    lastGhost: false,
    events: [],
  };
}

export function startLevel(game, index) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.level = level;
  game.solids = solidsOf(level);
  game.player.x = level.start.x;
  game.player.y = level.start.y;
  game.player.angle = -Math.PI / 2;
  game.player.moving = false;
  game.guards = level.guards.map((g) => ({
    x: g.path[0].x,
    y: g.path[0].y,
    angle: Math.atan2(g.path[1].y - g.path[0].y, g.path[1].x - g.path[0].x),
    path: g.path,
    speed: g.speed,
    wp: 1,
    dir: 1,
    pause: 0,
    alert: 0,
    sees: false,
  }));
  game.parcels = level.parcels.map((p) => ({ x: p.x, y: p.y, taken: false }));
  game.alert = 0;
  game.maxAlert = 0;
  game.levelTime = 0;
  game.mode = 'playing';
  game.events.push('level-start');
}

export function parcelsLeft(game) {
  return game.parcels.filter((p) => !p.taken).length;
}

export function playerInBush(game) {
  return game.level.bushes.some((b) => pointInRect(game.player.x, game.player.y, b));
}

function guardSees(game, guard) {
  const p = game.player;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return { sees: false, dist };
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toPlayer, guard.angle)) > VISION_HALF) return { sees: false, dist };
  if (losBlocked(guard.x, guard.y, p.x, p.y, game.solids)) return { sees: false, dist };
  return { sees: true, dist };
}

function updateGuard(game, guard, dt) {
  const sight = guardSees(game, guard);
  guard.sees = sight.sees;
  if (sight.sees) {
    const closeness = 1 - (sight.dist / VISION_RANGE) * 0.62;
    let rate = ALERT_FILL * closeness;
    if (game.player.sneaking) rate *= 0.45;
    if (!game.player.moving) rate *= 0.7;
    if (playerInBush(game)) rate *= 0.5;
    guard.alert = Math.min(100, guard.alert + rate * dt);
  } else {
    guard.alert = Math.max(0, guard.alert - ALERT_DECAY * dt);
  }

  if (guard.alert >= SUSPICION_AT && sight.sees) {
    const toPlayer = Math.atan2(game.player.y - guard.y, game.player.x - guard.x);
    guard.angle = turnToward(guard.angle, toPlayer, 2.6 * dt);
    return;
  }
  if (guard.pause > 0) {
    guard.pause -= dt;
    return;
  }
  const target = guard.path[guard.wp];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    guard.wp += guard.dir;
    if (guard.wp >= guard.path.length || guard.wp < 0) {
      guard.dir *= -1;
      guard.wp += guard.dir * 2;
      guard.pause = 0.85;
    }
    return;
  }
  const heading = Math.atan2(dy, dx);
  guard.angle = turnToward(guard.angle, heading, 3.2 * dt);
  const step = guard.speed * dt;
  moveCircle(guard, GUARD_R, Math.cos(heading) * step, Math.sin(heading) * step, game.solids);
}

function updatePlayer(game, input, dt) {
  const p = game.player;
  p.sneaking = !!input.sneak;
  let vx = input.dx || 0;
  let vy = input.dy || 0;
  if ((vx === 0 && vy === 0) && input.target) {
    const dx = input.target.x - p.x;
    const dy = input.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      vx = dx / dist;
      vy = dy / dist;
    } else if (input.onArrive) {
      input.onArrive();
    }
  }
  const len = Math.hypot(vx, vy);
  p.moving = len > 0.01;
  if (!p.moving) return;
  vx /= len;
  vy /= len;
  const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
  p.angle = Math.atan2(vy, vx);
  moveCircle(p, PLAYER_R, vx * speed * dt, vy * speed * dt, game.solids);
  p.stepClock += dt * (p.sneaking ? 0.7 : 1.35);
  if (p.stepClock > 0.42) {
    p.stepClock = 0;
    game.events.push('step');
  }
}

function checkPickups(game) {
  for (const parcel of game.parcels) {
    if (parcel.taken) continue;
    const d = Math.hypot(parcel.x - game.player.x, parcel.y - game.player.y);
    if (d < PLAYER_R + 13) {
      parcel.taken = true;
      game.events.push('pickup');
    }
  }
}

function finishLevel(game) {
  const timeBonus = Math.max(0, 600 - Math.floor(game.levelTime) * 5);
  const ghost = game.maxAlert < GHOST_LIMIT;
  const gained = 1000 + game.parcels.length * 150 + timeBonus + (ghost ? GHOST_BONUS : 0);
  game.lastLevelScore = gained;
  game.lastGhost = ghost;
  game.score += gained;
  game.mode = game.levelIndex >= LEVELS.length - 1 ? 'victory' : 'leveldone';
  game.events.push(game.mode === 'victory' ? 'victory' : 'level-done');
}

export function update(game, input, dt) {
  if (game.mode !== 'playing') return;
  game.time += dt;
  game.levelTime += dt;
  updatePlayer(game, input, dt);
  let worst = 0;
  for (const guard of game.guards) {
    updateGuard(game, guard, dt);
    if (guard.alert > worst) worst = guard.alert;
  }
  game.alert = worst;
  if (worst > game.maxAlert) game.maxAlert = worst;
  if (worst >= 100) {
    game.strikes += 1;
    game.score = Math.max(0, game.score - CAUGHT_PENALTY);
    game.mode = 'caught';
    game.events.push('caught');
    return;
  }
  checkPickups(game);
  if (parcelsLeft(game) === 0 && pointInRect(game.player.x, game.player.y, game.level.exit)) {
    finishLevel(game);
  }
}

export function ratingFor(score) {
  if (score >= 6200) return 'S — Ghost of the depot';
  if (score >= 5200) return 'A — Nearly invisible';
  if (score >= 4200) return 'B — Careful courier';
  if (score >= 3200) return 'C — Seen, but swift';
  return 'D — The guards send regards';
}
