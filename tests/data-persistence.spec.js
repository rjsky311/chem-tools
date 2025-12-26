/**
 * Data Persistence Tests
 * 測試 LocalStorage 持久化、Save/Load JSON
 */

const { test, expect } = require('@playwright/test');
const { SELECTORS, setupCleanState, setupStartingMaterial, addReagent } = require('./helpers');

test.describe('Data Persistence', () => {

  test.beforeEach(async ({ page }) => {
    await setupCleanState(page);
  });

  // ========================================
  // LocalStorage 自動存檔
  // ========================================
  test.describe('Auto-Save', () => {

    test('SM data persists after reload', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '180.16', mass: '100' });
      await page.fill(SELECTORS.smCas, '50-78-2');
      await page.waitForTimeout(300);

      // Reload
      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      // Verify
      const smCard = page.locator(SELECTORS.smCard);
      expect(await smCard.locator('.sm-mw').inputValue()).toBe('180.16');
      expect(await smCard.locator('.sm-mass').inputValue()).toBe('100');
      expect(await page.inputValue(SELECTORS.smCas)).toBe('50-78-2');
    });

    test('Reagent data persists after reload', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      await addReagent(page, {
        type: 'pure-liquid',
        mw: '50',
        eq: '2.0',
        density: '0.8',
        purity: '95'
      });

      await page.waitForTimeout(500);

      // Reload
      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);
      await page.waitForTimeout(500);

      // Verify reagent exists
      const reagentCount = await page.locator(SELECTORS.reagentCard).count();
      expect(reagentCount).toBeGreaterThan(0);

      // Verify data
      const reagent = page.locator(SELECTORS.reagentCard).last();
      expect(await reagent.locator(SELECTORS.reagentType).inputValue()).toBe('pure-liquid');
      expect(await reagent.locator(SELECTORS.reagentMw).inputValue()).toBe('50');
      expect(await reagent.locator(SELECTORS.reagentEq).inputValue()).toBe('2.0');
    });

    test('Solvent data persists after reload', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      await page.fill(SELECTORS.solventName, 'THF');
      await page.fill(SELECTORS.solventCas, '109-99-9');
      await page.fill(SELECTORS.solventConc, '0.5');
      await page.waitForTimeout(300);

      // Reload
      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      // Verify
      expect(await page.inputValue(SELECTORS.solventName)).toBe('THF');
      expect(await page.inputValue(SELECTORS.solventCas)).toBe('109-99-9');
      expect(await page.inputValue(SELECTORS.solventConc)).toBe('0.5');
    });

    test('Procedure steps persist after reload', async ({ page }) => {
      await page.fill(SELECTORS.newStepInput, 'Test step persist');
      await page.click(SELECTORS.addStepBtn);
      await page.click(SELECTORS.stepCheckbox);
      await page.fill('.observation-input', 'Test observation');

      await page.waitForTimeout(300);

      // Reload
      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      // Verify
      await expect(page.locator(SELECTORS.stepText)).toContainText('Test step persist');
      await expect(page.locator(SELECTORS.stepText)).toHaveClass(/done/);
      await expect(page.locator('.observation-input')).toHaveValue('Test observation');
      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('1/1');
    });

    test('Product data persists after reload', async ({ page }) => {
      await page.fill(SELECTORS.productMw, '250');
      await page.fill(SELECTORS.productActual, '75');
      await page.waitForTimeout(300);

      // Reload
      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      // Verify
      expect(await page.inputValue(SELECTORS.productMw)).toBe('250');
      expect(await page.inputValue(SELECTORS.productActual)).toBe('75');
    });

    test('Reagent role persists after reload', async ({ page }) => {
      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).last();
      await reagent.locator(SELECTORS.reagentRole).selectOption('catalyst');

      await page.waitForTimeout(500);

      // Reload
      await page.reload();
      await page.waitForSelector(SELECTORS.reagentCard);

      // Verify
      const roleValue = await page.locator(`${SELECTORS.reagentCard} ${SELECTORS.reagentRole}`).last().inputValue();
      expect(roleValue).toBe('catalyst');
    });

  });

  // ========================================
  // Save/Load JSON
  // ========================================
  test.describe('Save/Load JSON', () => {

    test('Save button triggers download', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '100', mass: '100' });

      // Listen for download
      const downloadPromise = page.waitForEvent('download');
      await page.click(SELECTORS.saveBtn);
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('.json');
    });

    test('Load button triggers file input', async ({ page }) => {
      const isClicked = await page.evaluate(() => {
        return new Promise(resolve => {
          const input = document.getElementById('fileInput');
          const originalClick = input.click;
          input.click = () => {
            resolve(true);
            input.click = originalClick;
          };
          document.getElementById('loadBtn').click();
          setTimeout(() => resolve(false), 1000);
        });
      });

      expect(isClicked).toBe(true);
    });

    test('Hidden file input has correct attributes', async ({ page }) => {
      const fileInput = page.locator('#fileInput');
      await expect(fileInput).toBeHidden();
      await expect(fileInput).toHaveAttribute('type', 'file');
      await expect(fileInput).toHaveAttribute('accept', '.json');
    });

  });

  // ========================================
  // 向後相容
  // ========================================
  test.describe('Backward Compatibility', () => {

    test('Migrates old notes to steps', async ({ page }) => {
      // 注入舊格式資料
      await page.evaluate(() => {
        const oldData = {
          startingMaterial: { cas: '', mw: '', mass: '', smiles: '' },
          reagents: [],
          conditions: {
            solventName: 'DCM',
            solventCAS: '',
            solventBP: '',
            solventConc: '',
            temperature: '25°C',
            time: '2h',
            notes: 'This is an old note that should be migrated'
          },
          product: { smiles: '', cas: '', mw: '', name: '' }
        };
        localStorage.setItem('reactionPlanData', JSON.stringify(oldData));
      });

      // Reload 觸發遷移
      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      // 驗證遷移
      await expect(page.locator(SELECTORS.stepText)).toContainText('This is an old note that should be migrated');
      await expect(page.locator(SELECTORS.procedureItem)).toHaveCount(1);
    });

    test('Handles empty notes gracefully', async ({ page }) => {
      await page.evaluate(() => {
        const oldData = {
          startingMaterial: {},
          reagents: [],
          conditions: { notes: '' },
          product: {}
        };
        localStorage.setItem('reactionPlanData', JSON.stringify(oldData));
      });

      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      await expect(page.locator(SELECTORS.procedureItem)).toHaveCount(0);
      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('0/0');
    });

    test('Preserves new steps format', async ({ page }) => {
      await page.evaluate(() => {
        const newData = {
          startingMaterial: {},
          reagents: [],
          conditions: {
            steps: [
              { id: 'step-1', text: 'Existing step 1', isDone: true, observation: 'Done!' },
              { id: 'step-2', text: 'Existing step 2', isDone: false, observation: '' }
            ]
          },
          product: {}
        };
        localStorage.setItem('reactionPlanData', JSON.stringify(newData));
      });

      await page.reload();
      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      await expect(page.locator(SELECTORS.procedureItem)).toHaveCount(2);
      await expect(page.locator('.step-text >> nth=0')).toContainText('Existing step 1');
      await expect(page.locator('.step-text >> nth=0')).toHaveClass(/done/);
      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('1/2');
    });

  });

  // ========================================
  // Clear All
  // ========================================
  test.describe('Clear All', () => {

    test('Shows confirmation dialog', async ({ page }) => {
      let dialogShown = false;

      page.on('dialog', async dialog => {
        dialogShown = true;
        expect(dialog.message()).toContain('清空所有資料');
        await dialog.dismiss();
      });

      await page.click(SELECTORS.clearAllBtn);
      await page.waitForTimeout(500);

      expect(dialogShown).toBe(true);
    });

    test('Does NOT clear when cancelled', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '180.16', mass: '100' });

      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

      await page.click(SELECTORS.clearAllBtn);
      await page.waitForTimeout(500);

      // Data should still be there
      const smCard = page.locator(SELECTORS.smCard);
      expect(await smCard.locator('.sm-mw').inputValue()).toBe('180.16');
    });

    test('Clears all data when confirmed', async ({ page }) => {
      await setupStartingMaterial(page, { mw: '180.16', mass: '100' });

      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.click(SELECTORS.clearAllBtn)
      ]);

      await page.waitForSelector(SELECTORS.reactionSchemeSection);

      // Verify localStorage is cleared
      const hasStoredData = await page.evaluate(() => {
        return localStorage.getItem('reactionPlanData') !== null;
      });

      expect(hasStoredData).toBe(false);
    });

  });

});
