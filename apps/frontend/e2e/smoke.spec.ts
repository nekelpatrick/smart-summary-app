import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Paste to Summary/);
    
    // Check that the main heading is visible
    await expect(page.locator('h1')).toContainText('Paste to Summary');
    
    // Check that the instructions section is visible
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    
    // Check that the "Try Example" button is visible
    await expect(page.getByRole('button', { name: 'Try Example' })).toBeVisible();
    
    // Check that the text input area is visible
    await expect(page.getByPlaceholder('Paste your text here or start typing...')).toBeVisible();
  });

  test('page has correct meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /Instantly summarize any text using AI/);
    
    // Check that the page has proper viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
  });
}); 