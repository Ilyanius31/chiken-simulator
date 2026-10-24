import { describe, it, expect } from 'vitest';
import {
  makeFighter,
  damageFor,
  startAttack,
  tickFighter,
  setBlock,
  resolveHit,
  moveFighter,
  inAttackArc,
  separateFighters,
} from '../src/core/combat';
import { awardEggs, claimEgg, playerStats, purchase, upgradeCost } from '../src/core/economy';
import {
  freshProgress,
  SaveStore,
  SAVE_KEY,
  LEGACY_KEY,
  BACKUP_KEY,
  validateProgress,
  type StorageLike,
} from '../src/core/save';
import { createEnemy, updateAI } from '../src/core/ai';
import { Camera } from '../src/world/camera';
import {
  OBJECTS,
  SPAWN,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  zoneAt,
  type WorldObject,
} from '../src/world/map';
import {
  collides,
  findPath,
  lineOfSight,
  moveWithCollision,
  distance,
} from '../src/world/collision';
import {
  available,
  collectObject,
  nearestInteraction,
  objectives,
} from '../src/world/interactions';
import { WorldSimulation } from '../src/world/simulation';
const fighter = (id = 'a', x = 500, y = 500) => {
  const f = makeFighter(id, x, y);
  f.angle = 0;
  return f;
};
const wall: WorldObject = {
  id: 'wall',
  kind: 'fence',
  x: 600,
  y: 500,
  width: 20,
  height: 240,
  radius: 10,
  solid: true,
  variant: 0,
};
const storage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
};
describe('Top-down locomotion, camera and map', () => {
  it.each([
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])('moves on axis %s,%s with facing and delta time', (x, y) => {
    const f = fighter();
    moveFighter(f, { x, y }, 0.5, []);
    expect(f.x).toBeCloseTo(500 + x * 110);
    expect(f.y).toBeCloseTo(500 + y * 110);
    expect(f.angle).toBeCloseTo(Math.atan2(y, x));
  });
  it('normalizes diagonal movement and supports analog speed', () => {
    const f = fighter();
    moveFighter(f, { x: 1, y: 1 }, 1, []);
    expect(Math.hypot(f.x - 500, f.y - 500)).toBeCloseTo(220);
    const g = fighter();
    moveFighter(g, { x: 0.5, y: 0 }, 1, []);
    expect(g.x).toBeCloseTo(610);
  });
  it('slides against a solid wall without tunnelling on a large step', () => {
    const p = { x: 500, y: 500 };
    moveWithCollision(p, 300, 100, 20, [wall]);
    expect(p.x).toBeLessThanOrEqual(570);
    expect(p.y).toBeCloseTo(600);
  });
  it('blocks water, world edges and buildings; decoration is passable', () => {
    expect(collides({ x: 1280, y: 320 }, 20, [])).toBe(true);
    expect(collides({ x: 5, y: 500 }, 20, [])).toBe(true);
    expect(collides({ x: 380, y: 330 }, 20, OBJECTS)).toBe(true);
    const flower = OBJECTS.find((o) => o.kind === 'flower')!;
    expect(collides(flower, 1, [flower])).toBe(false);
  });
  it('clamps a smoothly following camera at every world edge', () => {
    const c = new Camera();
    c.resize(900, 500);
    c.follow({ x: 0, y: 0 }, 1, true);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    c.follow({ x: WORLD_WIDTH, y: WORLD_HEIGHT }, 1, true);
    expect(c.x).toBe(WORLD_WIDTH - 900);
    expect(c.y).toBe(WORLD_HEIGHT - 500);
    const before = c.x;
    c.follow(SPAWN, 0.016);
    expect(c.x).toBeLessThan(before);
    expect(c.x).toBeGreaterThan(SPAWN.x - 450);
  });
  it('transitions naturally between all four zones', () => {
    expect(zoneAt(SPAWN)).toBe('village');
    expect(zoneAt({ x: 1800, y: 672 })).toBe('fields');
    expect(zoneAt({ x: 704, y: 1408 })).toBe('forest');
    expect(zoneAt({ x: 2304, y: 1800 })).toBe('arena');
  });
  it('has navigable routes to every zone and the physical shop and bell', () => {
    for (const target of [
      { x: 1760, y: 672 },
      { x: 704, y: 1312 },
      { x: 2304, y: 1408 },
      { x: 2304, y: 1824 },
      { x: 576, y: 576 },
    ])
      expect(findPath(SPAWN, target, OBJECTS).length, JSON.stringify(target)).toBeGreaterThan(0);
  });
  it('keeps all enemy spawns outside impassable objects', () => {
    const w = new WorldSimulation(freshProgress());
    for (const e of w.enemies) expect(collides(e, 20, OBJECTS), e.id).toBe(false);
  });
});
describe('Directional combat and stamina', () => {
  it('balances damage, block, upgrades and bounded combo multipliers', () => {
    expect(damageFor('peck', 1, false)).toBe(9);
    expect(damageFor('kick', 1, true)).toBe(7);
    expect(damageFor('wing', 1.5, false, 3)).toBe(31);
    expect(damageFor('wing', 1, false, 99)).toBe(damageFor('wing', 1, false, 4));
  });
  it('hits only in its facing arc and range after a readable windup', () => {
    const a = fighter(),
      front = fighter('b', 560),
      back = fighter('c', 440);
    startAttack(a, 'peck');
    expect(resolveHit(a, front, [])).toBeNull();
    tickFighter(a, 0.14);
    expect(resolveHit(a, back, [])).toBeNull();
    expect(resolveHit(a, front, [])?.damage).toBe(9);
    expect(front.hp).toBe(191);
  });
  it('supports attacks up and down, and a wider wing arc', () => {
    const a = fighter(),
      b = fighter('b', 500, 430);
    a.angle = -Math.PI / 2;
    startAttack(a, 'peck');
    expect(inAttackArc(a, b)).toBe(true);
    a.attack = null;
    a.angle = Math.PI / 2;
    startAttack(a, 'wing');
    expect(inAttackArc(a, { x: 570, y: 510 })).toBe(true);
  });
  it('applies one hit per target per swing and a short invulnerability window', () => {
    const a = fighter(),
      b = fighter('b', 555);
    startAttack(a, 'wing');
    tickFighter(a, 0.24);
    resolveHit(a, b, []);
    b.x = 555;
    expect(resolveHit(a, b, [])).toBeNull();
    b.invulnerable = 0;
    expect(resolveHit(a, b, [])).toBeNull();
  });
  it('honors windup, recovery and individual cooldowns', () => {
    const a = fighter();
    expect(startAttack(a, 'kick')).toBe(true);
    expect(startAttack(a, 'peck')).toBe(false);
    tickFighter(a, 1.1);
    expect(a.attack).toBeNull();
    expect(startAttack(a, 'kick')).toBe(false);
    tickFighter(a, 1);
    expect(startAttack(a, 'kick')).toBe(true);
  });
  it('prevents attacking while guarding, laying, stunned, depleted or defeated', () => {
    for (const state of ['block', 'lay', 'stun', 'empty', 'dead']) {
      const a = fighter();
      if (state === 'block') setBlock(a, true);
      if (state === 'lay') a.lay = 1;
      if (state === 'stun') a.stun = 1;
      if (state === 'empty') a.stamina = 8;
      if (state === 'dead') a.hp = 0;
      expect(startAttack(a, 'peck'), state).toBe(false);
    }
  });
  it('drains limited block stamina, breaks guard and caps regeneration', () => {
    const a = fighter();
    a.stamina = 5;
    setBlock(a, true);
    tickFighter(a, 0.2);
    expect(a.blocking).toBe(false);
    expect(a.stamina).toBeGreaterThanOrEqual(0);
    expect(a.blockLock).toBeGreaterThan(0);
    setBlock(a, true);
    expect(a.blocking).toBe(false);
    tickFighter(a, 100);
    expect(a.stamina).toBe(a.maxStamina);
  });
  it('reduces blocked damage and moves knockback along both axes', () => {
    const a = fighter(),
      b = fighter('b', 545, 545);
    a.angle = Math.PI / 4;
    setBlock(b, true);
    startAttack(a, 'kick');
    tickFighter(a, 0.49);
    expect(resolveHit(a, b, [])?.blocked).toBe(true);
    expect(b.hp).toBe(193);
    expect(b.x).toBeGreaterThan(545);
    expect(b.y).toBeGreaterThan(545);
  });
  it('separates overlapping characters while respecting walls', () => {
    const a = fighter(),
      b = fighter('b', 505);
    separateFighters(a, b, []);
    expect(distance(a, b)).toBeCloseTo(40);
  });
});
describe('AI navigation and world encounters', () => {
  it('does not detect through an impassable obstacle or attack in the safe village', () => {
    const e = createEnemy({ id: 'e', kind: 'rookie', x: 1800, y: 600 }),
      p = fighter('p', 1950, 600);
    const cover = { ...wall, x: 1875, y: 600 };
    expect(lineOfSight(e, p, [cover])).toBe(false);
    updateAI(e, p, 1, [cover], new Set(), () => 0.5);
    expect(e.state).toBe('patrol');
    p.x = 1400;
    p.y = 600;
    updateAI(e, p, 1, [], new Set(), () => 0.5);
    expect(e.state).toBe('patrol');
  });
  it('navigates around a wall during a pursuit instead of remaining stuck', () => {
    const e = createEnemy({ id: 'e', kind: 'rookie', x: 1760, y: 672 }),
      p = fighter('p', 2040, 672),
      cover = { ...wall, x: 1880, y: 672, height: 200 };
    e.state = 'chase';
    for (let i = 0; i < 700; i++) {
      tickFighter(e, 1 / 60);
      updateAI(e, p, 1 / 60, [cover], new Set(), () => 0.5);
    }
    expect(distance(e, p)).toBeLessThan(120);
  });
  it('starts the champion only through the bell, awards victory and can withdraw', () => {
    const p = freshProgress(),
      w = new WorldSimulation(p);
    Object.assign(w.player, { x: 2304, y: 1420 });
    w.update(1 / 60, { move: { x: 0, y: 0 }, block: false, attack: null }, 1000);
    w.interact(1000);
    expect(w.bossActive).toBe(true);
    expect(w.enemies.find((e) => e.kind === 'champion')?.active).toBe(true);
    Object.assign(w.player, SPAWN);
    w.update(1 / 60, { move: { x: 0, y: 0 }, block: false, attack: null }, 1000);
    expect(w.bossActive).toBe(false);
    expect(w.enemies.find((e) => e.kind === 'champion')?.active).toBe(false);
  });
  it('finishes an actual rookie encounter with rewards and objective progress', () => {
    const p = freshProgress(),
      w = new WorldSimulation(p),
      e = w.enemies.find((e) => e.kind === 'rookie')!;
    Object.assign(w.player, { x: e.x - 55, y: e.y, angle: 0 });
    e.destination = { x: e.x, y: e.y };
    for (let i = 0; i < 1200 && e.hp > 0; i++) {
      const d = distance(w.player, e);
      w.update(
        1 / 60,
        {
          move: d > 45 ? { x: (e.x - w.player.x) / d, y: (e.y - w.player.y) / d } : { x: 0, y: 0 },
          block: false,
          attack: 'peck',
        },
        1000 + (i * 1000) / 60,
        () => 0.5,
      );
    }
    expect(e.hp).toBe(0);
    expect(p.eggs).toBeGreaterThanOrEqual(3);
    expect(p.world.rookies).toBe(1);
    expect(p.wins).toBe(1);
    expect(w.player.hp).toBeGreaterThan(0);
  });
  it('handles defeat and safe respawn without losing currency or upgrades', () => {
    const p = freshProgress();
    p.eggs = 18;
    p.upgrades.attack = 2;
    const w = new WorldSimulation(p);
    w.player.hp = 0;
    w.respawn();
    expect(w.player.x).toBe(SPAWN.x);
    expect(w.player.hp).toBe(w.player.maxHp);
    expect(w.player.power).toBe(1.2);
    expect(p.eggs).toBe(18);
  });
});
describe('World interactions and economy', () => {
  it('collects nests once per respawn, permanently opens crates and finds hidden rewards', () => {
    const p = freshProgress();
    const nest = OBJECTS.find((o) => o.id === 'village-nest')!,
      crate = OBJECTS.find((o) => o.kind === 'crate')!,
      stash = OBJECTS.find((o) => o.kind === 'stash')!;
    expect(collectObject(nest, p, 1000)).toBe(3);
    expect(collectObject(nest, p, 2000)).toBe(0);
    expect(available(nest, p, 61000)).toBe(true);
    collectObject(crate, p, 1000);
    expect(available(crate, p, 999999)).toBe(false);
    expect(collectObject(stash, p, 1000)).toBe(5);
    expect(p.world.earned).toBeGreaterThanOrEqual(8);
  });
  it('has functioning NPC, shop, dummy and bell interactions with proximity prompts', () => {
    const p = freshProgress(),
      w = new WorldSimulation(p);
    expect(nearestInteraction(SPAWN, OBJECTS, p, 1000)?.id).toBe('pip');
    w.interact(1000);
    expect(p.world.talked).toBe(true);
    Object.assign(w.player, { x: 576, y: 560 });
    w.interact(1000);
    expect(w.events.some((e) => e.type === 'shop')).toBe(true);
    Object.assign(w.player, { x: 980, y: 635, angle: -Math.PI / 2 });
    for (let i = 0; i < 20; i++)
      w.update(1 / 60, { move: { x: 0, y: 0 }, block: false, attack: 'peck' }, 1000);
    expect(w.events.some((e) => e.type === 'hit' && e.hit?.targetId === 'dummy')).toBe(true);
  });
  it('claims one egg per persisted real-time cooldown and improves production', () => {
    const p = freshProgress();
    expect(claimEgg(p, 1000)).toBe(true);
    expect(claimEgg(p, 30999)).toBe(false);
    expect(claimEgg(p, 31000)).toBe(true);
    expect(p.eggs).toBe(2);
    p.upgrades.production = 5;
    expect(playerStats(p).eggCooldown).toBe(10);
  });
  it('lays in the world, enters a vulnerable animation and preserves the award', () => {
    const p = freshProgress(),
      w = new WorldSimulation(p);
    expect(w.layEgg(1000)).toBe(true);
    expect(w.player.lay).toBeGreaterThan(0);
    expect(startAttack(w.player, 'kick')).toBe(false);
    expect(p.eggs).toBe(1);
    expect(w.events.some((e) => e.type === 'egg')).toBe(true);
  });
  it('purchases atomically, raises prices, applies real stats and enforces max level', () => {
    const p = freshProgress();
    expect(purchase(p, 'attack')).toBe(false);
    awardEggs(p, 8);
    expect(purchase(p, 'attack')).toBe(true);
    expect(p.eggs).toBe(0);
    expect(playerStats(p).power).toBe(1.1);
    expect(upgradeCost(p, 'attack')).toBeGreaterThan(8);
    p.upgrades.attack = 5;
    p.eggs = 999;
    expect(purchase(p, 'attack')).toBe(false);
    expect(p.eggs).toBe(999);
    const w = new WorldSimulation(p);
    expect(w.buy('health')).toBe(true);
    expect(w.player.maxHp).toBe(225);
  });
  it('tracks cumulative eggs even after spending, and all six objective conditions', () => {
    const p = freshProgress();
    awardEggs(p, 10);
    purchase(p, 'attack');
    expect(p.world.earned).toBe(10);
    p.world.talked = true;
    p.world.rookies = 1;
    p.world.visited.push('forest');
    p.world.champion = true;
    expect(objectives(p).every((o) => o.done)).toBe(true);
  });
});
describe('Save preservation and migration', () => {
  it('round trips progress, settings, exploration and object respawn state', () => {
    const m = storage(),
      s = new SaveStore(m),
      p = freshProgress();
    p.eggs = 19;
    p.upgrades.stamina = 3;
    p.settings.sound = false;
    p.world.objects['village-nest'] = 10000;
    p.world.visited.push('fields');
    s.save(p);
    expect(s.load()).toEqual(p);
  });
  it('migrates v0.1 eggs, upgrades, records and settings without modifying the legacy save', () => {
    const m = storage(),
      old = JSON.stringify({
        version: 1,
        eggs: 77,
        wins: 5,
        losses: 2,
        upgrades: { attack: 3, production: 2 },
        settings: { sound: false },
        bestTime: 34,
      });
    m.setItem(LEGACY_KEY, old);
    const s = new SaveStore(m),
      p = s.load();
    expect(p.version).toBe(2);
    expect(p.eggs).toBe(77);
    expect(p.upgrades.attack).toBe(3);
    expect(p.settings.sound).toBe(false);
    expect(p.wins).toBe(5);
    s.save(p);
    expect(m.getItem(LEGACY_KEY)).toBe(old);
    expect(s.load()).toEqual(p);
  });
  it('repairs individual malformed fields without erasing good progress', () => {
    const p = validateProgress({
      eggs: 22,
      wins: 9,
      losses: -8,
      upgrades: { attack: 300, stamina: 2 },
      world: { x: -5, y: 999999, visited: ['forest', 'bad'], objects: { bad: NaN, good: -1 } },
    });
    expect(p.eggs).toBe(22);
    expect(p.wins).toBe(9);
    expect(p.losses).toBe(0);
    expect(p.upgrades.attack).toBe(5);
    expect(p.world.x).toBe(SPAWN.x);
    expect(p.world.y).toBeLessThan(WORLD_HEIGHT);
    expect(p.world.visited).toEqual(['forest']);
    expect(p.world.objects).toEqual({ good: -1 });
  });
  it('recovers a healthy backup after JSON corruption', () => {
    const m = storage(),
      s = new SaveStore(m),
      p = freshProgress();
    p.eggs = 8;
    s.save(p);
    p.eggs = 9;
    s.save(p);
    m.setItem(SAVE_KEY, '{broken');
    expect(s.load().eggs).toBe(8);
    expect(s.warning).toBeTruthy();
  });
  it('handles absent or denied storage and protects unknown future save versions', () => {
    expect(new SaveStore(storage()).load()).toEqual(freshProgress());
    const denied = new SaveStore({
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
      removeItem: () => {
        throw Error();
      },
    });
    expect(denied.load().eggs).toBe(0);
    expect(denied.save(freshProgress())).toBe(false);
    const m = storage();
    m.setItem(SAVE_KEY, '{"version":99,"eggs":999}');
    const s = new SaveStore(m);
    s.load();
    expect(s.save(freshProgress())).toBe(false);
    expect(JSON.parse(m.getItem(SAVE_KEY)!).eggs).toBe(999);
  });
  it('only explicit reset clears both generations and their backups', () => {
    const m = storage(),
      s = new SaveStore(m);
    m.setItem(LEGACY_KEY, '{"version":1,"eggs":999}');
    m.setItem(BACKUP_KEY, '{"version":2,"eggs":123}');
    s.reset();
    expect(s.load().eggs).toBe(0);
    expect(m.getItem(LEGACY_KEY)).toBeNull();
    expect(m.getItem(BACKUP_KEY)).toBeNull();
  });
});
