/**
 * Feature: Auto-Save & Memory (Local Storage Persistence)
 * Goal: Test that user data persists across page reloads
 * TDD Approach: This test should FAIL until auto-save is implemented
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Feature: Auto-Save & Data Persistence', () => {
    test.beforeEach(async ({ page }) => {
        // Use file:// protocol to load local HTML file directly
        const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
        await page.goto(fileUrl);

        // Wait for page to be fully loaded
        await page.waitForSelector('#reaction-scheme-section');
        await page.waitForSelector('#add-reagent');
    });

    test('Should persist Starting Material data after page reload', async ({ page }) => {
        // Step 1: Fill in Starting Material data
        await page.locator('#sm-mw').fill('100');
        await page.locator('#sm-mass').fill('100');

        // Wait for calculations to complete
        await page.waitForTimeout(300);

        // Verify data is filled before reload
        const smMwBefore = await page.locator('#sm-mw').inputValue();
        const smMassBefore = await page.locator('#sm-mass').inputValue();

        console.log('[Before Reload] SM MW:', smMwBefore, 'Mass:', smMassBefore);

        expect(smMwBefore).toBe('100');
        expect(smMassBefore).toBe('100');

        // Step 2: Reload the page
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        // Step 3: Verify data persists after reload
        const smMwAfter = await page.locator('#sm-mw').inputValue();
        const smMassAfter = await page.locator('#sm-mass').inputValue();

        console.log('[After Reload] SM MW:', smMwAfter, 'Mass:', smMassAfter);

        // THIS SHOULD FAIL until auto-save is implemented
        expect(smMwAfter).toBe('100');
        expect(smMassAfter).toBe('100');
    });

    test('Should persist Reagent data after page reload', async ({ page }) => {
        // Step 1: Set Starting Material (needed for calculations)
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await page.waitForTimeout(300);

        // Step 2: Add a reagent row
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').last();

        // Step 3: Fill in reagent data (Pure Liquid type)
        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');
        await reagentRow.locator('.reagent-mw').fill('50');
        await reagentRow.locator('.reagent-eq').fill('2.0');
        await reagentRow.locator('.reagent-density').fill('0.8');
        await reagentRow.locator('.reagent-purity').fill('95');

        await page.waitForTimeout(500);

        // Verify data before reload
        const rowCountBefore = await page.locator('.reagent-row').count();
        const mwBefore = await reagentRow.locator('.reagent-mw').inputValue();
        const densityBefore = await reagentRow.locator('.reagent-density').inputValue();

        console.log('[Before Reload] Reagent count:', rowCountBefore, 'MW:', mwBefore, 'Density:', densityBefore);

        expect(rowCountBefore).toBeGreaterThan(0);
        expect(mwBefore).toBe('50');
        expect(densityBefore).toBe('0.8');

        // Step 4: Reload the page
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');
        await page.waitForTimeout(500);

        // Step 5: Verify reagent data persists
        const rowCountAfter = await page.locator('.reagent-row').count();

        console.log('[After Reload] Reagent count:', rowCountAfter);

        // THIS SHOULD FAIL until auto-save is implemented
        expect(rowCountAfter).toBeGreaterThan(0);

        // Verify the reagent row data
        if (rowCountAfter > 0) {
            const restoredRow = page.locator('.reagent-row').last();
            const typeValue = await restoredRow.locator('.reagent-type').inputValue();
            const mwAfter = await restoredRow.locator('.reagent-mw').inputValue();
            const eqAfter = await restoredRow.locator('.reagent-eq').inputValue();
            const densityAfter = await restoredRow.locator('.reagent-density').inputValue();

            console.log('[After Reload] Type:', typeValue, 'MW:', mwAfter, 'Eq:', eqAfter, 'Density:', densityAfter);

            expect(typeValue).toBe('pure-liquid');
            expect(mwAfter).toBe('50');
            expect(eqAfter).toBe('2.0');
            expect(densityAfter).toBe('0.8');
        }
    });

    test('Should persist Solvent Calculator data after page reload', async ({ page }) => {
        // Step 1: Set Starting Material
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await page.waitForTimeout(300);

        // Step 2: Fill in Solvent Calculator (including new v2.1 fields)
        await page.locator('#solvent-name').fill('THF');
        await page.locator('#solvent-cas').fill('109-99-9');
        await page.locator('#solvent-conc').fill('0.5');

        await page.waitForTimeout(300);

        // Verify before reload
        const solventNameBefore = await page.locator('#solvent-name').inputValue();
        const solventCasBefore = await page.locator('#solvent-cas').inputValue();
        const solventConcBefore = await page.locator('#solvent-conc').inputValue();

        console.log('[Before Reload] Solvent:', solventNameBefore, 'CAS:', solventCasBefore, 'Conc:', solventConcBefore);

        expect(solventNameBefore).toBe('THF');
        expect(solventCasBefore).toBe('109-99-9');
        expect(solventConcBefore).toBe('0.5');

        // Step 3: Reload the page
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        // Step 4: Verify data persists (including CAS)
        const solventNameAfter = await page.locator('#solvent-name').inputValue();
        const solventCasAfter = await page.locator('#solvent-cas').inputValue();
        const solventConcAfter = await page.locator('#solvent-conc').inputValue();

        console.log('[After Reload] Solvent:', solventNameAfter, 'CAS:', solventCasAfter, 'Conc:', solventConcAfter);

        expect(solventNameAfter).toBe('THF');
        expect(solventCasAfter).toBe('109-99-9');
        expect(solventConcAfter).toBe('0.5');
    });

    test('Should persist complete workflow: SM + Reagents + Conditions', async ({ page }) => {
        // Step 1: Fill Starting Material
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await page.locator('#sm-cas').fill('50-78-2');

        // Step 2: Add two reagents with different types
        await page.click('#add-reagent');
        const reagent1 = page.locator('.reagent-row').nth(-2); // Second to last (if example data exists)
        await reagent1.locator('.reagent-type').selectOption('pure-solid');
        await reagent1.locator('.reagent-mw').fill('100');
        await reagent1.locator('.reagent-eq').fill('2.0');
        await reagent1.locator('.reagent-purity').fill('99');

        await page.click('#add-reagent');
        const reagent2 = page.locator('.reagent-row').last();
        await reagent2.locator('.reagent-type').selectOption('solution-molarity');
        await reagent2.locator('.reagent-mw').fill('80');
        await reagent2.locator('.reagent-eq').fill('1.5');
        await reagent2.locator('.reagent-molarity').fill('2.5');

        // Step 3: Fill Conditions
        await page.locator('#solvent-name').fill('DCM');
        await page.locator('#solvent-conc').fill('0.2');
        await page.locator('#temperature').fill('0°C');
        await page.locator('#time').fill('4 h');
        await page.locator('#notes').fill('Test reaction for auto-save');

        await page.waitForTimeout(500);

        // Verify data before reload
        const reagentCountBefore = await page.locator('.reagent-row').count();
        console.log('[Before Reload] Total reagents:', reagentCountBefore);

        // Step 4: Reload
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');
        await page.waitForTimeout(500);

        // Step 5: Verify all data persists

        // Starting Material
        expect(await page.locator('#sm-mw').inputValue()).toBe('180.16');
        expect(await page.locator('#sm-mass').inputValue()).toBe('100');
        expect(await page.locator('#sm-cas').inputValue()).toBe('50-78-2');

        // Reagents count
        const reagentCountAfter = await page.locator('.reagent-row').count();
        console.log('[After Reload] Total reagents:', reagentCountAfter);

        // THIS SHOULD FAIL until auto-save is implemented
        expect(reagentCountAfter).toBe(reagentCountBefore);

        // Conditions
        expect(await page.locator('#solvent-name').inputValue()).toBe('DCM');
        expect(await page.locator('#solvent-conc').inputValue()).toBe('0.2');
        expect(await page.locator('#temperature').inputValue()).toBe('0°C');
        expect(await page.locator('#time').inputValue()).toBe('4 h');
        expect(await page.locator('#notes').inputValue()).toBe('Test reaction for auto-save');
    });

    test('Should handle empty/cleared data correctly', async ({ page }) => {
        // Fill some data
        await page.locator('#sm-mw').fill('100');
        await page.locator('#sm-mass').fill('50');
        await page.waitForTimeout(200);

        // Reload
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        // Clear the data
        await page.locator('#sm-mw').fill('');
        await page.locator('#sm-mass').fill('');
        await page.waitForTimeout(200);

        // Reload again
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        // Verify data is cleared (not the old values)
        const smMw = await page.locator('#sm-mw').inputValue();
        const smMass = await page.locator('#sm-mass').inputValue();

        // THIS SHOULD FAIL until auto-save is implemented
        expect(smMw).toBe('');
        expect(smMass).toBe('');
    });
});
