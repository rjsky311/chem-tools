/**
 * Persona: Intern/Beginner User
 * Goal: Test error prevention and graceful degradation
 * Focus: Invalid inputs, missing data, common mistakes
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Persona: Intern - Error Handling & Fool-Proof Mechanisms', () => {
    test.beforeEach(async ({ page }) => {
        // Use file:// protocol to load local HTML file directly
        const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
        await page.goto(fileUrl);

        // Wait for page to be fully loaded
        await page.waitForSelector('#stoich-table');
        await page.waitForSelector('#add-reagent');
    });

    test('Negative Input 1: Negative molecular weight', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Try to input negative MW
        await reagentRow.locator('.reagent-mw').fill('-100');
        await reagentRow.locator('.reagent-eq').fill('1.0');

        // Set SM to trigger calculation
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const mwValue = await reagentRow.locator('.reagent-mw').inputValue();
        const massValue = await reagentRow.locator('.reagent-mass').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Intern Test] Negative MW:', mwValue, '| Mass:', massValue, '| mmol:', mmolText);

        // Check if HTML5 min="0" prevented negative input
        if (parseFloat(mwValue) < 0) {
            console.warn('[WARNING] Negative MW was accepted! Value:', mwValue);
            console.warn('[WARNING] Calculated mass:', massValue);
            console.warn('[WARNING] This could lead to nonsensical results');

            // If system allows negative, check if result is absurd
            if (parseFloat(massValue) < 0 || massValue === 'NaN') {
                console.error('[CRITICAL] Negative or NaN mass calculated!');
            }
        }

        // Ideally, MW should be forced to 0 or prevented
        // Current behavior check
        const isInputValid = parseFloat(mwValue) >= 0;
        const isOutputSane = massValue !== 'NaN' && massValue !== 'Infinity';

        expect(isOutputSane).toBe(true);
    });

    test('Negative Input 2: Negative mass for Starting Material', async ({ page }) => {
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('-100'); // Negative mass

        await page.waitForTimeout(500);

        const massValue = await page.locator('#sm-mass').inputValue();
        const mmolValue = await page.locator('#sm-mmol').inputValue();

        console.log('[Intern Test] Negative SM mass:', massValue, '| mmol:', mmolValue);

        // Check results
        if (parseFloat(massValue) < 0) {
            console.warn('[WARNING] Negative SM mass accepted!');

            // mmol should ideally be prevented or show error
            if (mmolValue === 'NaN' || parseFloat(mmolValue) < 0) {
                console.error('[CRITICAL] Invalid mmol calculation from negative mass');
            }
        }

        // Output should at minimum not be NaN
        expect(mmolValue).not.toBe('NaN');
    });

    test('Negative Input 3: Negative equivalents', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Set up reagent with negative equivalents
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('-2.0'); // Negative eq
        await reagentRow.locator('.reagent-purity').fill('100');

        // Set SM
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const eqValue = await reagentRow.locator('.reagent-eq').inputValue();
        const massValue = await reagentRow.locator('.reagent-mass').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Intern Test] Negative eq:', eqValue, '| Mass:', massValue, '| mmol:', mmolText);

        // Negative equivalents make no chemical sense
        if (parseFloat(eqValue) < 0) {
            console.warn('[WARNING] Negative equivalents accepted!');
            if (parseFloat(massValue) < 0) {
                console.error('[CRITICAL] Negative mass calculated from negative eq!');
            }
        }

        // At minimum, no NaN
        expect(massValue).not.toBe('NaN');
        expect(mmolText).not.toContain('NaN');
    });

    test('Negative Input 4: Negative density', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('1.0');
        await reagentRow.locator('.reagent-density').fill('-1.2'); // Negative density!
        await reagentRow.locator('.reagent-purity').fill('100');

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const densityValue = await reagentRow.locator('.reagent-density').inputValue();
        const volumeValue = await reagentRow.locator('.reagent-volume').inputValue();

        console.log('[Intern Test] Negative density:', densityValue, '| Volume:', volumeValue);

        if (parseFloat(densityValue) < 0) {
            console.warn('[WARNING] Negative density accepted!');
            if (parseFloat(volumeValue) < 0 || volumeValue === 'NaN') {
                console.error('[CRITICAL] Invalid volume from negative density');
            }
        }

        expect(volumeValue).not.toBe('NaN');
        expect(volumeValue).not.toBe('Infinity');
    });

    test('Missing Data 1: Calculate mmol without MW', async ({ page }) => {
        // Only fill mass, no MW
        await page.locator('#sm-mass').fill('100');
        // SM-MW left empty

        await page.waitForTimeout(500);

        const mmolValue = await page.locator('#sm-mmol').inputValue();

        console.log('[Intern Test] Missing MW - mmol result:', mmolValue);

        // Should gracefully show empty or "-", NOT "NaN"
        expect(mmolValue).not.toBe('NaN');

        // Ideally should be empty or "-"
        if (mmolValue === '') {
            console.log('[GOOD] Empty mmol when MW missing');
        } else if (mmolValue === '-') {
            console.log('[GOOD] Dash shown when MW missing');
        } else {
            console.warn('[WARNING] Unexpected mmol value when MW missing:', mmolValue);
        }
    });

    test('Missing Data 2: Calculate reagent mass without SM data', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Fill reagent but no SM
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('2.0');
        await reagentRow.locator('.reagent-purity').fill('99');

        await page.waitForTimeout(500);

        const massValue = await reagentRow.locator('.reagent-mass').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Intern Test] No SM data - Mass:', massValue, '| mmol:', mmolText);

        // Should gracefully handle missing SM
        expect(massValue).not.toBe('NaN');
        expect(mmolText).not.toContain('NaN');

        // Likely should show empty or "-"
        if (mmolText === '-' && massValue === '') {
            console.log('[GOOD] Graceful handling of missing SM data');
        }
    });

    test('Missing Data 3: Calculate volume without molarity', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        await reagentRow.locator('.reagent-type').selectOption('solution-molarity');
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('1.0');
        // Molarity left empty

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const volumeValue = await reagentRow.locator('.reagent-volume').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Intern Test] Missing molarity - Volume:', volumeValue, '| mmol:', mmolText);

        expect(volumeValue).not.toBe('NaN');
        expect(volumeValue).not.toBe('Infinity');

        // mmol should still calculate (it doesn't depend on molarity)
        expect(mmolText).not.toContain('NaN');
    });

    test('Missing Data 4: Partial data in Pure Liquid calculation', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('1.5');
        // Density filled but purity left empty
        await reagentRow.locator('.reagent-density').fill('1.2');

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const volumeValue = await reagentRow.locator('.reagent-volume').inputValue();
        const purityValue = await reagentRow.locator('.reagent-purity').inputValue();

        console.log('[Intern Test] Missing purity - Volume:', volumeValue, '| Purity input:', purityValue);

        // System might default purity to 100 (see placeholder value="100")
        // Check if calculation still works
        expect(volumeValue).not.toBe('NaN');

        if (volumeValue !== '' && volumeValue !== '0.00') {
            console.log('[INFO] Volume calculated despite empty purity field (likely defaulted to 100)');
        }
    });

    test('Zero Division 1: Zero MW in reagent', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        await reagentRow.locator('.reagent-mw').fill('0'); // Zero MW
        await reagentRow.locator('.reagent-eq').fill('1.0');

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const massValue = await reagentRow.locator('.reagent-mass').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Intern Test] Zero MW - Mass:', massValue, '| mmol:', mmolText);

        // Division by zero could cause issues
        expect(massValue).not.toBe('Infinity');
        expect(massValue).not.toBe('NaN');
        expect(mmolText).not.toContain('Infinity');
    });

    test('Zero Division 2: Zero density in Pure Liquid', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('1.0');
        await reagentRow.locator('.reagent-density').fill('0'); // Zero density!
        await reagentRow.locator('.reagent-purity').fill('100');

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const volumeValue = await reagentRow.locator('.reagent-volume').inputValue();

        console.log('[Intern Test] Zero density - Volume:', volumeValue);

        // Volume = mass / density → division by zero!
        expect(volumeValue).not.toBe('Infinity');
        expect(volumeValue).not.toBe('NaN');

        if (volumeValue === '' || volumeValue === '0.00') {
            console.log('[GOOD] System prevented calculation with zero density');
        } else {
            console.warn('[WARNING] Unexpected result with zero density:', volumeValue);
        }
    });

    test('Zero Division 3: Zero purity', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        await reagentRow.locator('.reagent-type').selectOption('pure-solid');
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('1.0');
        await reagentRow.locator('.reagent-purity').fill('0'); // Zero purity

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const massValue = await reagentRow.locator('.reagent-mass').inputValue();

        console.log('[Intern Test] Zero purity - Mass:', massValue);

        // realMass = theoreticalMass / (purity/100) → division by zero
        expect(massValue).not.toBe('Infinity');
        expect(massValue).not.toBe('NaN');
    });

    test('Common Mistake 1: Forgot to fill Equivalents (uses default)', async ({ page }) => {
        await page.click('#add-reagent');
        // Use .last() to get the NEWLY ADDED row, not example data
        const reagentRow = page.locator('.reagent-row').last();

        await reagentRow.locator('.reagent-mw').fill('100');
        // Equivalents field left at default (should be 1.0)
        await reagentRow.locator('.reagent-purity').fill('100');

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const eqValue = await reagentRow.locator('.reagent-eq').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Intern Test] Default eq - Value:', eqValue, '| mmol:', mmolText);

        // Should default to 1.0
        expect(eqValue).toBe('1.0');
        expect(mmolText).not.toBe('-');
    });

    test('Common Mistake 2: Cleared Equivalents field (empty string)', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').clear(); // Explicitly clear
        await reagentRow.locator('.reagent-purity').fill('100');

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(500);

        const massValue = await reagentRow.locator('.reagent-mass').inputValue();
        const mmolText = await reagentRow.locator('.reagent-mmol').textContent();

        console.log('[Intern Test] Cleared eq - Mass:', massValue, '| mmol:', mmolText);

        // Should handle empty eq gracefully (likely defaults to 0)
        expect(massValue).not.toBe('NaN');
        expect(mmolText).not.toContain('NaN');
    });

    test('Common Mistake 3: Switched type but forgot to fill new required fields', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Start with Pure Solid
        await reagentRow.locator('.reagent-mw').fill('100');
        await reagentRow.locator('.reagent-eq').fill('2.0');
        await reagentRow.locator('.reagent-purity').fill('99');

        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await page.waitForTimeout(300);

        // Switch to Pure Liquid but forget to fill density
        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');
        await page.waitForTimeout(300);

        // Density is empty, purity is carried over
        const volumeValue = await reagentRow.locator('.reagent-volume').inputValue();
        const densityValue = await reagentRow.locator('.reagent-density').inputValue();

        console.log('[Intern Test] Forgot density - Volume:', volumeValue, '| Density:', densityValue);

        // Should handle missing density gracefully
        expect(volumeValue).not.toBe('NaN');
        expect(volumeValue).not.toBe('Infinity');

        if (volumeValue === '' || volumeValue === '0.00') {
            console.log('[GOOD] No calculation performed when density missing');
        }
    });

    test('Common Mistake 4: Very long decimal numbers (copy-paste from Excel)', async ({ page }) => {
        // Simulate intern copy-pasting high-precision values from Excel
        await page.locator('#sm-mw').fill('180.159876543210123456'); // Ridiculous precision
        await page.locator('#sm-mass').fill('100.123456789012345');

        await page.waitForTimeout(500);

        const mmolValue = await page.locator('#sm-mmol').inputValue();

        console.log('[Intern Test] High precision input - mmol:', mmolValue);

        // Should handle without crashing
        expect(mmolValue).not.toBe('NaN');

        // Check if precision is reasonable (should round to 3-4 decimals)
        if (mmolValue.includes('.')) {
            const decimals = mmolValue.split('.')[1].length;
            console.log('[INFO] mmol decimal places:', decimals);
            // Typically scientific calculations show 3-4 decimal places
        }
    });

    test('Solvent Calculator: Missing concentration', async ({ page }) => {
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');

        await page.waitForTimeout(300);

        await page.locator('#solvent-name').fill('THF');
        // Concentration left empty

        await page.waitForTimeout(500);

        const volumeValue = await page.locator('#solvent-volume').inputValue();

        console.log('[Intern Test] Solvent - Missing conc, Volume:', volumeValue);

        // Should handle gracefully
        expect(volumeValue).not.toBe('NaN');
        expect(volumeValue).not.toBe('Infinity');

        if (volumeValue === '') {
            console.log('[GOOD] No volume calculated when concentration missing');
        }
    });

    test('Solvent Calculator: Zero concentration', async ({ page }) => {
        await page.locator('#sm-mw').fill('180.16');
        await page.locator('#sm-mass').fill('100');
        await page.waitForTimeout(300);

        await page.locator('#solvent-name').fill('DCM');
        await page.locator('#solvent-conc').fill('0'); // Zero concentration

        await page.waitForTimeout(500);

        const volumeValue = await page.locator('#solvent-volume').inputValue();

        console.log('[Intern Test] Solvent - Zero conc, Volume:', volumeValue);

        // Volume = mmol / conc → division by zero
        expect(volumeValue).not.toBe('Infinity');
        expect(volumeValue).not.toBe('NaN');
    });

    test('UI Consistency: Switching types shows correct placeholders', async ({ page }) => {
        await page.click('#add-reagent');
        const reagentRow = page.locator('.reagent-row').first();

        // Check Pure Solid placeholders
        await reagentRow.locator('.reagent-type').selectOption('pure-solid');
        await page.waitForTimeout(200);

        const massPlaceholder = await reagentRow.locator('.reagent-mass').getAttribute('placeholder');
        const purityPlaceholder = await reagentRow.locator('.reagent-purity').getAttribute('placeholder');

        console.log('[UI Check] Pure Solid - Mass placeholder:', massPlaceholder, 'Purity:', purityPlaceholder);

        expect(massPlaceholder).toContain('Mass');

        // Check Pure Liquid placeholders
        await reagentRow.locator('.reagent-type').selectOption('pure-liquid');
        await page.waitForTimeout(200);

        const volumePlaceholder = await reagentRow.locator('.reagent-volume').getAttribute('placeholder');
        const densityPlaceholder = await reagentRow.locator('.reagent-density').getAttribute('placeholder');

        console.log('[UI Check] Pure Liquid - Volume:', volumePlaceholder, 'Density:', densityPlaceholder);

        expect(volumePlaceholder).toContain('Volume');
        expect(densityPlaceholder).toContain('Density');
    });
});
