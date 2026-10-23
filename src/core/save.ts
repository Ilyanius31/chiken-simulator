import type { UpgradeKind } from './config';
export interface Progress {
  version: 1;
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
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export const SAVE_KEY = 'chicken-simulator:v1';
const BACKUP_KEY = `${SAVE_KEY}:backup`;
export function freshProgress(): Progress {
  return {
    version: 1,
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
  };
}
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
function integer(value: unknown, fallback = 0, max = 1_000_000): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(max, Math.floor(value))
    : fallback;
}
export function validateProgress(value: unknown): Progress {
  const v = record(value),
    p = freshProgress(),
    u = record(v.upgrades),
    s = record(v.settings);
  for (const key of ['eggs', 'wins', 'losses', 'stage', 'bestCombo'] as const)
    p[key] = integer(v[key]);
  p.unlocked = integer(v.unlocked, 1, 3) || 1;
  p.eggReadyAt = integer(v.eggReadyAt, 0, Date.now() + 30_000);
  p.bestTime =
    typeof v.bestTime === 'number' && Number.isFinite(v.bestTime) && v.bestTime > 0
      ? v.bestTime
      : null;
  for (const key of Object.keys(p.upgrades) as UpgradeKind[])
    p.upgrades[key] = integer(u[key], 0, 5);
  p.settings.sound = typeof s.sound === 'boolean' ? s.sound : true;
  return p;
}
export class SaveStore {
  warning = '';
  constructor(private storage: StorageLike) {}
  load(): Progress {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (record(parsed).version !== 1) {
          this.warning = 'Unknown save version. Original save preserved.';
          this.protectedVersion = true;
          return freshProgress();
        }
        return validateProgress(parsed);
      }
    } catch {
      this.warning = 'Save recovered from backup where available.';
    }
    try {
      const backup = this.storage.getItem(BACKUP_KEY);
      if (backup) return validateProgress(JSON.parse(backup));
    } catch {
      this.warning = 'Storage is unavailable. Progress stays in this tab.';
    }
    return freshProgress();
  }
  private protectedVersion = false;
  save(p: Progress): boolean {
    if (this.protectedVersion) return false;
    try {
      const current = this.storage.getItem(SAVE_KEY);
      if (current) {
        try {
          const value: unknown = JSON.parse(current);
          if (record(value).version === 1) this.storage.setItem(BACKUP_KEY, current);
        } catch {
          /* Preserve the last healthy backup. */
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
    try {
      this.storage.removeItem(SAVE_KEY);
      this.storage.removeItem(BACKUP_KEY);
    } catch {
      /* Session-only reset. */
    }
    const p = freshProgress();
    this.save(p);
    return p;
  }
}
