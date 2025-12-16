// @ts-check
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveTitle(/Autono/);
});

test('can navigate to create task', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.click('text=Post a Task'); // Assuming button text or use locator
    await expect(page).toHaveURL(/.*\/task\/create/);
});

test('discovery feed loads', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const card = page.locator('.bg-surface').first();
    await expect(card).toBeVisible();
});
