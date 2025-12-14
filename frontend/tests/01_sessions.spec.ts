import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for Sidebar to load
        await expect(page.getByText('履歴', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: '新しいセッション' })).toBeVisible();
        await page.waitForTimeout(1000); // Wait for potential re-render/hydration stability
    });

    test('should create, rename, and delete a session', async ({ page }) => {
        // 1. Create New Session
        // Use icon-based selector scoped to aside
        await page.locator('aside button:has(svg.lucide-plus)').click();

        // Wait for session to be active. 
        // New session usually has empty title in sidebar or specific ID.
        // Let's type in title to ensure it's "real".
        // Wait for list update.
        await page.waitForTimeout(1000); // Wait for async creation

        // Find the first session item (non-trash).
        const firstSession = page.locator('aside .group').first();
        await expect(firstSession).toBeVisible();
        await firstSession.hover();

        // Click Edit button (pencil icon)
        // Sidebar.tsx: <Edit3 size={14} /> is inside a button.
        const editButton = firstSession.locator('button:has(svg.lucide-edit-3)');
        // Use force: true because it's hidden until hover
        await editButton.click({ force: true });

        // Input should appear
        const titleInput = firstSession.locator('input[type="text"]');
        await expect(titleInput).toBeVisible();

        // Type new name
        const newName = `TestSession_${Date.now()}`;
        await titleInput.fill(newName);
        await titleInput.press('Enter');

        // Verify name updated
        await expect(page.getByText(newName)).toBeVisible();

        // 3. Delete Session
        // We need to use Selection Mode to delete for sure (since single item delete button might not be easily accessible/visible)

        // 4. Delete via Selection Mode
        await page.getByText('選択モード').click();

        // Checkbox should appear. Select the first one.
        // Use first checkbox in list (ignoring "Select All" if exists, but currently no select all).
        // Locator for checkbox: inside the session item
        const checkbox = firstSession.locator('input[type="checkbox"]');
        await checkbox.check();

        // Click Delete button in toolbar
        // The toolbar appears when Selection Mode is active.
        const deleteButton = page.getByRole('button', { name: '削除' });
        await expect(deleteButton).toBeVisible();
        await deleteButton.click();

        // Confirm Dialog
        await expect(page.getByText('削除の確認')).toBeVisible();
        await page.getByRole('button', { name: '削除する' }).click();

        // Verify it's gone from list (or moved to trash)
        await expect(page.getByText(newName)).not.toBeVisible();

        // 5. Verify in Trash
        const trashButton = page.getByRole('button', { name: 'ゴミ箱' });
        // Locator by title "ゴミ箱を表示"
        await page.locator('button[title="ゴミ箱を表示"]').click();

        // Now we are in Trash mode
        await expect(page.getByText('ゴミ箱', { exact: true })).toBeVisible(); // Header title changes
        await expect(page.getByText(newName)).toBeVisible(); // Session is here

        // 6. Empty Trash
        // "ゴミ箱を空にする" button
        page.on('dialog', dialog => dialog.accept());
        await page.getByText('ゴミ箱を空にする').click();
        await expect(page.getByText('ゴミ箱は空です')).toBeVisible();
    });
});
