// sanity.test.js — Playwright smoke test for LaTeX Copilot
const { test, expect } = require('@playwright/test');

test.describe('LaTeX Copilot Sanity', () => {
  test('page loads with all three panels', async ({ page }) => {
    await page.goto('http://localhost:5200');
    await expect(page.locator('h1')).toHaveText('LaTeX Copilot');
    await expect(page.locator('#panel-chat')).toBeVisible();
    await expect(page.locator('#panel-editor')).toBeVisible();
    await expect(page.locator('#panel-preview')).toBeVisible();
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#btn-send')).toBeVisible();
  });

  test('no JS errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://localhost:5200');
    await page.waitForTimeout(3000); // wait for async loads
    console.log('JS errors:', errors.length ? errors : 'NONE');
    expect(errors.length).toBe(0);
  });

  test('editor area has content (CodeMirror or textarea fallback)', async ({ page }) => {
    await page.goto('http://localhost:5200');
    await page.waitForTimeout(3000);
    
    // Check if CodeMirror loaded OR fallback textarea exists
    const hasCM = await page.locator('.cm-editor').count();
    const hasTA = await page.locator('.editor-fallback').count();
    console.log(`CodeMirror: ${hasCM}, Textarea fallback: ${hasTA}`);
    expect(hasCM + hasTA).toBeGreaterThan(0);
  });

  test('send a simple prompt and get LaTeX back', async ({ page }) => {
    await page.goto('http://localhost:5200');
    await page.waitForTimeout(2000);

    // Type a simple prompt
    await page.fill('#chat-input', 'Create a hello world document');
    await page.click('#btn-send');

    // Wait for the REAL AI response (not the loading indicator)
    // The loading msg has id="loading-msg", the real response doesn't
    console.log('Waiting for AI response...');
    await page.waitForFunction(() => {
      const msgs = document.querySelectorAll('.ai-message');
      // Real response = ai-message without id="loading-msg"
      return Array.from(msgs).some(m => m.id !== 'loading-msg');
    }, { timeout: 45000 });
    console.log('AI response received');

    // Wait for editor to update
    await page.waitForTimeout(1000);

    // Check editor has LaTeX content
    const editorText = await page.locator('.editor-fallback').inputValue();
    console.log('Editor content length:', editorText.length);
    console.log('First 200 chars:', editorText.substring(0, 200));
    
    await page.screenshot({ path: 'test-debug.png', fullPage: true });

    expect(editorText).toContain('\\documentclass');

    // Check preview rendered something
    const previewText = await page.locator('#preview-container').textContent();
    console.log('Preview content length:', previewText.length);
    expect(previewText.length).toBeGreaterThan(10);
  });

  test('screenshot the final state', async ({ page }) => {
    await page.goto('http://localhost:5200');
    await page.waitForTimeout(2000);
    await page.fill('#chat-input', 'Create a short thank you letter');
    await page.click('#btn-send');
    
    // Wait for response
    await expect(page.locator('.ai-message')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000); // let preview render
    
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
    console.log('Screenshot saved to test-screenshot.png');
  });
});
