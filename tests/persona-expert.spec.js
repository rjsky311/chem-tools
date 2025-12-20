/**
 * Persona: Senior Chemist (Expert User)
 * Goal: Test system robustness and edge cases
 * Focus: Extreme values, rapid switching, error handling
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Persona: Expert Chemist - Robustness Testing', () => {
    test.beforeEach(async ({ page }) => {
        // Use file:// protocol to load local HTML file directly
        const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
        await page.goto(fileUrl);

        // Wait for page to be fully loaded
        await page.waitForSelector('#stoich-table');
        await page.waitForSelector('#add-reagent');
    });

    test('Edge Case 1: Extreme numerical values - Very small density', async ({ page }) => {
        // Add a reagent row
        await page.click('#add-reagent');

        // Select "Pure Liquid" type
        const reagentRow = page.locator('.reagent-row').first();
        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');

        // Fill in extreme values
        await reagentRow.locator('.reagent-mw').fill('100.0');
        await reagentRow.locator('.reagent-eq').fill('1.0');
        await reagentRow.locator('.reagent-density').fill('0.001'); // Extremely low density
        await reagentRow.locator('.reagent-purity').fill('99');

        // Set starting material to trigger calculation
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        // Wait for calculation
        await page.waitForTimeout(500);

        // Check that volume is calculated and not NaN/Infinity
        const volumeValue = await reagentRow.locator('.reagent-volume').inputValue();
        console.log('[Expert Test] Extreme low density - Volume:', volumeValue);

        expect(volumeValue).not.toBe('NaN');
        expect(volumeValue).not.toBe('Infinity');
        expect(volumeValue).not.toBe('');
        expect(parseFloat(volumeValue)).toBeGreaterThan(0);
    });

    test('Edge Case 2: Extreme numerical values - Very large molecular weight', async ({ page }) => {
        // Add a reagent row
        await page.click('#add-reagent');

        const reagentRow = page.locator('.reagent-row').first();
        await reagentRow.locator('.reagent-type').selectOption('pure-solid');

        // Fill in extreme MW
        await reagentRow.locator('.reagent-mw').fill('10000'); // Very large protein/polymer
        await reagentRow.locator('.reagent-eq').fill('0.5');
        await reagentRow.locator('.reagent-purity').fill('95');

        // Set starting material
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        // Check mass calculation
        const massValue = await reagentRow.locator('.reagent-mass').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Expert Test] Extreme MW - Mass:', massValue, 'mmol:', mmolText);

        expect(massValue).not.toBe('NaN');
        expect(massValue).not.toBe('Infinity');
        expect(mmolText).not.toContain('NaN');
        expect(parseFloat(massValue)).toBeGreaterThan(0);
    });

    test('Edge Case 3: Extreme numerical values - Very high purity (>100%)', async ({ page }) => {
        // This tests if validation works for purity
        await page.click('#add-reagent');

        const reagentRow = page.locator('.reagent-row').first();
        await reagentRow.locator('.reagent-type').selectOption('pure-solid');

        // Try to input >100% purity (should be prevented by max="100")
        await reagentRow.locator('.reagent-purity').fill('150');

        const purityValue = await reagentRow.locator('.reagent-purity').inputValue();
        console.log('[Expert Test] Purity validation - Input 150, got:', purityValue);

        // HTML5 validation should prevent this, but let's check what happens
        // If it allows, we need to add JS validation
        if (parseFloat(purityValue) > 100) {
            console.warn('[Expert Test] WARNING: Purity >100% was accepted!');
        }
    });

    test('Rapid Switching 1: Type switching clears old data correctly', async ({ page }) => {
        await page.click('#add-reagent');

        const reagentRow = page.locator('.reagent-row').first();

        // Set SM first
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await page.waitForTimeout(300);

        // Step 1: Pure Solid
        await reagentRow.locator('.reagent-type').selectOption('pure-solid');
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('2.0');
        await reagentRow.locator('.reagent-purity').fill('98');
        await page.waitForTimeout(300);

        const massValue1 = await reagentRow.locator('.reagent-mass').inputValue();
        console.log('[Rapid Switch] Step 1 (Pure Solid) - Mass:', massValue1);

        // Step 2: Switch to Pure Liquid
        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');
        await page.waitForTimeout(300);

        // Check that mass is cleared and volume/density appear
        const massCleared = await reagentRow.locator('.reagent-mass').inputValue();
        const volumeVisible = await reagentRow.locator('.reagent-volume').isVisible();
        const densityVisible = await reagentRow.locator('.reagent-density').isVisible();

        console.log('[Rapid Switch] Step 2 (Pure Liquid) - Mass cleared:', massCleared, 'Volume visible:', volumeVisible);

        expect(massCleared).toBe('');
        expect(volumeVisible).toBe(true);
        expect(densityVisible).toBe(true);

        // Fill in liquid data
        await reagentRow.locator('.reagent-density').fill('1.2');
        await page.waitForTimeout(300);

        const volumeValue = await reagentRow.locator('.reagent-volume').inputValue();
        console.log('[Rapid Switch] Step 2 - Volume calculated:', volumeValue);

        // Step 3: Switch to Solution (Molarity)
        await reagentRow.locator('.reagent-type').selectOption('solution-molarity');
        await page.waitForTimeout(300);

        // Check density is cleared and molarity appears
        const densityCleared = await reagentRow.locator('.reagent-density').inputValue();
        const molarityVisible = await reagentRow.locator('.reagent-molarity').isVisible();

        console.log('[Rapid Switch] Step 3 (Molarity) - Density cleared:', densityCleared, 'Molarity visible:', molarityVisible);

        expect(densityCleared).toBe('');
        expect(molarityVisible).toBe(true);

        // Fill molarity
        await reagentRow.locator('.reagent-molarity').fill('2.5');
        await page.waitForTimeout(300);

        const volumeValue2 = await reagentRow.locator('.reagent-volume').inputValue();
        console.log('[Rapid Switch] Step 3 - Volume recalculated:', volumeValue2);

        expect(volumeValue2).not.toBe('');
        expect(volumeValue2).not.toBe('NaN');
    });

    test('Rapid Switching 2: Multiple rapid switches in succession', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Set SM
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('1.5');

        // Rapid fire switching (simulating indecisive user)
        const types = ['pure-solid', 'pure-liquid', 'solution-molarity', 'solution-density', 'pure-solid'];

        for (const type of types) {
            await reagentRow.locator('.reagent-type').selectOption(type);
            await page.waitForTimeout(100); // Very short delay
        }

        // Final state check
        await page.waitForTimeout(500);
        const dataType = await reagentRow.getAttribute('data-type');
        console.log('[Rapid Switch] Final data-type:', dataType);

        expect(dataType).toBe('pure-solid');

        // Check UI is still responsive
        const massVisible = await reagentRow.locator('.reagent-mass').isVisible();
        expect(massVisible).toBe(true);
    });

    test('API Error Handling 1: Invalid CAS number for Starting Material', async ({ page }) => {
        // Listen for dialog (alert)
        page.on('dialog', async dialog => {
            console.log('[API Error] Alert message:', dialog.message());
            expect(dialog.message()).toContain('Error');
            await dialog.accept();
        });

        // Enter invalid CAS
        await page.locator('#sm-cas').fill('INVALID-CAS-999');
        await page.locator('#sm-fetch-btn').click();

        // Wait for API response
        await page.waitForTimeout(2000);

        // Page should still be functional
        const tableVisible = await page.locator('#stoich-table').isVisible();
        expect(tableVisible).toBe(true);
    });

    test('API Error Handling 2: Invalid CAS number for Reagent', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Listen for dialog
        let errorCaught = false;
        page.on('dialog', async dialog => {
            console.log('[API Error - Reagent] Alert:', dialog.message());
            errorCaught = true;
            await dialog.accept();
        });

        // Enter invalid CAS and fetch
        await reagentRow.locator('.reagent-cas').fill('12345-FAKE');
        await reagentRow.locator('.reagent-fetch-btn').click();

        await page.waitForTimeout(2000);

        // If error handling works, we should see an alert
        // If not, the button might just stay in "Loading..." state
        const btnText = await reagentRow.locator('.reagent-fetch-btn').textContent();
        console.log('[API Error - Reagent] Button text after error:', btnText);

        // Button should reset to "Fetch" or show error feedback
        expect(btnText).not.toBe('Loading...');
    });

    test('Stress Test: Add multiple reagents and calculate all at once', async ({ page }) => {
        // Set starting material
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await page.waitForTimeout(300);

        // Add 5 reagents with different types
        const reagentConfigs = [
            { type: 'pure-solid', mw: '100', eq: '2.0', purity: '99' },
            { type: 'pure-liquid', mw: '120', eq: '1.5', density: '1.2', purity: '95' },
            { type: 'solution-molarity', mw: '80', eq: '3.0', molarity: '2.5' },
            { type: 'solution-density', mw: '150', eq: '1.0', density: '1.5', purity: '50' },
            { type: 'pure-solid', mw: '200', eq: '0.5', purity: '100' }
        ];

        // Get initial count of reagent rows (may have example data)
        const initialRows = page.locator('.reagent-row');
        const initialCount = await initialRows.count();

        for (let i = 0; i < reagentConfigs.length; i++) {
            await page.click('#add-reagent');
            await page.waitForTimeout(200);
        }

        // Fill ONLY the newly added reagents (skip example data rows)
        const rows = page.locator('.reagent-row');
        const totalCount = await rows.count();

        for (let i = 0; i < reagentConfigs.length; i++) {
            const rowIndex = initialCount + i; // Target only newly added rows
            const row = rows.nth(rowIndex);
            const config = reagentConfigs[i];

            await row.locator('.reagent-type').selectOption(config.type);
            await row.locator('.reagent-mw').fill(config.mw);
            await row.locator('.reagent-eq').fill(config.eq);

            if (config.purity) {
                await row.locator('.reagent-purity').fill(config.purity);
            }
            if (config.density) {
                await row.locator('.reagent-density').fill(config.density);
            }
            if (config.molarity) {
                await row.locator('.reagent-molarity').fill(config.molarity);
            }

            await page.waitForTimeout(100);
        }

        // Wait for all calculations
        await page.waitForTimeout(1000);

        // Verify all mmol displays are valid (for all rows including example data)
        for (let i = 0; i < totalCount; i++) {
            const row = rows.nth(i);
            const mmolText = await row.locator('.reagent-mmol').textContent();

            console.log(`[Stress Test] Reagent ${i + 1} mmol:`, mmolText);

            expect(mmolText).not.toContain('NaN');
            expect(mmolText).not.toBe('-'); // Should have calculated value
        }
    });

    test('Edge Case 4: Zero equivalents (catalyst scenario)', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Set SM
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        // Set reagent with 0 equivalents (like a catalyst)
        await reagentRow.locator('.reagent-mw').fill('300');
        await reagentRow.locator('.reagent-eq').fill('0');
        await reagentRow.locator('.reagent-purity').fill('100');

        await page.waitForTimeout(500);

        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();
        const massValue = await reagentRow.locator('.reagent-mass').inputValue();

        console.log('[Edge Case] Zero eq - mmol:', mmolText, 'mass:', massValue);

        // Should show 0 mmol and 0 mass, not error
        expect(mmolText).toBe('0.000');
        expect(massValue).toBe('0.00');
    });

    test('Solvent Calculator: Extreme concentration edge case', async ({ page }) => {
        // Set SM
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(300);

        // Test very low concentration
        await page.locator('#solvent-name').fill('THF');
        await page.locator('#solvent-conc').fill('0.001'); // Very dilute

        await page.waitForTimeout(500);

        const volumeValue = await page.locator('#solvent-volume').inputValue();
        console.log('[Solvent Calc] Extreme low conc - Volume:', volumeValue);

        expect(volumeValue).not.toBe('NaN');
        expect(volumeValue).not.toBe('Infinity');
        expect(parseFloat(volumeValue)).toBeGreaterThan(0);

        // Test very high concentration
        await page.locator('#solvent-conc').fill('10'); // Very concentrated
        await page.waitForTimeout(300);

        const volumeValue2 = await page.locator('#solvent-volume').inputValue();
        console.log('[Solvent Calc] Extreme high conc - Volume:', volumeValue2);

        expect(parseFloat(volumeValue2)).toBeGreaterThan(0);
        expect(parseFloat(volumeValue2)).toBeLessThan(parseFloat(volumeValue)); // Higher conc = less volume
    });
});
