import { test, expect, type Page } from '@playwright/test';
async function start(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: /LET’S RUFFLE/ }).click();
}
test('menu, egg, shop, settings, reset confirmation, and reload persistence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Rule the roost/ })).toBeVisible();
  await page.getByRole('button', { name: /Make an egg/ }).click();
  await expect(page.locator('#wallet')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#wallet')).toHaveText('1');
  await expect(page.locator('#menu-egg-button')).toContainText('READY IN');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch').click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: 'RESET SAVE', exact: true }).click();
  await page.getByRole('button', { name: 'KEEP MY FLOCK' }).click();
  await expect(page.locator('#wallet')).toHaveText('1');
  await page.getByRole('button', { name: /BACK TO THE YARD/ }).click();
  await page.getByRole('button', { name: 'UPGRADES', exact: true }).click();
  await expect(page.locator('.upgrade-card')).toHaveCount(4);
  await expect(page.locator('.buy').first()).toBeDisabled();
  expect(errors).toEqual([]);
});
test('keyboard combat reaches a real victory, rewards, purchase and next rival', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  await start(page);
  await page.keyboard.down('d');
  await page.keyboard.down('j');
  await expect(page.getByRole('heading', { name: /Top of the flock/ })).toBeVisible({
    timeout: 65_000,
  });
  await page.keyboard.up('d');
  await page.keyboard.up('j');
  const firstEggs = Number(await page.locator('#wallet').textContent());
  expect(firstEggs).toBeGreaterThanOrEqual(3);
  await page.getByRole('button', { name: /NEXT FIGHT/ }).click();
  await expect(page.locator('.enemy-status')).toContainText('SPEEDY ROOSTER');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'On the perch.' })).toBeVisible();
  await page.getByRole('button', { name: 'BACK TO MENU', exact: true }).click();
  await page.getByRole('button', { name: 'LEAVE & KEEP PROGRESS' }).click();
  await page.reload();
  await expect(page.locator('#wallet')).toHaveText(String(firstEggs));
  await expect(page.locator('.stat').first()).toContainText('1 WINS');
  // Earn enough currency through the public egg action, using the browser's controlled clock.
  await page.clock.install();
  for (let i = 0; i < 8 - firstEggs; i++) {
    await page.clock.runFor(31_000);
    await page.getByRole('button', { name: /Make an egg/ }).click();
  }
  await page.getByRole('button', { name: 'UPGRADES', exact: true }).click();
  await page.locator('[data-action="buy:attack"]').click();
  await expect(page.locator('.upgrade-card').first()).toContainText('LEVEL 1 / 5');
  await page.reload();
  await page.getByRole('button', { name: 'UPGRADES', exact: true }).click();
  await expect(page.locator('.upgrade-card').first()).toContainText('LEVEL 1 / 5');
  expect(errors).toEqual([]);
});
test('touch multitouch, pointer cancel, blur pause and portrait guidance', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await start(page);
  const cdp = await context.newCDPSession(page);
  const right = await page.locator('[data-control="right"]').boundingBox(),
    peck = await page.locator('[data-control="peck"]').boundingBox();
  expect(right).not.toBeNull();
  expect(peck).not.toBeNull();
  const points = [right!, peck!].map((b, id) => ({
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
    id,
  }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await expect(page.locator('[data-control="right"]')).toHaveClass(/held/);
  await expect(page.locator('[data-control="peck"]')).toHaveClass(/held/);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.held')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'On the perch.' })).toBeVisible();
  await page.getByRole('button', { name: /RESUME FIGHT/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('A little more wing room')).toBeVisible();
  await context.close();
});
test('layouts fit mobile and desktop without page overflow', async ({ page }) => {
  for (const size of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('./');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/menu-${size.width}.png` });
    await page.getByRole('button', { name: 'UPGRADES', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
