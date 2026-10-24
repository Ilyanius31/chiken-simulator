import { ATTACKS, BALANCE, type AttackKind } from './config';
import { distance, moveWithCollision } from '../world/collision';
import type { Vec, WorldObject } from '../world/map';
export interface Attack {
  kind: AttackKind;
  time: number;
  hits: Set<string>;
  angle: number;
}
export interface Fighter extends Vec {
  id: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  power: number;
  speed: number;
  angle: number;
  moving: boolean;
  blocking: boolean;
  blockLock: number;
  invulnerable: number;
  stun: number;
  hurt: number;
  lay: number;
  attack: Attack | null;
  cooldowns: Record<AttackKind, number>;
  combo: number;
  comboTime: number;
  lastKind: AttackKind | null;
}
export function makeFighter(
  id: string,
  x: number,
  y: number,
  hp = 200,
  stamina = 100,
  power = 1,
  speed = BALANCE.speed,
): Fighter {
  return {
    id,
    x,
    y,
    hp,
    maxHp: hp,
    stamina,
    maxStamina: stamina,
    power,
    speed,
    angle: Math.PI / 2,
    moving: false,
    blocking: false,
    blockLock: 0,
    invulnerable: 0,
    stun: 0,
    hurt: 0,
    lay: 0,
    attack: null,
    cooldowns: { peck: 0, wing: 0, kick: 0 },
    combo: 0,
    comboTime: 0,
    lastKind: null,
  };
}
export function damageFor(kind: AttackKind, power: number, blocked: boolean, combo = 1): number {
  return Math.max(
    1,
    Math.round(
      ATTACKS[kind].damage *
        power *
        (1 + Math.min(3, Math.max(0, combo - 1)) * 0.1) *
        (blocked ? 1 - BALANCE.blockReduction : 1),
    ),
  );
}
export function startAttack(f: Fighter, kind: AttackKind): boolean {
  const a = ATTACKS[kind];
  if (
    f.hp <= 0 ||
    f.attack ||
    f.blocking ||
    f.stun > 0 ||
    f.lay > 0 ||
    f.cooldowns[kind] > 0 ||
    f.stamina < a.cost
  )
    return false;
  f.stamina -= a.cost;
  f.cooldowns[kind] = a.cooldown;
  f.attack = { kind, time: 0, hits: new Set(), angle: f.angle };
  return true;
}
export function setBlock(f: Fighter, request: boolean): void {
  f.blocking =
    request &&
    f.hp > 0 &&
    !f.attack &&
    f.lay <= 0 &&
    f.stun <= 0 &&
    f.blockLock <= 0 &&
    f.stamina > 4;
}
export function tickFighter(f: Fighter, dt: number): void {
  for (const key of Object.keys(f.cooldowns) as AttackKind[])
    f.cooldowns[key] = Math.max(0, f.cooldowns[key] - dt);
  for (const key of ['invulnerable', 'stun', 'hurt', 'lay', 'blockLock', 'comboTime'] as const)
    f[key] = Math.max(0, f[key] - dt);
  if (f.comboTime === 0) {
    f.combo = 0;
    f.lastKind = null;
  }
  if (f.blocking) {
    f.stamina = Math.max(0, f.stamina - BALANCE.blockDrain * dt);
    if (f.stamina <= 4) {
      f.blocking = false;
      f.blockLock = 1;
    }
  } else f.stamina = Math.min(f.maxStamina, f.stamina + BALANCE.regen * (f.attack ? 0.4 : 1) * dt);
  if (f.attack) {
    f.attack.time += dt;
    const cfg = ATTACKS[f.attack.kind];
    if (f.attack.time > cfg.windup + cfg.active + cfg.recovery) f.attack = null;
  }
}
export function moveFighter(
  f: Fighter,
  input: Vec,
  dt: number,
  objects: WorldObject[],
  inactive?: ReadonlySet<string>,
): void {
  const length = Math.hypot(input.x, input.y),
    scale = Math.max(1, length);
  f.moving = length > 0.05 && f.hp > 0 && f.stun <= 0 && f.lay <= 0;
  if (!f.moving) return;
  if (!f.attack) f.angle = Math.atan2(input.y, input.x);
  const speed = f.speed * (f.blocking ? 0.45 : f.attack ? 0.65 : 1);
  moveWithCollision(
    f,
    (input.x / scale) * speed * dt,
    (input.y / scale) * speed * dt,
    BALANCE.radius,
    objects,
    inactive,
  );
}
export const angleDifference = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function inAttackArc(a: Fighter, target: Vec, radius = 20): boolean {
  if (!a.attack) return false;
  const cfg = ATTACKS[a.attack.kind];
  const d = distance(a, target);
  return (
    d <= cfg.range + radius &&
    Math.abs(angleDifference(Math.atan2(target.y - a.y, target.x - a.x), a.attack.angle)) <=
      cfg.arc / 2 + Math.asin(Math.min(1, radius / Math.max(1, d)))
  );
}
export interface HitEvent extends Vec {
  damage: number;
  blocked: boolean;
  kind: AttackKind;
  combo: number;
  targetId: string;
}
export function resolveHit(
  a: Fighter,
  b: Fighter,
  objects: WorldObject[],
  inactive?: ReadonlySet<string>,
): HitEvent | null {
  const attack = a.attack;
  if (!attack || a.hp <= 0 || b.hp <= 0 || attack.hits.has(b.id) || b.invulnerable > 0) return null;
  const cfg = ATTACKS[attack.kind];
  if (attack.time < cfg.windup || attack.time > cfg.windup + cfg.active || !inAttackArc(a, b))
    return null;
  attack.hits.add(b.id);
  a.combo = a.comboTime > 0 && a.lastKind !== attack.kind ? Math.min(4, a.combo + 1) : 1;
  a.lastKind = attack.kind;
  a.comboTime = BALANCE.comboWindow;
  const blocked = b.blocking && b.stamina >= 8;
  const damage = damageFor(attack.kind, a.power, blocked, a.combo);
  b.hp = Math.max(0, b.hp - damage);
  b.hurt = 0.22;
  b.invulnerable = 0.38;
  b.stun = blocked ? 0.04 : 0.12;
  if (blocked) {
    b.stamina = Math.max(0, b.stamina - cfg.cost * 0.6);
    if (b.stamina < 8) {
      b.blocking = false;
      b.blockLock = 1;
    }
  } else {
    b.attack = null;
    b.blocking = false;
  }
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  moveWithCollision(
    b,
    Math.cos(angle) * cfg.knockback * (blocked ? 0.2 : 1),
    Math.sin(angle) * cfg.knockback * (blocked ? 0.2 : 1),
    BALANCE.radius,
    objects,
    inactive,
  );
  return { x: b.x, y: b.y, damage, blocked, kind: attack.kind, combo: a.combo, targetId: b.id };
}
export function separateFighters(
  a: Fighter,
  b: Fighter,
  objects: WorldObject[],
  inactive?: ReadonlySet<string>,
): void {
  const d = distance(a, b),
    gap = BALANCE.radius * 2;
  if (d >= gap) return;
  const angle = d < 0.01 ? 0 : Math.atan2(b.y - a.y, b.x - a.x),
    amount = (gap - d) / 2;
  moveWithCollision(a, -Math.cos(angle) * amount, -Math.sin(angle) * amount, 20, objects, inactive);
  moveWithCollision(b, Math.cos(angle) * amount, Math.sin(angle) * amount, 20, objects, inactive);
}
