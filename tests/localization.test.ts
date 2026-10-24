import { describe, expect, it } from 'vitest';
import { t } from '../src/localization';
import { OBJECTS, ZONES } from '../src/world/map';
import { ATTACKS, ENEMIES, UPGRADES } from '../src/core/config';
import { eggCount } from '../src/localization/ru';

describe('Russian player-facing content', () => {
  it.each([
    [0, '0 яиц'],
    [1, '1 яйцо'],
    [2, '2 яйца'],
    [5, '5 яиц'],
    [11, '11 яиц'],
    [12, '12 яиц'],
    [21, '21 яйцо'],
    [24, '24 яйца'],
    [111, '111 яиц'],
    [121, '121 яйцо'],
  ])('declines %s eggs correctly', (count, expected) => {
    expect(eggCount(Number(count))).toBe(expected);
  });
  it('localizes map, all NPC dialogue, enemies and abilities while leaving IDs stable', () => {
    const strings = [
      ...OBJECTS.flatMap((o) => [o.label, o.dialogue].filter((v): v is string => !!v)),
      ...ZONES.flatMap((z) => [z.name, z.subtitle]),
      ...Object.values(ENEMIES).map((e) => e.name),
      ...Object.values(ATTACKS).map((a) => a.name),
      ...Object.values(UPGRADES).flatMap((u) => [u.title, u.description]),
    ];
    for (const text of strings) {
      expect(text).toMatch(/[А-Яа-яЁё]/);
      expect(text.replace(/\bWASD\b/g, '')).not.toMatch(/[A-Za-z]{2,}/);
    }
    expect(OBJECTS.find((o) => o.id === 'pip')?.label).toBe(t.objects.pip);
    expect(ZONES.map((z) => z.id)).toEqual(['village', 'fields', 'forest', 'arena']);
  });
  it('keeps recovery and data-protection notices translated', () => {
    for (const value of Object.values(t.saves)) {
      expect(value).toMatch(/[А-Яа-яЁё]/);
      expect(value).not.toMatch(/[A-Za-z]{2,}/);
    }
    expect(t.notices.reward(21)).toBe('+21 яйцо');
    expect(t.hud.seconds(7)).toBe('7 с');
  });
});
