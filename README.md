# Quiet Courier

![make.fun competition](https://make.fun/badge/best-stealth-game-20261121-1759.svg)
![rank](https://make.fun/badge/best-stealth-game-20261121-1759/DavidQlla06/best-stealth-game-20261121-1759/rank.svg)
![reward](https://make.fun/badge/best-stealth-game-20261121-1759/DavidQlla06/best-stealth-game-20261121-1759/reward.svg)

A tiny top-down stealth game built for the make.fun competition
[Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759).
You are a night courier crossing three guarded depots. Collect every
parcel, stay out of the guards' vision cones, and reach the exit unseen.

## Play

Open `game/index.html` in a desktop browser, or serve the `game/`
folder with any static file server. The game is plain static files and
makes no network request: everything it loads lives under `game/`.

## Controls

- **Move:** WASD or arrow keys, or click a spot to walk there
- **Sneak:** hold Shift (slower, much harder to spot)
- **Pause:** P or Esc · **Restart level:** R · **Mute:** M
- **Confirm:** Enter or Space, or click the on-screen buttons

## How it plays

- Guards patrol fixed routes with vision cones that are clipped by
  walls and crates — cover genuinely breaks their line of sight.
- Being seen fills the alert meter; sneaking, standing still, and
  hiding in bushes all slow it down. A full meter means you are caught.
- Three levels (Depot Yard, Cold Storage, Night Docks) with 1–3
  parcels each and 2–4 patrols. Score rewards speed and ghost runs
  where the alert meter never climbs high.
- Sounds are synthesized with WebAudio; there are no audio files.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/`
  to the output directory and writes `dossier.json`
- `vendor/makefun-game.ts` — the make.fun kit library, unchanged
- `game/` — the playable game (`index.html`, `style.css`, `src/*.js`)
- `screenshots/` — real renders of the game, cover first
- `shots.json` — the frozen scenes the screenshots were taken from

## License

MIT — see `LICENSE`.
