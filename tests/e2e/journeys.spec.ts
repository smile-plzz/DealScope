import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Product description').fill('Acme A100 headphones');
  await page.getByRole('button', { name: 'Start my comparison' }).click();
  await page.getByLabel('Brand', { exact: true }).fill('Acme');
  await page.getByLabel('Model', { exact: true }).fill('A100');
  await page.getByRole('button', { name: 'Confirm & find offers' }).click();
  await expect(page.getByRole('heading', { name: 'Your shortlist' })).toBeVisible();
}
test('text → manual offer → uncertain total → save → clear', async ({ page }) => {
  await start(page);
  await expect(page.getByRole('heading', { name: 'No verified offers found yet' })).toBeVisible();
  await page.getByLabel('Seller product URL').fill('https://example.com/headphones');
  await page.getByLabel('Seller name').fill('User Shop');
  await page.locator('input[name=brand]').fill('Acme');
  await page.locator('input[name=model]').fill('A100');
  await page.getByLabel('Item price (৳)').fill('1299');
  await page.locator('select[name=condition]').selectOption('new');
  await page.locator('select[name=stock]').selectOption('in-stock');
  await page.getByRole('button', { name: 'Add to shortlist' }).click();
  await expect(page.getByText('User-provided · unverified')).toBeVisible();
  await expect(page.getByText('Unconfirmed', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Not enough evidence yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View seller page' })).toHaveAttribute(
    'href',
    'https://example.com/headphones',
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await expect(page.getByText('User-provided · unverified')).toBeVisible();
  await page.goto('/history');
  await page.getByRole('button', { name: 'Clear history' }).click();
  await page.getByRole('button', { name: 'Delete all comparisons' }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start' })).toBeVisible();
});
test('Facebook fallback in one action', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Paste a link' }).click();
  await page.getByLabel('Product or Facebook URL').fill('https://www.facebook.com/reel/123');
  await page.getByRole('button', { name: 'Start my comparison' }).click();
  await expect(page.getByRole('status')).toContainText("couldn't identify");
  await expect(page.getByLabel('Product description')).toBeVisible();
});
test('image without AI has description fallback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload an image' }).click();
  await page.locator('input[type=file]').setInputFiles('public/icon-192.png');
  await page.getByRole('button', { name: 'Start my comparison' }).click();
  await expect(page.getByRole('status')).toContainText('describe the screenshot');
  await expect(page.getByLabel('Product description')).toBeVisible();
});
test('AI outage preserves manual flow', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Product description').fill('Acme headphones');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Start my comparison' }).click();
  await expect(page.getByRole('status')).toContainText('unavailable');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Acme headphones');
});
test('demo is explicit and has no purchase links', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample comparison' }).click();
  await expect(page.getByText('Illustrative sample only.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View seller page' })).toHaveCount(0);
});
test('accessible home and results; no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  const home = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(home.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await start(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('keyboard skip navigation and preferences persistence', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.goto('/settings');
  await page.getByLabel('Default delivery city / area').fill('Sylhet');
  await page.getByLabel('Appearance').selectOption('dark');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await page.goto('/');
  await expect(page.getByLabel('Delivery area', { exact: true })).toHaveValue('Sylhet');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
