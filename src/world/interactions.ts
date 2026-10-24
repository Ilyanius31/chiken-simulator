import { t } from '../localization';
import type { Progress } from '../core/save';
import { awardEggs } from '../core/economy';
import { distance } from './collision';
import type { Vec, WorldObject } from './map';
export const INTERACTIVE = ['nest', 'crate', 'dummy', 'shop', 'npc', 'sign', 'bell', 'stash'];
export function available(o: WorldObject, p: Progress, now: number): boolean {
  const state = p.world.objects[o.id];
  return state !== -1 && (!state || state <= now);
}
export function nearestInteraction(
  player: Vec,
  objects: WorldObject[],
  p: Progress,
  now: number,
): WorldObject | null {
  let selected: WorldObject | null = null,
    best = Infinity;
  for (const o of objects) {
    if (!INTERACTIVE.includes(o.kind)) continue;
    if (['crate', 'stash'].includes(o.kind) && !available(o, p, now)) continue;
    const d = distance(player, o) - Math.min(o.radius, 55);
    if (d < 80 && d < best) {
      selected = o;
      best = d;
    }
  }
  return selected;
}
export function collectObject(o: WorldObject, p: Progress, now: number): number {
  if (!available(o, p, now) || !['nest', 'crate', 'stash'].includes(o.kind)) return 0;
  const amount = o.kind === 'stash' ? 5 : o.kind === 'nest' ? 3 : o.variant === 0 ? 0 : 2;
  p.world.objects[o.id] = o.kind === 'nest' ? now + 60_000 : -1;
  awardEggs(p, amount);
  return amount;
}
export function objectives(p: Progress): { label: string; done: boolean; target: Vec }[] {
  return [
    { label: t.objectives.meet, done: p.world.talked, target: { x: 800, y: 704 } },
    {
      label: t.objectives.rookie,
      done: p.world.rookies > 0,
      target: { x: 1792, y: 672 },
    },
    {
      label: t.objectives.eggs(p.world.earned),
      done: p.world.earned >= 10,
      target: { x: 1750, y: 420 },
    },
    {
      label: t.objectives.upgrade,
      done: Object.values(p.upgrades).some((x) => x > 0),
      target: { x: 576, y: 464 },
    },
    {
      label: t.objectives.forest,
      done: p.world.visited.includes('forest'),
      target: { x: 704, y: 1280 },
    },
    {
      label: t.objectives.champion,
      done: p.world.champion,
      target: { x: 2304, y: 1480 },
    },
  ];
}
