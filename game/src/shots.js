// Quiet Courier — frozen scenes for screenshots. When the page opens
// with ?shot=<name>&seed=<n>, the game builds one of these exact poses
// and holds it still, so a headless browser captures a real render of
// the game's own drawing code: same cones, same cover, same HUD.

import { startLevel } from './engine.js';

function poseGuard(guard, x, y, angle, alert) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.alert = alert;
  guard.pause = 0;
}

export function applyShot(game, name) {
  if (name === 'start') {
    startLevel(game, 0);
    game.mode = 'title';
    game.time = 0;
    return true;
  }
  if (name === 'play') {
    startLevel(game, 0);
    game.player.x = 640;
    game.player.y = 272;
    game.player.angle = -0.7;
    game.player.sneaking = true;
    game.player.moving = true;
    poseGuard(game.guards[0], 700, 120, 0, 18);
    poseGuard(game.guards[1], 450, 400, 0, 0);
    game.alert = 18;
    game.maxAlert = 18;
    game.time = 42;
    game.levelTime = 42;
    game.score = 0;
    game.mode = 'playing';
    return true;
  }
  if (name === 'alert') {
    startLevel(game, 1);
    game.player.x = 700;
    game.player.y = 92;
    game.player.angle = 0.3;
    game.player.sneaking = false;
    game.player.moving = true;
    poseGuard(game.guards[0], 560, 90, 0, 74);
    poseGuard(game.guards[1], 600, 320, -Math.PI / 2, 0);
    poseGuard(game.guards[2], 980, 420, Math.PI, 0);
    game.alert = 74;
    game.maxAlert = 74;
    game.time = 96;
    game.levelTime = 54;
    game.score = 1150;
    game.mode = 'playing';
    return true;
  }
  if (name === 'end') {
    startLevel(game, 2);
    for (const parcel of game.parcels) parcel.taken = true;
    game.player.x = 640;
    game.player.y = 88;
    game.player.angle = -Math.PI / 2;
    game.score = 6450;
    game.time = 187;
    game.levelTime = 61;
    game.strikes = 1;
    game.mode = 'victory';
    return true;
  }
  return false;
}
