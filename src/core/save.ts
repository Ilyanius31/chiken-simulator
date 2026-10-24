import type { UpgradeKind } from './config';
import { SPAWN, WORLD_HEIGHT, WORLD_WIDTH, type ZoneId } from '../world/map';
export interface Progress {
  version: 2;
  eggs: number;
  wins: number;
  losses: number;
  stage: number;
  unlocked: number;
  bestTime: number | null;
  bestCombo: number;
  eggReadyAt: number;
  upgrades: Record<UpgradeKind, number>;
  settings: { sound: boolean };
  world: {
    x: number;
    y: number;
    visited: ZoneId[];
    objects: Record<string, number>;
    talked: boolean;
    rookies: number;
    earned: number;
    champion: boolean;
  };
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export const SAVE_KEY = 'chicken-simulator:v2',
  LEGACY_KEY = 'chicken-simulator:v1',
  BACKUP_KEY = SAVE_KEY + ':backup';
export function freshProgress(): Progress {
  return {
    version: 2,
    eggs: 0,
    wins: 0,
    losses: 0,
    stage: 0,
    unlocked: 1,
    bestTime: null,
    bestCombo: 0,
    eggReadyAt: 0,
    upgrades: { attack: 0, health: 0, stamina: 0, production: 0 },
    settings: { sound: true },
    world: {
      ...SPAWN,
      visited: ['village'],
      objects: {},
      talked: false,
      rookies: 0,
      earned: 0,
      champion: false,
    },
  };
}
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
const number = (v: unknown, fallback = 0, max = 1_000_000) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : fallback;
export function validateProgress(value: unknown): Progress {
  const v = record(value),
    p = freshProgress(),
    u = record(v.upgrades),
    s = record(v.settings),
    w = record(v.world);
  for (const key of ['eggs', 'wins', 'losses', 'stage', 'bestCombo'] as const)
    p[key] = number(v[key]);
  p.unlocked = number(v.unlocked, 1, 3) || 1;
  p.eggReadyAt = number(v.eggReadyAt, 0, Date.now() + 30000);
  p.bestTime =
    typeof v.bestTime === 'number' && Number.isFinite(v.bestTime) && v.bestTime > 0
      ? v.bestTime
      : null;
  for (const key of Object.keys(p.upgrades) as UpgradeKind[])
    p.upgrades[key] = number(u[key], 0, 5);
  p.settings.sound = typeof s.sound === 'boolean' ? s.sound : true;
  p.world.x = Math.max(32, number(w.x, SPAWN.x, WORLD_WIDTH - 32));
  p.world.y = Math.max(32, number(w.y, SPAWN.y, WORLD_HEIGHT - 32));
  p.world.visited = Array.isArray(w.visited)
    ? [
        ...new Set(
          w.visited.filter((z): z is ZoneId =>
            ['village', 'fields', 'forest', 'arena'].includes(String(z)),
          ),
        ),
      ]
    : ['village'];
  p.world.talked = w.talked === true;
  p.world.champion = w.champion === true;
  p.world.rookies = number(w.rookies);
  p.world.earned = number(w.earned, p.eggs);
  for (const [key, val] of Object.entries(record(w.objects))) {
    if (
      key.length < 80 &&
      typeof val === 'number' &&
      Number.isFinite(val) &&
      (val === -1 || val >= 0)
    )
      p.world.objects[key] = val;
  }
  return p;
}
export class SaveStore {
  warning = '';
  private protectedVersion = false;
  constructor(private storage: StorageLike) {}
  load(): Progress {
    for (const key of [SAVE_KEY, BACKUP_KEY, LEGACY_KEY, LEGACY_KEY + ':backup']) {
      try {
        const raw = this.storage.getItem(key);
        if (!raw) continue;
        const parsed: unknown = JSON.parse(raw),
          version = record(parsed).version;
        if (version !== 1 && version !== 2) {
          if (key === SAVE_KEY) {
            this.protectedVersion = true;
            this.warning = 'Newer save detected. Original progress is protected.';
            return freshProgress();
          }
          continue;
        }
        if (key.includes('backup')) this.warning = 'Progress recovered from your backup.';
        if (version === 1)
          this.warning = 'Your eggs and upgrades from v0.1 have moved into the Roostlands.';
        return validateProgress(parsed);
      } catch {
        this.warning = 'Save unavailable or damaged. Using a healthy backup when available.';
      }
    }
    return freshProgress();
  }
  save(p: Progress): boolean {
    if (this.protectedVersion) return false;
    try {
      const old = this.storage.getItem(SAVE_KEY);
      if (old) {
        try {
          const v: unknown = JSON.parse(old);
          if (record(v).version === 2) this.storage.setItem(BACKUP_KEY, old);
        } catch {
          /* Keep the healthy backup. */
        }
      }
      this.storage.setItem(SAVE_KEY, JSON.stringify(p));
      return true;
    } catch {
      this.warning = 'Storage is unavailable. Progress stays in this tab.';
      return false;
    }
  }
  reset(): Progress {
    this.protectedVersion = false;
    for (const key of [SAVE_KEY, BACKUP_KEY, LEGACY_KEY, LEGACY_KEY + ':backup']) {
      try {
        this.storage.removeItem(key);
      } catch {
        /* Session-only reset. */
      }
    }
    const p = freshProgress();
    this.save(p);
    return p;
  }
}
