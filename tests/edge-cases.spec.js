/**
 * Edge Cases Tests
 * 測試極端值、錯誤處理、邊界條件
 */

const { test, expect } = require('@playwright/test');
const { SELECTORS, setupCleanState, setupStartingMaterial, addReagent } = require('./helpers');

test.describe('Edge Cases', () => {

  test.beforeEach(async ({ page }) => {
    await setupCleanState(page);
  });

  // ========================================
  // 負值輸入
  // ========================================
  test.describe('Negative Values', () => {

    test('Negative MW produces sane output', async ({ page }) => {
      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();

      await reagent.locator(SELECTORS.reagentMw).fill('-100');
      await reagent.locator(SELECTORS.reagentEq).fill('1.0');
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();
      const mmolValue = await reagent.locator(SELECTORS.reagentMmol).inputValue();

      // 不應該是 NaN
      expect(massValue).not.toBe('NaN');
      expect(mmolValue).not.toContain('NaN');
    });

    test('Negative mass produces sane output', async ({ page }) => {
      const smCard = page.locator(SELECTORS.smCard);
      await smCard.locator('.sm-mw').fill('100');
      await smCard.locator('.sm-mass').fill('-100');

      const mmolValue = await page.inputValue(SELECTORS.smMmol);

      expect(mmolValue).not.toBe('NaN');
    });

    test('Negative eq produces sane output', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '100',
        eq: '-2.0',
        purity: '100'
      });

      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();
      expect(massValue).not.toBe('NaN');
    });

    test('Negative density produces sane output', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-liquid',
        mw: '100',
        eq: '1.0',
        density: '-1.2',
        purity: '100'
      });

      const volumeValue = await reagent.locator(SELECTORS.reagentVolume).inputValue();
      expect(volumeValue).not.toBe('NaN');
      expect(volumeValue).not.toBe('Infinity');
    });

  });

  // ========================================
  // 缺失資料
  // ========================================
  test.describe('Missing Data', () => {

    test('mmol without MW shows graceful result', async ({ page }) => {
      const smCard = page.locator(SELECTORS.smCard);
      await smCard.locator('.sm-mass').fill('100');
      // MW 留空

      const mmolValue = await page.inputValue(SELECTORS.smMmol);

      expect(mmolValue).not.toBe('NaN');
      // 應該是空值或 '-'
    });

    test('Reagent without SM shows graceful result', async ({ page }) => {
      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();

      await reagent.locator(SELECTORS.reagentMw).fill('100');
      await reagent.locator(SELECTORS.reagentEq).fill('2.0');
      await reagent.locator(SELECTORS.reagentPurity).fill('99');

      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();
      const mmolValue = await reagent.locator(SELECTORS.reagentMmol).inputValue();

      expect(massValue).not.toBe('NaN');
      expect(mmolValue).not.toContain('NaN');
    });

    test('Volume without molarity shows graceful result', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'solution-molarity',
        mw: '100',
        eq: '1.0'
        // molarity 留空
      });

      const volumeValue = await reagent.locator(SELECTORS.reagentVolume).inputValue();
      expect(volumeValue).not.toBe('NaN');
      expect(volumeValue).not.toBe('Infinity');
    });

  });

  // ========================================
  // 除以零
  // ========================================
  test.describe('Division by Zero', () => {

    test('Zero MW handled', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '0',
        eq: '1.0',
        purity: '100'
      });

      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();
      expect(massValue).not.toBe('Infinity');
      expect(massValue).not.toBe('NaN');
    });

    test('Zero density handled', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-liquid',
        mw: '100',
        eq: '1.0',
        density: '0',
        purity: '100'
      });

      const volumeValue = await reagent.locator(SELECTORS.reagentVolume).inputValue();
      expect(volumeValue).not.toBe('Infinity');
      expect(volumeValue).not.toBe('NaN');
    });

    test('Zero purity handled', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '100',
        eq: '1.0',
        purity: '0'
      });

      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();
      expect(massValue).not.toBe('Infinity');
      expect(massValue).not.toBe('NaN');
    });

    test('Zero concentration handled', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      await page.fill(SELECTORS.solventConc, '0');
      const volumeValue = await page.inputValue(SELECTORS.solventVolume);

      expect(volumeValue).not.toBe('Infinity');
      expect(volumeValue).not.toBe('NaN');
    });

  });

  // ========================================
  // 極端數值
  // ========================================
  test.describe('Extreme Values', () => {

    test('Very small density', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-liquid',
        mw: '100',
        eq: '1.0',
        density: '0.001',
        purity: '99'
      });

      const volumeValue = await reagent.locator(SELECTORS.reagentVolume).inputValue();
      expect(volumeValue).not.toBe('NaN');
      expect(volumeValue).not.toBe('Infinity');
      expect(parseFloat(volumeValue)).toBeGreaterThan(0);
    });

    test('Very large MW', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '10000', // Polymer/Protein
        eq: '0.5',
        purity: '95'
      });

      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();
      expect(massValue).not.toBe('NaN');
      expect(parseFloat(massValue)).toBeGreaterThan(0);
    });

    test('High precision decimals', async ({ page }) => {
      const smCard = page.locator(SELECTORS.smCard);
      await smCard.locator('.sm-mw').fill('180.159876543210123456');
      await smCard.locator('.sm-mass').fill('100.123456789012345');

      const mmolValue = await page.inputValue(SELECTORS.smMmol);
      expect(mmolValue).not.toBe('NaN');
    });

    test('Very low concentration', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      await page.fill(SELECTORS.solventConc, '0.001');
      const volumeValue = await page.inputValue(SELECTORS.solventVolume);

      expect(volumeValue).not.toBe('NaN');
      expect(parseFloat(volumeValue)).toBeGreaterThan(0);
    });

    test('Zero equivalents (catalyst scenario)', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '300',
        eq: '0',
        purity: '100'
      });

      const mmolValue = await reagent.locator(SELECTORS.reagentMmol).inputValue();
      const massValue = await reagent.locator(SELECTORS.reagentMass).inputValue();

      expect(mmolValue).toBe('0.000');
      expect(massValue).toBe('0.00');
    });

  });

  // ========================================
  // 快速切換
  // ========================================
  test.describe('Rapid Switching', () => {

    test('Type switching clears old data', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '100',
        eq: '2.0',
        purity: '98'
      });

      // 確認有 mass 值
      const massValue1 = await reagent.locator(SELECTORS.reagentMass).inputValue();
      expect(massValue1).not.toBe('');

      // 切換到 Pure Liquid
      await reagent.locator(SELECTORS.reagentType).selectOption('pure-liquid');
      await page.waitForTimeout(300);

      // mass 應該被清空，density/volume 應該出現
      const massCleared = await reagent.locator(SELECTORS.reagentMass).inputValue();
      const volumeVisible = await reagent.locator(SELECTORS.reagentVolume).isVisible();
      const densityVisible = await reagent.locator(SELECTORS.reagentDensity).isVisible();

      expect(massCleared).toBe('');
      expect(volumeVisible).toBe(true);
      expect(densityVisible).toBe(true);
    });

    test('Multiple rapid switches remain stable', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();
      await reagent.locator(SELECTORS.reagentMw).fill('100');
      await reagent.locator(SELECTORS.reagentEq).fill('1.5');

      // 快速切換
      const types = ['pure-solid', 'pure-liquid', 'solution-molarity', 'solution-density', 'pure-solid'];
      for (const type of types) {
        await reagent.locator(SELECTORS.reagentType).selectOption(type);
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(500);

      // 最終狀態檢查
      const dataType = await reagent.getAttribute('data-type');
      expect(dataType).toBe('pure-solid');

      const massVisible = await reagent.locator(SELECTORS.reagentMass).isVisible();
      expect(massVisible).toBe(true);
    });

  });

  // ========================================
  // 常見錯誤
  // ========================================
  test.describe('Common Mistakes', () => {

    test('Forgot to fill equivalents (uses default)', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).last();

      await reagent.locator(SELECTORS.reagentMw).fill('100');
      await reagent.locator(SELECTORS.reagentPurity).fill('100');
      // eq 留預設

      const eqValue = await reagent.locator(SELECTORS.reagentEq).inputValue();
      expect(eqValue).toBe('1.0');
    });

    test('Switched type but forgot density', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagent = await addReagent(page, {
        type: 'pure-solid',
        mw: '100',
        eq: '2.0',
        purity: '99'
      });

      // 切換到 Pure Liquid 但忘記填 density
      await reagent.locator(SELECTORS.reagentType).selectOption('pure-liquid');
      await page.waitForTimeout(300);

      const volumeValue = await reagent.locator(SELECTORS.reagentVolume).inputValue();
      expect(volumeValue).not.toBe('NaN');
      expect(volumeValue).not.toBe('Infinity');
    });

  });

  // ========================================
  // 壓力測試
  // ========================================
  test.describe('Stress Test', () => {

    test('Add multiple reagents and calculate all', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      const reagentConfigs = [
        { type: 'pure-solid', mw: '100', eq: '2.0', purity: '99' },
        { type: 'pure-liquid', mw: '120', eq: '1.5', density: '1.2', purity: '95' },
        { type: 'solution-molarity', mw: '80', eq: '3.0', molarity: '2.5' },
        { type: 'pure-solid', mw: '200', eq: '0.5', purity: '100' }
      ];

      for (const config of reagentConfigs) {
        await addReagent(page, config);
      }

      await page.waitForTimeout(1000);

      // 驗證所有 mmol 顯示有效
      const reagentCards = page.locator(SELECTORS.reagentCard);
      const count = await reagentCards.count();

      for (let i = 0; i < count; i++) {
        const mmolValue = await reagentCards.nth(i).locator(SELECTORS.reagentMmol).inputValue();
        expect(mmolValue).not.toContain('NaN');
      }
    });

  });

});
