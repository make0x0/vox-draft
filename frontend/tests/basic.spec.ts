import { test, expect } from '@playwright/test';

test('basic ui sanity check', async ({ page }) => {
    // 1. Load Page
    await page.goto('/');

    // 2. Check Sidebar exists (Look for '履歴')
    await expect(page.getByText('履歴', { exact: true })).toBeVisible();

    // 3. Check Editor areas
    // Main Editor
    await expect(page.getByPlaceholder('# ここに生成結果が表示されます...')).toBeVisible();
    // Prompt Input
    await expect(page.getByPlaceholder('AIへの指示・プロンプトを入力...')).toBeVisible();

    // 4. Check "New Session" button
    await expect(page.getByText('新しいセッション')).toBeVisible();

    // 5. Open Settings (Find button with text "設定")
    await page.getByText('設定').click();

    // 6. Verify Settings Modal Title
    // Default tab is General Settings (Heading)
    await expect(page.getByRole('heading', { name: '一般設定' })).toBeVisible();
});
