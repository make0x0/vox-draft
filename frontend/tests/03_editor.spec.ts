import { test, expect } from '@playwright/test';

test.describe('Editor Interactions', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should allow typing in editor and prompt inputs', async ({ page }) => {
        // 1. Verify Layout
        const mainEditor = page.getByPlaceholder('# ここに生成結果が表示されます...');
        const promptInput = page.getByPlaceholder('AIへの指示・プロンプトを入力...');

        await expect(mainEditor).toBeVisible();
        await expect(promptInput).toBeVisible();

        // 2. Type in Main Editor
        const editorText = 'Manual content entry test.';
        await mainEditor.fill(editorText);
        await expect(mainEditor).toHaveValue(editorText);

        // 3. Type in Prompt Input
        const promptText = 'Summarize this.';
        await promptInput.fill(promptText);
        await expect(promptInput).toHaveValue(promptText);

        // 4. Verify Send Button State
        // Send button usually disabled if no content? Or enabled?
        // <button disabled={loading || !prompt} ...>
        // Prompt is filled, so should be enabled.
        const sendBtn = page.locator('button:has(svg.lucide-send)');
        await expect(sendBtn).toBeEnabled();

        // Clear prompt
        await promptInput.fill('');
        // App Logic: Button is ONLY disabled if generating. Empty prompt is allowed (shows error on click).
        await expect(sendBtn).toBeEnabled();
    });
});
