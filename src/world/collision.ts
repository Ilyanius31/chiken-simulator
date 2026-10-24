import { inWater, WORLD_HEIGHT, WORLD_WIDTH, type Vec, type WorldObject, TILE } from './map';
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export function collides(
  p: Vec,
  radius: number,
  objects: WorldObject[],
  inactive: ReadonlySet<string> = new Set(),
): boolean {
  if (p.x < radius || p.y < radius || p.x > WORLD_WIDTH - radius || p.y > WORLD_HEIGHT - radius)
    return true;
  if (
    inWater(p.x, p.y) ||
    inWater(p.x + radius, p.y) ||
    inWater(p.x - radius, p.y) ||
    inWater(p.x, p.y + radius) ||
    inWater(p.x, p.y - radius)
  )
    return true;
  return objects.some((o) => {
    if (!o.solid || inactive.has(o.id)) return false;
    if (o.width && o.height) {
      const dx = Math.max(Math.abs(p.x - o.x) - o.width / 2, 0),
        dy = Math.max(Math.abs(p.y - o.y) - o.height / 2, 0);
      return dx * dx + dy * dy < radius * radius;
    }
    return distance(p, o) < radius + o.radius;
  });
}
export function moveWithCollision(
  p: Vec,
  dx: number,
  dy: number,
  radius: number,
  objects: WorldObject[],
  inactive?: ReadonlySet<string>,
): void {
  // Small substeps prevent tunnelling through thin fences, including knockback.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8));
  for (let i = 0; i < steps; i++) {
    if (!collides({ x: p.x + dx / steps, y: p.y }, radius, objects, inactive)) p.x += dx / steps;
    if (!collides({ x: p.x, y: p.y + dy / steps }, radius, objects, inactive)) p.y += dy / steps;
  }
}
export function lineOfSight(
  a: Vec,
  b: Vec,
  objects: WorldObject[],
  inactive?: ReadonlySet<string>,
): boolean {
  const steps = Math.ceil(distance(a, b) / 16);
  for (let i = 1; i < steps; i++)
    if (
      collides(
        { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps },
        2,
        objects,
        inactive,
      )
    )
      return false;
  return true;
}
export function canTraverse(
  a: Vec,
  b: Vec,
  objects: WorldObject[],
  inactive?: ReadonlySet<string>,
): boolean {
  const steps = Math.ceil(distance(a, b) / 12);
  for (let i = 1; i <= steps; i++)
    if (
      collides(
        { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps },
        20,
        objects,
        inactive,
      )
    )
      return false;
  return true;
}
export function findPath(
  start: Vec,
  end: Vec,
  objects: WorldObject[],
  inactive?: ReadonlySet<string>,
): Vec[] {
  const cols = WORLD_WIDTH / TILE,
    rows = WORLD_HEIGHT / TILE;
  const key = (x: number, y: number) => y * cols + x,
    startX = Math.floor(start.x / TILE),
    startY = Math.floor(start.y / TILE),
    endX = Math.floor(end.x / TILE),
    endY = Math.floor(end.y / TILE);
  const startKey = key(startX, startY),
    goal = key(endX, endY),
    queue = [startKey],
    came = new Map<number, number>(),
    visited = new Set([startKey]);
  // Bounded breadth-first search on a small 48×36 grid. No external navigation library.
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i],
      x = current % cols,
      y = Math.floor(current / cols);
    if (current === goal) {
      const path: Vec[] = [];
      let at = current;
      while (at !== startKey) {
        path.unshift({ x: ((at % cols) + 0.5) * TILE, y: (Math.floor(at / cols) + 0.5) * TILE });
        at = came.get(at)!;
      }
      return path;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        n = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || visited.has(n)) continue;
      if (collides({ x: (nx + 0.5) * TILE, y: (ny + 0.5) * TILE }, 20, objects, inactive)) continue;
      visited.add(n);
      came.set(n, current);
      queue.push(n);
    }
  }
  return [];
}
