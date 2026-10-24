import { t } from '../localization';
export interface Vec {
  x: number;
  y: number;
}
export type ZoneId = 'village' | 'fields' | 'forest' | 'arena';
export type ObjectKind =
  | 'house'
  | 'shop'
  | 'tree'
  | 'bush'
  | 'rock'
  | 'log'
  | 'fence'
  | 'nest'
  | 'crate'
  | 'dummy'
  | 'npc'
  | 'sign'
  | 'bell'
  | 'stash'
  | 'hay'
  | 'banner'
  | 'mushroom'
  | 'flower';
export interface WorldObject extends Vec {
  id: string;
  kind: ObjectKind;
  radius: number;
  solid: boolean;
  variant: number;
  label?: string;
  dialogue?: string;
  width?: number;
  height?: number;
}
export interface EnemySpawn extends Vec {
  id: string;
  kind: 'rookie' | 'speedy' | 'bramble' | 'champion';
}
export const TILE = 64,
  WORLD_WIDTH = 3072,
  WORLD_HEIGHT = 2304;
export const SPAWN = { x: 704, y: 704 };
export const ZONES: {
  id: ZoneId;
  name: string;
  subtitle: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  {
    id: 'village',
    name: t.zones.village.name,
    subtitle: t.zones.village.subtitle,
    color: '#9acb7a',
    x: 0,
    y: 0,
    w: 1536,
    h: 1152,
  },
  {
    id: 'fields',
    name: t.zones.fields.name,
    subtitle: t.zones.fields.subtitle,
    color: '#bfce78',
    x: 1536,
    y: 0,
    w: 1536,
    h: 1152,
  },
  {
    id: 'forest',
    name: t.zones.forest.name,
    subtitle: t.zones.forest.subtitle,
    color: '#618b75',
    x: 0,
    y: 1152,
    w: 1536,
    h: 1152,
  },
  {
    id: 'arena',
    name: t.zones.arena.name,
    subtitle: t.zones.arena.subtitle,
    color: '#bbbf88',
    x: 1536,
    y: 1152,
    w: 1536,
    h: 1152,
  },
];
export function zoneAt(p: Vec): ZoneId {
  return p.y < 1152 ? (p.x < 1536 ? 'village' : 'fields') : p.x < 1536 ? 'forest' : 'arena';
}
export function onPath(x: number, y: number): boolean {
  return (
    (Math.abs(y - 672) < 54 && x > 220 && x < 2850) ||
    (Math.abs(x - 704) < 54 && y > 420 && y < 1860) ||
    (Math.abs(x - 2304) < 54 && y > 610 && y < 1870) ||
    (Math.abs(y - 1792) < 54 && x > 650 && x < 2400) ||
    (Math.abs(x - 576) < 45 && y > 430 && y < 710)
  );
}
export const PONDS = [
  { x: 1120, y: 192, w: 320, h: 256 },
  { x: 2600, y: 820, w: 260, h: 230 },
];
export function inWater(x: number, y: number): boolean {
  return PONDS.some(
    (p) => ((x - p.x - p.w / 2) / (p.w / 2)) ** 2 + ((y - p.y - p.h / 2) / (p.h / 2)) ** 2 < 1,
  );
}
function random(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function createMap(): WorldObject[] {
  const objects: WorldObject[] = [];
  let serial = 0;
  const add = (kind: ObjectKind, x: number, y: number, extra: Partial<WorldObject> = {}) => {
    const object: WorldObject = {
      id: `${kind}-${serial++}`,
      kind,
      x,
      y,
      radius: 20,
      solid: false,
      variant: serial % 3,
      ...extra,
    };
    objects.push(object);
    return object;
  };
  add('house', 380, 330, { solid: true, width: 150, height: 130, radius: 80 });
  add('house', 920, 340, { solid: true, width: 138, height: 120, radius: 76, variant: 1 });
  add('house', 360, 920, { solid: true, width: 132, height: 112, radius: 72, variant: 2 });
  add('shop', 576, 464, {
    id: 'shop',
    solid: true,
    width: 146,
    height: 102,
    radius: 75,
    label: t.objects.shop,
    dialogue: t.objects.shopMotto,
  });
  add('npc', 800, 704, {
    id: 'pip',
    label: t.objects.pip,
    dialogue: t.dialogue.pip,
  });
  add('npc', 440, 810, {
    label: t.objects.mabel,
    dialogue: t.dialogue.mabel,
  });
  add('dummy', 980, 570, {
    id: 'dummy',
    solid: true,
    radius: 24,
    label: t.objects.dummy,
    dialogue: t.dialogue.dummy,
  });
  add('nest', 450, 585, { id: 'village-nest', label: t.objects.villageNest });
  add('sign', 1280, 620, {
    label: t.objects.trailSign,
    dialogue: t.dialogue.trails,
  });
  add('sign', 760, 1040, {
    label: t.objects.forestTrail,
    dialogue: t.dialogue.forest,
  });
  for (let x = 260; x <= 1060; x += 64) {
    if (x < 510 || x > 660)
      add('fence', x, 465, { solid: true, width: 60, height: 15, radius: 30 });
  }
  for (const [x, y] of [
    [1750, 420],
    [2060, 880],
    [2780, 470],
    [1780, 1010],
    [1040, 1510],
    [330, 1890],
  ])
    add('nest', x, y, { label: t.objects.nest });
  for (const [x, y] of [
    [1650, 730],
    [1960, 420],
    [2480, 650],
    [2780, 1010],
    [820, 1460],
    [1210, 1920],
  ])
    add('crate', x, y, { solid: true, radius: 23, label: t.objects.crate });
  for (const [x, y] of [
    [2800, 260],
    [1420, 1000],
    [290, 1460],
    [450, 2110],
    [1400, 2080],
  ])
    add('stash', x, y, { label: t.objects.stash });
  for (const [x, y] of [
    [1830, 350],
    [2150, 500],
    [2720, 680],
    [1940, 980],
  ])
    add('hay', x, y, { solid: true, width: 76, height: 52, radius: 40 });
  for (const [x, y] of [
    [450, 1370],
    [1000, 1660],
    [350, 2000],
    [1260, 1370],
  ])
    add('log', x, y, { solid: true, width: 100, height: 34, radius: 45 });
  add('sign', 1640, 1740, {
    label: t.objects.arenaTrail,
    dialogue: t.dialogue.arena,
  });
  add('bell', 2304, 1480, {
    id: 'arena-bell',
    label: t.objects.bell,
    dialogue: t.dialogue.bell,
  });
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    if (i % 6 === 0) continue;
    add('fence', 2304 + Math.cos(a) * 360, 1830 + Math.sin(a) * 330, {
      solid: true,
      width: 50,
      height: 18,
      radius: 25,
    });
    if (i % 2 === 0)
      add('npc', 2304 + Math.cos(a) * 400, 1830 + Math.sin(a) * 365, {
        label: t.objects.spectator,
        dialogue: t.dialogue.spectators[i % 3],
      });
  }
  for (const x of [2110, 2498]) add('banner', x, 1490, { solid: true, radius: 13 });
  const rnd = random(73);
  for (let i = 0; i < 620; i++) {
    const x = 70 + rnd() * (WORLD_WIDTH - 140),
      y = 70 + rnd() * (WORLD_HEIGHT - 140),
      zone = zoneAt({ x, y });
    if (
      onPath(x, y) ||
      inWater(x, y) ||
      objects.some((o) => Math.hypot(x - o.x, y - o.y) < (o.width ? o.width / 2 : 55) + 45) ||
      Math.hypot(x - SPAWN.x, y - SPAWN.y) < 180
    )
      continue;
    if (zone === 'arena' && Math.hypot(x - 2304, y - 1830) < 450) continue;
    const roll = rnd(),
      kind: ObjectKind =
        zone === 'forest'
          ? roll < 0.6
            ? 'tree'
            : roll < 0.7
              ? 'rock'
              : roll < 0.85
                ? 'mushroom'
                : 'bush'
          : roll < 0.23
            ? 'tree'
            : roll < 0.29
              ? 'rock'
              : roll < 0.55
                ? 'bush'
                : 'flower';
    add(kind, x, y, {
      solid: kind === 'tree' || kind === 'rock',
      radius: kind === 'tree' ? 26 : kind === 'rock' ? 23 : 15,
      variant: Math.floor(rnd() * 3),
    });
  }
  return objects;
}
export const ENEMY_SPAWNS: EnemySpawn[] = [
  { id: 'rookie-east', kind: 'rookie', x: 1792, y: 672 },
  { id: 'rookie-nest', kind: 'rookie', x: 2100, y: 920 },
  { id: 'speedy-fields', kind: 'speedy', x: 2510, y: 520 },
  { id: 'rookie-far', kind: 'rookie', x: 2790, y: 710 },
  { id: 'bramble-trail', kind: 'bramble', x: 704, y: 1408 },
  { id: 'speedy-forest', kind: 'speedy', x: 1100, y: 1792 },
  { id: 'bramble-grove', kind: 'bramble', x: 520, y: 1940 },
  { id: 'champion', kind: 'champion', x: 2304, y: 1856 },
];
export const OBJECTS = createMap();
