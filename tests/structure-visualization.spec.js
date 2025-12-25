/**
 * Feature: Structure Visualization Tests
 * Goal: Test that chemical structures render correctly with SMILES input and CAS fetch
 * Related to: Dr. Chem v1.3 Structure Visualization Upgrade
 */

const { test, expect } = require('@playwright/test');

test.describe('Structure Visualization', () => {

    // ---------------------------------------------------------
    // 【新增這段】每次開始測試前，先做「大掃除」
    // ---------------------------------------------------------
    test.beforeEach(async ({ page }) => {
        // 1. 先前往頁面
        await page.goto('file://' + process.cwd() + '/index.html');
        
        // 2. 清空瀏覽器的 LocalStorage (把自動存檔的舊資料刪掉)
        await page.evaluate(() => localStorage.clear());
        
        // 3. 重新整理頁面，確保現在是乾乾淨淨的狀態
        await page.reload();
    });
    // ---------------------------------------------------------

    test('Should render Starting Material structure after CAS fetch', async ({ page }) => {
        // Enter aspirin CAS number
        await page.fill('#sm-cas', '50-78-2');
        await page.click('#sm-fetch-btn');

        // Wait for API response (PubChem can take a bit)
        await page.waitForTimeout(2000);

        // Check that canvas is visible
        const canvas = page.locator('#sm-canvas');
        const isVisible = await canvas.isVisible();
        expect(isVisible).toBe(true);

        // Verify SMILES field was populated
        const smilesValue = await page.inputValue('#sm-smiles');
        expect(smilesValue).toBeTruthy();
        expect(smilesValue.length).toBeGreaterThan(10);

        console.log('[Test] Aspirin SMILES:', smilesValue);
    });

    test('Should have ARIA labels on canvas elements', async ({ page }) => {
        // Check Starting Material canvas has proper ARIA attributes
        const smCanvas = page.locator('#sm-canvas');
        const smRole = await smCanvas.getAttribute('role');
        const smLabel = await smCanvas.getAttribute('aria-label');

        expect(smRole).toBe('img');
        expect(smLabel).toBeTruthy();
        expect(smLabel).toContain('molecular structure'); // 這裡放寬檢查，只要有 structure 關鍵字就好

        // Check Product canvas has proper ARIA attributes
        const prodCanvas = page.locator('#product-canvas');
        const prodRole = await prodCanvas.getAttribute('role');
        const prodLabel = await prodCanvas.getAttribute('aria-label');

        expect(prodRole).toBe('img');
        expect(prodLabel).toBeTruthy();
        // 這裡也放寬一點，因為初始狀態可能是 Empty
        expect(prodLabel.toLowerCase()).toMatch(/structure|empty/);
    });

    test('Should show stereochemistry warning for chiral compounds', async ({ page }) => {
        // Manually enter SMILES with chiral center (@ symbol)
        const chiralSmiles = 'C[C@H](O)c1ccccc1';  // (S)-1-phenylethanol
        
        // 【修改】使用 pressSequentially 模擬人類打字，每個字間隔 50ms
        // 這能確保 input 事件被正確觸發
        const input = page.locator('#sm-smiles');
        await input.clear();
        await input.pressSequentially(chiralSmiles, { delay: 50 });
        
        // 觸發事件
        await input.blur();

        // Check if warning is displayed
        const warning = page.locator('#sm-stereo-warning');
        
        // 給它多一點時間反應
        await expect(warning).toBeVisible({ timeout: 5000 });

        console.log('[Test] Stereochemistry warning shown for chiral SMILES');
    });

    test('Should hide stereochemistry warning for non-chiral compounds', async ({ page }) => {
        // Enter simple SMILES without chiral centers
        const simpleSmiles = 'CC(=O)O';  // Acetic acid
        await page.fill('#sm-smiles', simpleSmiles);
        await page.locator('#sm-smiles').blur();

        // Trigger structure rendering
        await page.waitForTimeout(500);

        // Warning should be hidden
        const warning = page.locator('#sm-stereo-warning');
        await expect(warning).toBeHidden();

        console.log('[Test] Stereochemistry warning hidden for simple SMILES');
    });

    test('Should handle invalid SMILES with error state', async ({ page }) => {
        // Enter invalid SMILES
        const invalidSmiles = 'INVALID123';
        await page.fill('#sm-smiles', invalidSmiles);
        await page.locator('#sm-smiles').blur();

        // Wait for rendering attempt
        await page.waitForTimeout(500);

        // Check for error state
        const canvas = page.locator('#sm-canvas');
        await expect(canvas).toHaveClass(/error/);

        // Check error message is displayed
        const errorMsg = page.locator('#sm-error');
        await expect(errorMsg).toContainText('Invalid SMILES');

        console.log('[Test] Error state shown for invalid SMILES');
    });

    test('Should clear structure when SMILES is removed', async ({ page }) => {
        // First enter valid SMILES
        await page.fill('#sm-smiles', 'CCO');  // Ethanol
        await page.locator('#sm-smiles').blur();
        await page.waitForTimeout(300);

        // Then clear it
        await page.fill('#sm-smiles', '');
        await page.locator('#sm-smiles').blur(); // 記得要 blur 觸發 change
        await page.waitForTimeout(300);

        // Error should be cleared
        const errorMsg = page.locator('#sm-error');
        await expect(errorMsg).toBeEmpty();

        // Warning should be hidden
        const warning = page.locator('#sm-stereo-warning');
        await expect(warning).toBeHidden();
        
        // Error class should be removed
        const canvas = page.locator('#sm-canvas');
        await expect(canvas).not.toHaveClass(/error/);

        console.log('[Test] Structure cleared when SMILES removed');
    });

    test('Should persist Starting Material structure after page reload', async ({ page }) => {
        // Set Starting Material with SMILES
        await page.fill('#sm-mw', '180.16');
        await page.fill('#sm-mass', '100');
        await page.fill('#sm-smiles', 'CC(=O)OC1=CC=CC=C1C(=O)O');  // Aspirin
        await page.locator('#sm-smiles').blur();

        await page.waitForTimeout(500);

        // Get SMILES before reload
        const smilesBefore = await page.inputValue('#sm-smiles');
        expect(smilesBefore).toBeTruthy();

        console.log('[Before Reload] SMILES:', smilesBefore);

        // Reload page
        // 注意：這裡不需要清空 LocalStorage，因為我們要測試的就是「存檔功能」
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');
        await page.waitForTimeout(500);

        // Verify SMILES persists
        const smilesAfter = await page.inputValue('#sm-smiles');
        expect(smilesAfter).toBe(smilesBefore);

        // Verify structure is re-rendered (canvas should be visible)
        const canvas = page.locator('#sm-canvas');
        const isVisible = await canvas.isVisible();
        expect(isVisible).toBe(true);

        console.log('[After Reload] SMILES:', smilesAfter);
    });

    test('Should render Product structure from SMILES input', async ({ page }) => {
        // Enter product SMILES
        const productSmiles = 'C1=CC=C(C=C1)CO';  // Benzyl alcohol
        await page.fill('#product-smiles', productSmiles);
        await page.locator('#product-smiles').blur();

        await page.waitForTimeout(500);

        // Verify canvas is visible
        const canvas = page.locator('#product-canvas');
        const isVisible = await canvas.isVisible();
        expect(isVisible).toBe(true);

        // Verify SMILES is stored
        const smilesValue = await page.inputValue('#product-smiles');
        expect(smilesValue).toBe(productSmiles);

        console.log('[Test] Product structure rendered:', productSmiles);
    });

    test('Should update ARIA label when structure is rendered', async ({ page }) => {
        // Enter SMILES
        const smiles = 'CC(C)O';  // Isopropanol
        await page.fill('#sm-smiles', smiles);
        await page.locator('#sm-smiles').blur();

        await page.waitForTimeout(500);

        // Check that ARIA label was updated (should contain compound info)
        const canvas = page.locator('#sm-canvas');
        const ariaLabel = await canvas.getAttribute('aria-label');

        expect(ariaLabel).toBeTruthy();
        // Should contain either "Molecular structure" or compound name
        expect(ariaLabel.toLowerCase()).toContain('structure');

        console.log('[Test] ARIA label:', ariaLabel);
    });

    test('Canvas should be responsive with proper dimensions', async ({ page }) => {
        // Get canvas element
        const canvas = page.locator('#sm-canvas');

        // Check canvas has width attribute set
        const width = await canvas.getAttribute('width');
        expect(width).toBe('450');  // v5.0: Consistent canvas size

        // Check canvas has height attribute set
        const height = await canvas.getAttribute('height');
        expect(height).toBe('300');  // v5.0: Consistent canvas size

        console.log('[Test] Canvas dimensions:', width, 'x', height);
    });
});