import { ENEMIES, type EnemyKind, type AttackKind } from './config';
import { makeFighter, moveFighter, setBlock, startAttack, type Fighter } from './combat';
import { distance, findPath, lineOfSight, canTraverse } from '../world/collision';
import { zoneAt, type Vec, type WorldObject, type EnemySpawn } from '../world/map';
export interface Enemy extends Fighter {
  kind: EnemyKind;
  home: Vec;
  state: 'patrol' | 'chase' | 'return' | 'recover';
  decision: number;
  navTimer: number;
  path: Vec[];
  destination: Vec;
  deadFor: number;
  active: boolean;
  eggTimer: number;
  bonusEggs: number;
}
export function createEnemy(spawn: EnemySpawn): Enemy {
  const cfg = ENEMIES[spawn.kind];
  return {
    ...makeFighter(spawn.id, spawn.x, spawn.y, cfg.hp, 100, cfg.power, cfg.speed),
    kind: spawn.kind,
    home: { x: spawn.x, y: spawn.y },
    state: 'patrol',
    decision: 0.5,
    navTimer: 0,
    path: [],
    destination: { x: spawn.x, y: spawn.y },
    deadFor: 0,
    active: spawn.kind !== 'champion',
    eggTimer: 18,
    bonusEggs: 0,
  };
}
export function updateAI(
  e: Enemy,
  p: Fighter,
  dt: number,
  objects: WorldObject[],
  inactive: ReadonlySet<string>,
  random = Math.random,
): boolean {
  if (!e.active || e.hp <= 0) return false;
  const cfg = ENEMIES[e.kind],
    dist = distance(e, p);
  e.decision -= dt;
  e.navTimer -= dt;
  e.eggTimer -= dt;
  const sight =
    dist < cfg.detection && lineOfSight(e, p, objects, inactive) && zoneAt(p) !== 'village';
  if (sight && e.state === 'patrol') {
    e.state = 'chase';
    e.decision = 0.4;
  }
  if (
    e.state === 'chase' &&
    (distance(e, e.home) > 480 || distance(p, e.home) > 600 || zoneAt(p) === 'village')
  ) {
    e.state = 'return';
    e.blocking = false;
  }
  if (e.state === 'return' && distance(e, e.home) < 40) {
    e.state = 'patrol';
    e.hp = e.maxHp;
  }
  if (e.attack || e.stun > 0 || e.lay > 0) {
    e.moving = false;
    return false;
  }
  if (e.blocking && e.decision > 0) {
    e.moving = false;
    return false;
  }
  setBlock(e, false);
  if (e.decision <= 0) {
    e.decision = cfg.reaction * (0.8 + random() * 0.5);
    if (e.state === 'chase' && dist < 125 && sight) {
      if (e.kind === 'champion' && p.attack && random() < 0.32) {
        setBlock(e, true);
        return false;
      }
      if (e.stamina < 23 || random() < 0.12) {
        e.state = 'recover';
        e.destination = { x: e.x + (e.x - p.x) * 0.6, y: e.y + (e.y - p.y) * 0.6 };
      } else {
        e.angle = Math.atan2(p.y - e.y, p.x - e.x);
        const r = random();
        const kind: AttackKind =
          e.kind === 'rookie'
            ? 'peck'
            : e.kind === 'speedy'
              ? r < 0.8
                ? 'peck'
                : 'wing'
              : e.kind === 'bramble'
                ? r < 0.6
                  ? 'wing'
                  : 'kick'
                : r < 0.5
                  ? 'kick'
                  : r < 0.8
                    ? 'wing'
                    : 'peck';
        startAttack(e, kind);
        return false;
      }
    } else if (e.state === 'recover') {
      e.state = 'chase';
    } else if (e.state === 'patrol') {
      const a = random() * Math.PI * 2;
      e.destination = { x: e.home.x + Math.cos(a) * 90, y: e.home.y + Math.sin(a) * 90 };
    }
  }
  if (e.state === 'patrol' && e.eggTimer <= 0 && random() < 0.01) {
    e.lay = 1.1;
    e.bonusEggs++;
    e.eggTimer = 40;
    return true;
  }
  const goal = e.state === 'chase' ? p : e.state === 'return' ? e.home : e.destination;
  if (e.state === 'chase' && dist < 68) {
    e.moving = false;
    return false;
  }
  let waypoint = goal;
  // Pathfind even after sight is lost during an existing pursuit; initial detection always needs sight.
  if (!canTraverse(e, goal, objects, inactive) || e.path.length) {
    if (e.navTimer <= 0) {
      e.path = findPath(e, goal, objects, inactive);
      e.navTimer = 0.8;
    }
    while (e.path.length && distance(e, e.path[0]) < 25) e.path.shift();
    waypoint = e.path[0] ?? e.home;
  }
  const d = distance(e, waypoint);
  if (d > 10)
    moveFighter(e, { x: (waypoint.x - e.x) / d, y: (waypoint.y - e.y) / d }, dt, objects, inactive);
  else e.moving = false;
  return false;
}
