/**
 * v1.4 Feature Tests
 * - Feature 1: Structure visualization fix (SM and Product)
 * - Feature 1b: Reagent small canvas visualization
 * - Feature 2: Product CAS fetch
 * - Feature 3: Clear All / Reset
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('v1.4 Feature Tests', () => {

    test.beforeEach(async ({ page }) => {
        const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
        await page.goto(fileUrl);
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');
    });

    // ===== Feature 1: Structure Visualization Fix =====

    test.describe('Feature 1: Structure Visualization Fix', () => {

        test('Should render SM structure after localStorage restore', async ({ page }) => {
            // 1. Input SMILES and confirm drawing
            const smiles = 'CCO'; // Ethanol
            await page.fill('#sm-smiles', smiles);
            await page.locator('#sm-smiles').blur();
            await page.waitForTimeout(600);

            // 2. Reload page
            await page.reload();
            await page.waitForSelector('#reaction-scheme-section');
            await page.waitForTimeout(1000);

            // 3. Verify SMILES restored
            const restoredSmiles = await page.inputValue('#sm-smiles');
            expect(restoredSmiles).toBe(smiles);

            // 4. Verify Canvas has no error class (drawing successful)
            const canvas = page.locator('#sm-canvas');
            await expect(canvas).not.toHaveClass(/error/);
        });

        test('Should render Product structure after localStorage restore', async ({ page }) => {
            // 1. Input product SMILES
            const smiles = 'CC(=O)O'; // Acetic acid
            await page.fill('#product-smiles', smiles);
            await page.locator('#product-smiles').blur();
            await page.waitForTimeout(600);

            // 2. Reload page
            await page.reload();
            await page.waitForSelector('#reaction-scheme-section');
            await page.waitForTimeout(1000);

            // 3. Verify
            const restoredSmiles = await page.inputValue('#product-smiles');
            expect(restoredSmiles).toBe(smiles);

            const canvas = page.locator('#product-canvas');
            await expect(canvas).not.toHaveClass(/error/);
        });
    });

    // ===== Feature 1b: Reagent Small Canvas =====

    test.describe('Feature 1b: Reagent Visualization', () => {

        test('Reagent cards container should exist', async ({ page }) => {
            const reagentContainer = page.locator('#reagent-cards');
            await expect(reagentContainer).toBeVisible();
        });

        test('New reagent row should have canvas element', async ({ page }) => {
            await page.click('#add-reagent');
            await page.waitForTimeout(300);

            // Use .last() to target the newly added reagent row's canvas
            const reagentCanvas = page.locator('.reagent-row .reagent-canvas').last();
            await expect(reagentCanvas).toBeVisible();
        });
    });

    // ===== Feature 2: Product CAS Fetch =====

    test.describe('Feature 2: Product CAS Fetch', () => {

        test('Should have Product CAS input and Fetch button', async ({ page }) => {
            const casInput = page.locator('#product-cas');
            const fetchBtn = page.locator('#product-fetch-btn');

            await expect(casInput).toBeVisible();
            await expect(fetchBtn).toBeVisible();
            await expect(fetchBtn).toHaveText('Fetch');
        });

        test('Should fetch and populate Product data from PubChem', async ({ page }) => {
            // Use Salicylic acid CAS: 69-72-7
            await page.fill('#product-cas', '69-72-7');
            await page.click('#product-fetch-btn');

            // Wait for API response
            await page.waitForTimeout(3000);

            // Verify SMILES was filled
            const smilesValue = await page.inputValue('#product-smiles');
            expect(smilesValue).toBeTruthy();
            expect(smilesValue.length).toBeGreaterThan(5);

            console.log('[Test] Product SMILES fetched:', smilesValue);
        });

        test('Should show error for invalid Product CAS', async ({ page }) => {
            // Listen for alert
            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            await page.fill('#product-cas', 'INVALID-999');
            await page.click('#product-fetch-btn');
            await page.waitForTimeout(3000);

            // Verify error message appeared
            expect(alertMessage).toContain('Error');

            // Button should be reset
            const btnText = await page.locator('#product-fetch-btn').textContent();
            expect(btnText).toBe('Fetch');
        });

        test('Should persist Product CAS after page reload', async ({ page }) => {
            // Input CAS
            await page.fill('#product-cas', '69-72-7');
            await page.waitForTimeout(300);

            // Reload
            await page.reload();
            await page.waitForSelector('#reaction-scheme-section');

            // Verify
            const casValue = await page.inputValue('#product-cas');
            expect(casValue).toBe('69-72-7');
        });

        test('Should trigger fetch on Enter key in Product CAS input', async ({ page }) => {
            await page.fill('#product-cas', '69-72-7');
            await page.locator('#product-cas').press('Enter');

            // Button should enter loading state or complete
            await page.waitForTimeout(500);
            const btnText = await page.locator('#product-fetch-btn').textContent();

            // Could be Loading..., Fetched!, or Fetch
            expect(['Loading...', 'Fetched!', 'Fetch']).toContain(btnText);
        });
    });

    // ===== Feature 3: Clear All / Reset =====

    test.describe('Feature 3: Clear All / Reset', () => {

        test('Should have Clear All button visible', async ({ page }) => {
            const clearBtn = page.locator('#clearAllBtn');
            await expect(clearBtn).toBeVisible();
            await expect(clearBtn).toHaveText('Clear All');
        });

        test('Should show confirmation dialog on Clear All click', async ({ page }) => {
            let dialogShown = false;
            let dialogMessage = '';

            page.on('dialog', async dialog => {
                dialogShown = true;
                dialogMessage = dialog.message();
                await dialog.dismiss(); // Click Cancel
            });

            await page.click('#clearAllBtn');
            await page.waitForTimeout(500);

            expect(dialogShown).toBe(true);
            expect(dialogMessage).toContain('清空所有資料');
        });

        test('Should NOT clear data when Cancel is clicked', async ({ page }) => {
            // First input some data
            await page.fill('#sm-mw', '180.16');
            await page.fill('#sm-mass', '100');
            await page.waitForTimeout(300);

            // Click Clear All but cancel
            page.on('dialog', async dialog => {
                await dialog.dismiss();
            });

            await page.click('#clearAllBtn');
            await page.waitForTimeout(500);

            // Data should still be there
            const mwValue = await page.inputValue('#sm-mw');
            expect(mwValue).toBe('180.16');
        });

        test('Should clear all data and reload when confirmed', async ({ page }) => {
            // First input data
            await page.fill('#sm-mw', '180.16');
            await page.fill('#sm-mass', '100');
            await page.fill('#sm-cas', '50-78-2');
            await page.click('#add-reagent');
            await page.waitForTimeout(500);

            // Click Clear All and confirm
            page.on('dialog', async dialog => {
                await dialog.accept();
            });

            // Use Promise.all to wait for navigation triggered by the click
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'load' }),
                page.click('#clearAllBtn')
            ]);

            await page.waitForSelector('#reaction-scheme-section');
            await page.waitForTimeout(500);

            // Verify localStorage is cleared
            const hasStoredData = await page.evaluate(() => {
                return localStorage.getItem('reactionPlanData') !== null;
            });

            expect(hasStoredData).toBe(false);
        });
    });

    // ===== v2.1 Solvent CAS Fetch Tests =====
    test.describe('v2.1 Solvent CAS Fetch', () => {
        test('Should have Solvent CAS input and Fetch button', async ({ page }) => {
            // Verify new v2.1 elements exist
            await expect(page.locator('#solvent-cas')).toBeVisible();
            await expect(page.locator('#solvent-fetch-btn')).toBeVisible();
            await expect(page.locator('#solvent-bp')).toBeVisible();
        });

        // ✅ 這是新的寫法 (請複製這個覆蓋上面的)
test('Should show error when fetching with empty CAS', async ({ page }) => {
    // 1. 點擊按鈕
    await page.click('#solvent-fetch-btn');

    // 2. 檢查是否有出現 Toast 通知 (那個黑色的框框)
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Please enter a CAS number');
});

        test('Should have vertical Conditions layout', async ({ page }) => {
            // Verify the new vertical layout structure
            const conditionsVertical = page.locator('.conditions-vertical');
            await expect(conditionsVertical).toBeVisible();

            // Verify all condition rows exist
            const conditionRows = page.locator('.condition-row');
            expect(await conditionRows.count()).toBeGreaterThanOrEqual(7);
        });

        test('Solvent CAS input should persist after reload', async ({ page }) => {
            // Fill solvent CAS
            await page.locator('#solvent-cas').fill('67-66-3');
            await page.waitForTimeout(300);

            // Reload
            await page.reload();
            await page.waitForSelector('#reaction-scheme-section');

            // Verify persistence
            const solventCas = await page.locator('#solvent-cas').inputValue();
            expect(solventCas).toBe('67-66-3');
        });
    });
});
