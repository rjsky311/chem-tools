/**
 * Core Calculations Tests
 * 測試化學計算邏輯正確性
 */

const { test, expect } = require('@playwright/test');
const { SELECTORS, setupCleanState, setupStartingMaterial, addReagent } = require('./helpers');

test.describe('Core Calculations', () => {

  test.beforeEach(async ({ page }) => {
    await setupCleanState(page);
  });

  // ========================================
  // Starting Material 基準計算
  // ========================================
  test.describe('Starting Material', () => {

    test('mmol = mass / MW (基本計算)', async ({ page }) => {
      // MW=100, Mass=100 => mmol = 1.0000
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const mmolValue = await page.inputValue(SELECTORS.smMmol);
      expect(mmolValue).toBe('1.0000');
    });

    test('mmol 應有 4 位小數精度', async ({ page }) => {
      // MW=180.16, Mass=100 => mmol = 0.5550
      await setupStartingMaterial(page, { mw: '180.16', mass: '100' });

      const mmolValue = await page.inputValue(SELECTORS.smMmol);
      expect(mmolValue).toMatch(/^\d+\.\d{4}$/);
    });

  });

  // ========================================
  // 試劑計算
  // ========================================
  test.describe('Reagent Calculations', () => {

    test('Pure Solid: mass = (smMmol * eq * mw) / purity', async ({ page }) => {
      // SM: 1 mmol, Reagent: MW=50, Eq=2.0, Purity=50%
      // 理論 mass = 1 * 2 * 50 = 100mg
      // 實際 mass = 100 / 0.5 = 200mg
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '50',
        eq: '2.0',
        purity: '50'
      });

      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();
      expect(massValue).toBe('200.00');
    });

    test('Pure Liquid: volume = mass / density', async ({ page }) => {
      // SM: 1 mmol, Reagent: MW=100, Eq=1.0, Density=0.8
      // mass = 1 * 1 * 100 = 100mg
      // volume = 100 / 0.8 = 125 uL = 0.125 mL
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-liquid',
        mw: '100',
        eq: '1.0',
        density: '0.8',
        purity: '100'
      });

      const volumeValue = await reagent.locator(SELECTORS.reagentVolume).inputValue();
      expect(volumeValue).toBe('0.125');
    });

    test('Solution (Molarity): volume = mmol / molarity', async ({ page }) => {
      // SM: 1 mmol, Reagent: Eq=2.0, Molarity=2.5M
      // mmol = 1 * 2 = 2 mmol
      // volume = 2 / 2.5 = 0.8 mL
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'solution-molarity',
        mw: '80',
        eq: '2.0',
        molarity: '2.5'
      });

      const volumeValue = await reagent.locator(SELECTORS.reagentVolume).inputValue();
      expect(volumeValue).toBe('0.800');
    });

    test('mmol 顯示應為 3 位小數', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '50',
        eq: '2.0',
        purity: '100'
      });

      // 1 mmol * 2.0 eq = 2.000 mmol
      const mmolInput = reagent.locator(SELECTORS.reagentMmol);
      await expect(mmolInput).toHaveValue('2.000');
    });

  });

  // ========================================
  // 限量試劑判定
  // ========================================
  test.describe('Limiting Reagent', () => {

    test('SM is limiting when it has lowest mmol', async ({ page }) => {
      // SM: 1 mmol, Reagent: 2 mmol (eq=2.0)
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      await addReagent(page, {
        type: 'pure-solid',
        mw: '50',
        eq: '2.0',
        purity: '100'
      });

      // SM 應該有 is-limiting class
      await expect(page.locator(SELECTORS.smCard)).toHaveClass(/is-limiting/);
      await expect(page.locator(`${SELECTORS.smCard} .limiting-badge`)).toBeVisible();
    });

    test('Reagent is limiting when eq < 1', async ({ page }) => {
      // SM: 1 mmol, Reagent: 0.5 mmol (eq=0.5)
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '50',
        eq: '0.5',
        purity: '100'
      });

      // Reagent 應該有 is-limiting class
      await expect(reagent).toHaveClass(/is-limiting/);
      await expect(reagent.locator('.limiting-badge')).toBeVisible();
    });

    test('Catalyst does not affect limiting calculation', async ({ page }) => {
      // SM: 1 mmol, Catalyst: 0.1 mmol (eq=0.1)
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const catalyst = await addReagent(page, {
        type: 'pure-solid',
        mw: '50',
        eq: '0.1',
        purity: '100',
        role: 'catalyst'
      });

      // SM 應該仍是 limiting，不是 catalyst
      await expect(page.locator(SELECTORS.smCard)).toHaveClass(/is-limiting/);
      await expect(catalyst).not.toHaveClass(/is-limiting/);
    });

  });

  // ========================================
  // 產率計算
  // ========================================
  test.describe('Yield Calculation', () => {

    test('theoretical yield = limiting mmol * product MW', async ({ page }) => {
      // SM: 1 mmol, Product MW: 200
      // Theoretical = 1 * 200 = 200 mg
      await setupStartingMaterial(page, { mw: '100', mass: '100' });
      await page.fill(SELECTORS.productMw, '200');

      const theoretical = await page.locator(SELECTORS.productTheoretical).textContent();
      expect(theoretical).toBe('200.00');
    });

    test('yield% = actual / theoretical * 100', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });
      await page.fill(SELECTORS.productMw, '100'); // 100 mg theoretical
      await page.fill(SELECTORS.productActual, '75'); // 75 mg actual

      const yieldPercentage = await page.locator(SELECTORS.yieldPercentage).textContent();
      expect(yieldPercentage).toBe('75.0%');
    });

    test('green light for >80% yield', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });
      await page.fill(SELECTORS.productMw, '100');
      await page.fill(SELECTORS.productActual, '90'); // 90%

      await expect(page.locator(SELECTORS.yieldDisplay)).toHaveClass(/yield-excellent/);
    });

    test('yellow light for 50-80% yield', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });
      await page.fill(SELECTORS.productMw, '100');
      await page.fill(SELECTORS.productActual, '60'); // 60%

      await expect(page.locator(SELECTORS.yieldDisplay)).toHaveClass(/yield-good/);
    });

    test('red light for <50% yield', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });
      await page.fill(SELECTORS.productMw, '100');
      await page.fill(SELECTORS.productActual, '30'); // 30%

      await expect(page.locator(SELECTORS.yieldDisplay)).toHaveClass(/yield-poor/);
    });

  });

  // ========================================
  // 溶劑計算機
  // ========================================
  test.describe('Solvent Calculator', () => {

    test('volume = mmol / concentration', async ({ page }) => {
      // SM: 1 mmol, Concentration: 0.1 M
      // Volume = 1 / 0.1 = 10.000 mL
      await setupStartingMaterial(page, { mw: '100', mass: '100' });
      await page.fill(SELECTORS.solventConc, '0.1');

      const solventVol = await page.inputValue(SELECTORS.solventVolume);
      expect(solventVol).toBe('10.000');
    });

  });

});
