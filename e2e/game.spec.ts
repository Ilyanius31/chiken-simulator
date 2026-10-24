import { test, expect, type Page } from '@playwright/test';
import { OBJECTS, type Vec } from '../src/world/map';
import { findPath, distance } from '../src/world/collision';
interface Snapshot extends Vec {
  hp: number;
  stamina: number;
  angle: number;
}
const position = async (p: Page): Promise<Snapshot> =>
  JSON.parse((await p.locator('#world').getAttribute('data-player'))!);
async function begin(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: /ENTER THE ROOSTLANDS|CONTINUE ADVENTURE/ }).click();
}
async function walkDirect(page: Page, target: Vec) {
  for (let step = 0; step < 180; step++) {
    const p = await position(page);
    if (distance(p, target) < 12) break;
    const dx = target.x - p.x,
      dy = target.y - p.y,
      keys: string[] = [];
    if (Math.abs(dx) > 8) keys.push(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 8) keys.push(dy > 0 ? 's' : 'w');
    for (const k of keys) await page.keyboard.down(k);
    await page.clock.runFor(Math.min(270, Math.max(35, (distance(p, target) / 220) * 850)));
    for (const k of keys) await page.keyboard.up(k);
    if (step === 179)
      throw new Error(`Movement blocked at ${JSON.stringify(p)} toward ${JSON.stringify(target)}`);
  }
}
async function walk(page: Page, target: Vec) {
  const p = await position(page),
    path = findPath(p, target, OBJECTS);
  expect(path.length, `route to ${JSON.stringify(target)}`).toBeGreaterThan(0);
  for (const point of path) await walkDirect(page, point);
  await walkDirect(page, target);
}
async function fightNearby(page: Page, kind = 'rookie') {
  for (let i = 0; i < 650; i++) {
    const enemies = JSON.parse(
      (await page.locator('#world').getAttribute('data-enemies'))!,
    ) as (Vec & { hp: number; kind: string })[];
    const enemy = enemies
      .filter((e) => e.kind === kind)
      .sort((a, b) => distance(a, { x: 1792, y: 672 }) - distance(b, { x: 1792, y: 672 }))[0];
    if (enemy.hp <= 0) return;
    const p = await position(page);
    expect(p.hp).toBeGreaterThan(0);
    const d = distance(p, enemy),
      keys: string[] = [];
    // Normal held keyboard controls, no mutation of game state or combat values.
    if (d > 48) {
      if (Math.abs(enemy.x - p.x) > 8) keys.push(enemy.x > p.x ? 'd' : 'a');
      if (Math.abs(enemy.y - p.y) > 8) keys.push(enemy.y > p.y ? 's' : 'w');
    }
    for (const k of keys) await page.keyboard.down(k);
    await page.keyboard.down('j');
    await page.clock.runFor(100);
    await page.keyboard.up('j');
    for (const k of keys) await page.keyboard.up(k);
  }
  throw Error('Encounter did not finish');
}
test('plays an exploration loop: NPC, nest, combat, eggs, physical shop, four zones and boss', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install();
  await begin(page);
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pip · village guide' })).toBeVisible();
  await page.getByRole('button', { name: /ON MY WAY/ }).click();
  await walk(page, { x: 480, y: 608 });
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('#eggs')).toHaveText('3');
  await page.getByRole('button', { name: 'Lay egg', exact: true }).click();
  await expect(page.locator('#eggs')).toHaveText('4');
  await page.clock.runFor(1300);
  console.log('Playthrough: village interactions complete');
  await walk(page, { x: 1696, y: 672 });
  await expect(page.locator('#zone-name')).toHaveText('Sunny Fields');
  await fightNearby(page);
  expect(Number(await page.locator('#eggs').textContent())).toBeGreaterThanOrEqual(7);
  console.log('Playthrough: Rookie defeated');
  await page.clock.runFor(1300);
  await page.clock.fastForward(31000);
  await page.getByRole('button', { name: 'Lay egg', exact: true }).click();
  await page.clock.runFor(1300);
  await walk(page, { x: 576, y: 576 });
  console.log(
    'Playthrough: shop arrival',
    await position(page),
    await page.locator('#eggs').textContent(),
  );
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Feather Forge' })).toBeVisible();
  await page.locator('[data-action="buy:attack"]').click();
  await expect(page.locator('.upgrade-card').first()).toContainText('LEVEL 1 / 5');
  await page.getByRole('button', { name: 'Close panel' }).click();
  console.log('Playthrough: upgrade purchased');
  await walk(page, { x: 704, y: 1248 });
  await expect(page.locator('#zone-name')).toHaveText('Dark Forest');
  await page.screenshot({ path: 'test-results/v02-forest.png' });
  // Return to the safe village and approach the arena via the eastern path.
  await walk(page, { x: 704, y: 672 });
  await page.clock.runFor(12000);
  await walk(page, { x: 2304, y: 1408 });
  await expect(page.locator('#zone-name')).toHaveText('Champion’s Arena');
  console.log('Playthrough: four zones visited');
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('#boss-bar')).toBeVisible();
  await page.screenshot({ path: 'test-results/v02-arena.png' });
  await fightNearby(page, 'champion');
  await expect(page.getByRole('heading', { name: 'Top of the flock.' })).toBeVisible();
  await page.getByRole('button', { name: 'KEEP EXPLORING' }).click();
  await page.getByRole('button', { name: 'Open world map' }).click();
  await expect(page.locator('.objectives-list')).toContainText('4 / 4 zones explored');
  await page.reload();
  await beginAfterReload(page);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('chicken-simulator:v2')!).upgrades.attack,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('chicken-simulator:v2')!).world.champion,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
async function beginAfterReload(page: Page) {
  await page.getByRole('button', { name: /ENTER THE ROOSTLANDS|CONTINUE ADVENTURE/ }).click();
}
test('mobile joystick moves on both axes alongside attacks, releases on cancel and pauses on blur', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.clock.install();
  await begin(page);
  const start = await position(page),
    cdp = await context.newCDPSession(page);
  const stick = await page.locator('.joystick').boundingBox(),
    peck = await page.getByRole('button', { name: 'Peck', exact: true }).boundingBox();
  expect(stick).not.toBeNull();
  expect(peck).not.toBeNull();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { id: 1, x: stick!.x + stick!.width / 2 + 25, y: stick!.y + stick!.height / 2 - 25 },
      { id: 2, x: peck!.x + 20, y: peck!.y + 20 },
    ],
  });
  await page.clock.runFor(400);
  const moved = await position(page);
  expect(moved.x).toBeGreaterThan(start.x + 20);
  expect(moved.y).toBeLessThan(start.y - 20);
  expect(moved.stamina).toBeLessThan(100);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.held')).toHaveCount(0);
  const stopped = await position(page);
  await page.clock.runFor(400);
  expect(distance(stopped, await position(page))).toBeLessThan(3);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'On the perch.' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('A wider world awaits.')).toBeVisible();
  await context.close();
});
test('migrates a real legacy save, preserves purchases and sound, and confirms reset', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('chicken-simulator:v2'))
      localStorage.setItem(
        'chicken-simulator:v1',
        JSON.stringify({
          version: 1,
          eggs: 20,
          wins: 3,
          upgrades: { health: 2 },
          settings: { sound: false },
        }),
      );
  });
  await page.clock.install();
  await begin(page);
  await expect(page.locator('#eggs')).toHaveText('20');
  await expect(page.locator('#hp-label')).toContainText('250 / 250');
  await walk(page, { x: 576, y: 576 });
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await page.locator('[data-action="buy:attack"]').click();
  await expect(page.locator('.shop-wallet')).toContainText('12');
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: 'RESET', exact: true }).click();
  await page.getByRole('button', { name: 'KEEP MY PROGRESS' }).click();
  await expect(page.locator('#eggs')).toHaveText('12');
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('chicken-simulator:v2')!).upgrades.attack,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('chicken-simulator:v1')!).eggs),
  ).toBe(20);
});
test('mobile layouts, world map and settings remain usable without overlapping controls', async ({
  page,
}) => {
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await page.screenshot({ path: `test-results/v02-menu-${viewport.width}.png` });
    await beginAfterReload(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test-results/v02-world-${viewport.width}.png` });
    const joystick = await page.locator('.joystick').boundingBox(),
      actions = await page.locator('.actions').boundingBox(),
      hud = await page.locator('.player-card').boundingBox(),
      map = await page.locator('.map-corner').boundingBox();
    expect(joystick!.x + joystick!.width).toBeLessThan(actions!.x);
    expect(hud!.x + hud!.width).toBeLessThan(map!.x);
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await page.getByRole('button', { name: 'Open world map' }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `test-results/v02-map-${viewport.width}.png` });
    await expect(page.locator('.objectives-list')).toBeVisible();
  }
});
