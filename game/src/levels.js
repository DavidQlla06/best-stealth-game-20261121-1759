// Quiet Courier — level data.
//
// The playfield is a fixed 1280x480 world. The top 44 pixels are the HUD
// strip, so every level lives inside y = 44..480. Rectangles are given as
// { x, y, w, h } with (x, y) at the top-left corner.
//
//   walls   solid blocks: they stop movement and block sight
//   crates  stacked boxes: same collision as walls, drawn as cover
//   bushes  dark foliage patches: walkable, halve the detection rate
//   guards  patrol loops as waypoint lists, walked in order, forever
//   parcels pickups that must all be collected before the exit opens
//   start   where the courier begins the level
//   exit    the delivery pad, reached unseen to finish the level

export const WORLD = { w: 1280, h: 480, hud: 44 };

const border = [
  { x: 0, y: 44, w: 1280, h: 10 },
  { x: 0, y: 470, w: 1280, h: 10 },
  { x: 0, y: 44, w: 10, h: 436 },
  { x: 1270, y: 44, w: 10, h: 436 },
];

export const LEVELS = [
  {
    name: 'Depot Yard',
    brief: 'One parcel waits by the north fence. Slip past two patrols.',
    start: { x: 70, y: 420 },
    exit: { x: 1180, y: 92, w: 64, h: 44 },
    parcels: [{ x: 640, y: 96 }],
    walls: [
      ...border,
      { x: 300, y: 150, w: 18, h: 180 },
      { x: 950, y: 210, w: 18, h: 170 },
      { x: 480, y: 330, w: 260, h: 18 },
    ],
    crates: [
      { x: 430, y: 140, w: 52, h: 52 },
      { x: 540, y: 190, w: 52, h: 52 },
      { x: 760, y: 140, w: 52, h: 52 },
      { x: 820, y: 300, w: 52, h: 52 },
      { x: 180, y: 260, w: 52, h: 52 },
      { x: 1080, y: 330, w: 52, h: 52 },
    ],
    bushes: [
      { x: 600, y: 250, w: 120, h: 44 },
      { x: 120, y: 110, w: 110, h: 40 },
    ],
    guards: [
      { path: [{ x: 360, y: 120 }, { x: 900, y: 120 }], speed: 68 },
      { path: [{ x: 220, y: 400 }, { x: 760, y: 400 }], speed: 74 },
    ],
  },
  {
    name: 'Cold Storage',
    brief: 'Two parcels among the freezer rows. Three patrols keep watch.',
    start: { x: 70, y: 96 },
    exit: { x: 1180, y: 402, w: 64, h: 44 },
    parcels: [
      { x: 660, y: 420 },
      { x: 1090, y: 110 },
    ],
    walls: [
      ...border,
      { x: 240, y: 44, w: 18, h: 210 },
      { x: 240, y: 330, w: 18, h: 140 },
      { x: 520, y: 150, w: 18, h: 320 },
      { x: 800, y: 44, w: 18, h: 230 },
      { x: 1020, y: 220, w: 18, h: 170 },
      { x: 380, y: 250, w: 140, h: 18 },
      { x: 860, y: 330, w: 160, h: 18 },
    ],
    crates: [
      { x: 330, y: 110, w: 52, h: 52 },
      { x: 640, y: 110, w: 52, h: 52 },
      { x: 640, y: 300, w: 52, h: 52 },
      { x: 900, y: 130, w: 52, h: 52 },
      { x: 120, y: 330, w: 52, h: 52 },
      { x: 1130, y: 260, w: 52, h: 52 },
    ],
    bushes: [
      { x: 560, y: 400, w: 130, h: 42 },
      { x: 850, y: 240, w: 110, h: 40 },
      { x: 90, y: 180, w: 100, h: 40 },
    ],
    guards: [
      { path: [{ x: 380, y: 90 }, { x: 740, y: 90 }], speed: 72 },
      { path: [{ x: 600, y: 430 }, { x: 600, y: 200 }], speed: 66 },
      { path: [{ x: 880, y: 420 }, { x: 1120, y: 420 }], speed: 78 },
    ],
  },
  {
    name: 'Night Docks',
    brief: 'Three parcels on the quay. Four patrols, thin shadows.',
    start: { x: 600, y: 438 },
    exit: { x: 608, y: 66, w: 64, h: 44 },
    parcels: [
      { x: 110, y: 110 },
      { x: 1170, y: 110 },
      { x: 680, y: 280 },
    ],
    walls: [
      ...border,
      { x: 180, y: 180, w: 300, h: 18 },
      { x: 800, y: 180, w: 300, h: 18 },
      { x: 180, y: 340, w: 220, h: 18 },
      { x: 880, y: 340, w: 220, h: 18 },
      { x: 430, y: 44, w: 18, h: 88 },
      { x: 832, y: 44, w: 18, h: 88 },
      { x: 620, y: 200, w: 18, h: 90 },
    ],
    crates: [
      { x: 300, y: 80, w: 52, h: 52 },
      { x: 920, y: 80, w: 52, h: 52 },
      { x: 520, y: 360, w: 52, h: 52 },
      { x: 710, y: 360, w: 52, h: 52 },
      { x: 90, y: 240, w: 52, h: 52 },
      { x: 1140, y: 240, w: 52, h: 52 },
      { x: 430, y: 240, w: 52, h: 52 },
      { x: 800, y: 240, w: 52, h: 52 },
    ],
    bushes: [
      { x: 560, y: 120, w: 160, h: 40 },
      { x: 240, y: 400, w: 130, h: 42 },
      { x: 910, y: 400, w: 130, h: 42 },
    ],
    guards: [
      { path: [{ x: 140, y: 150 }, { x: 1140, y: 150 }], speed: 80 },
      { path: [{ x: 140, y: 310 }, { x: 540, y: 310 }], speed: 72 },
      { path: [{ x: 740, y: 310 }, { x: 1140, y: 310 }], speed: 72 },
      { path: [{ x: 680, y: 430 }, { x: 680, y: 330 }], speed: 64 },
    ],
  },
];
