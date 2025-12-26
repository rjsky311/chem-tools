/**
 * UI Components Tests
 * 測試 UI 元件存在性、可見性、互動性
 */

const { test, expect } = require('@playwright/test');
const { SELECTORS, setupCleanState, setupStartingMaterial, mockPubChemCompound, mockPubChemError, mockPubChemWithPhysicalProps } = require('./helpers');

test.describe('UI Components', () => {

  test.beforeEach(async ({ page }) => {
    await setupCleanState(page);
  });

  // ========================================
  // v5.0 卡片 UI
  // ========================================
  test.describe('Card Layout', () => {

    test('SM card has SMILES input', async ({ page }) => {
      await expect(page.locator(SELECTORS.smSmiles)).toBeVisible();
    });

    test('SM card has canvas 450x300', async ({ page }) => {
      const canvas = page.locator(SELECTORS.smCanvas);
      await expect(canvas).toHaveAttribute('width', '450');
      await expect(canvas).toHaveAttribute('height', '300');
    });

    test('Reagent card has all required inputs', async ({ page }) => {
      await page.click(SELECTORS.addReagentBtn);
      const reagentCard = page.locator(SELECTORS.reagentCard).first();

      await expect(reagentCard.locator(SELECTORS.reagentSmiles)).toBeVisible();
      await expect(reagentCard.locator(SELECTORS.reagentCanvas)).toHaveAttribute('width', '450');
    });

    test('Product card has CAS fetch button', async ({ page }) => {
      await expect(page.locator(SELECTORS.productCas)).toBeVisible();
      await expect(page.locator(SELECTORS.productFetchBtn)).toBeVisible();
      await expect(page.locator(SELECTORS.productFetchBtn)).toHaveText('Fetch');
    });

    test('Add reagent button exists and works', async ({ page }) => {
      await expect(page.locator(SELECTORS.addReagentBtn)).toBeVisible();

      const initialCount = await page.locator(SELECTORS.reagentCard).count();
      await page.click(SELECTORS.addReagentBtn);
      const newCount = await page.locator(SELECTORS.reagentCard).count();

      expect(newCount).toBe(initialCount + 1);
    });

  });

  // ========================================
  // Fetch 功能 (使用 API mock)
  // ========================================
  test.describe('Fetch Integration', () => {

    test('SM Fetch fills MW, SMILES, Name', async ({ page }) => {
      await mockPubChemCompound(page, {
        mw: 180.16,
        smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
        name: 'aspirin'
      });

      await page.fill(SELECTORS.smCas, '50-78-2');
      await page.click(SELECTORS.smFetchBtn);

      // 等待 loading 結束
      await expect(page.locator(SELECTORS.smFetchBtn)).not.toHaveClass(/loading/, { timeout: 5000 });

      // 檢查 SMILES 已填入
      const smilesValue = await page.inputValue(SELECTORS.smSmiles);
      expect(smilesValue).toBeTruthy();
      expect(smilesValue.length).toBeGreaterThan(5);
    });

    test('Reagent Fetch fills MW and SMILES', async ({ page }) => {
      await mockPubChemCompound(page, {
        mw: 32.04,
        smiles: 'CO',
        name: 'methanol'
      });

      await page.click(SELECTORS.addReagentBtn);
      const reagentCard = page.locator(SELECTORS.reagentCard).first();

      await reagentCard.locator(SELECTORS.reagentCas).fill('67-56-1');
      await reagentCard.locator(SELECTORS.btnFetch).click();

      // 等待 loading 結束
      await expect(reagentCard.locator(SELECTORS.btnFetch)).not.toHaveClass(/btn-loading/, { timeout: 5000 });

      // 檢查 SMILES
      const smilesInput = reagentCard.locator(SELECTORS.reagentSmiles);
      await expect(smilesInput).toHaveValue('CO', { timeout: 5000 });
    });

    test('Product Fetch fills SMILES', async ({ page }) => {
      await mockPubChemCompound(page, {
        mw: 138.12,
        smiles: 'OC1=CC=CC=C1C(O)=O',
        name: 'salicylic acid'
      });

      await page.fill(SELECTORS.productCas, '69-72-7');
      await page.click(SELECTORS.productFetchBtn);

      await page.waitForTimeout(1000);

      const smilesValue = await page.inputValue(SELECTORS.productSmiles);
      expect(smilesValue).toBeTruthy();
    });

    test('Invalid CAS shows error', async ({ page }) => {
      await mockPubChemError(page);

      let alertShown = false;
      page.on('dialog', async dialog => {
        alertShown = true;
        expect(dialog.message()).toContain('Error');
        await dialog.accept();
      });

      await page.fill(SELECTORS.smCas, 'INVALID-999');
      await page.click(SELECTORS.smFetchBtn);

      await page.waitForTimeout(2000);
      expect(alertShown).toBe(true);
    });

  });

  // ========================================
  // Procedure Checklist
  // ========================================
  test.describe('Procedure Checklist', () => {

    test('Add step input and button visible', async ({ page }) => {
      await expect(page.locator(SELECTORS.newStepInput)).toBeVisible();
      await expect(page.locator(SELECTORS.addStepBtn)).toBeVisible();
      await expect(page.locator(SELECTORS.addStepBtn)).toHaveText('Add Step');
    });

    test('Progress badge shows 0/0 initially', async ({ page }) => {
      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('0/0');
    });

    test('Can add a new step', async ({ page }) => {
      await page.fill(SELECTORS.newStepInput, 'Test step 1');
      await page.click(SELECTORS.addStepBtn);

      await expect(page.locator(SELECTORS.procedureItem)).toHaveCount(1);
      await expect(page.locator(SELECTORS.stepText)).toContainText('Test step 1');
      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('0/1');
    });

    test('Can toggle step completion', async ({ page }) => {
      await page.fill(SELECTORS.newStepInput, 'Toggle test');
      await page.click(SELECTORS.addStepBtn);

      // 初始未完成
      await expect(page.locator(SELECTORS.stepText)).not.toHaveClass(/done/);

      // 點擊 checkbox 標記完成
      await page.click(SELECTORS.stepCheckbox);
      await expect(page.locator(SELECTORS.stepText)).toHaveClass(/done/);
      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('1/1');

      // 再點擊取消
      await page.click(SELECTORS.stepCheckbox);
      await expect(page.locator(SELECTORS.stepText)).not.toHaveClass(/done/);
    });

    test('Progress updates with multiple steps', async ({ page }) => {
      await page.fill(SELECTORS.newStepInput, 'Step 1');
      await page.click(SELECTORS.addStepBtn);
      await page.fill(SELECTORS.newStepInput, 'Step 2');
      await page.click(SELECTORS.addStepBtn);
      await page.fill(SELECTORS.newStepInput, 'Step 3');
      await page.click(SELECTORS.addStepBtn);

      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('0/3');

      // 完成 2 個
      await page.click('.step-checkbox >> nth=0');
      await page.click('.step-checkbox >> nth=2');

      await expect(page.locator(SELECTORS.procedureProgress)).toHaveText('2/3');
    });

  });

  // ========================================
  // 結構視覺化
  // ========================================
  test.describe('Structure Visualization', () => {

    test('Canvas has ARIA attributes', async ({ page }) => {
      const smCanvas = page.locator(SELECTORS.smCanvas);
      await expect(smCanvas).toHaveAttribute('role', 'img');

      const ariaLabel = await smCanvas.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('Shows stereo warning for chiral SMILES', async ({ page }) => {
      const chiralSmiles = 'C[C@H](O)c1ccccc1'; // (S)-1-phenylethanol
      const input = page.locator(SELECTORS.smSmiles);

      await input.clear();
      await input.pressSequentially(chiralSmiles, { delay: 50 });
      await input.blur();

      const warning = page.locator('#sm-stereo-warning');
      await expect(warning).toBeVisible({ timeout: 5000 });
    });

    test('Hides stereo warning for non-chiral SMILES', async ({ page }) => {
      await page.fill(SELECTORS.smSmiles, 'CC(=O)O'); // Acetic acid
      await page.locator(SELECTORS.smSmiles).blur();
      await page.waitForTimeout(500);

      const warning = page.locator('#sm-stereo-warning');
      await expect(warning).toBeHidden();
    });

    test('Shows error for invalid SMILES', async ({ page }) => {
      await page.fill(SELECTORS.smSmiles, 'INVALID123');
      await page.locator(SELECTORS.smSmiles).blur();
      await page.waitForTimeout(500);

      await expect(page.locator(SELECTORS.smCanvas)).toHaveClass(/error/);
      await expect(page.locator('#sm-error')).toContainText('Invalid SMILES');
    });

  });

  // ========================================
  // 響應式佈局
  // ========================================
  test.describe('Responsive Layout', () => {

    test('Wraps on tablet (1024px)', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.reload();

      const container = page.locator(SELECTORS.schemeContainer);
      await expect(container).toBeVisible();
      await expect(container).toHaveCSS('flex-wrap', 'wrap');
    });

    test('Wraps on mobile (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();

      const container = page.locator(SELECTORS.schemeContainer);
      await expect(container).toHaveCSS('flex-wrap', 'wrap');
    });

  });

  // ========================================
  // 按鈕與工具列
  // ========================================
  test.describe('Toolbar Buttons', () => {

    test('Save JSON button exists', async ({ page }) => {
      await expect(page.locator(SELECTORS.saveBtn)).toBeVisible();
      await expect(page.locator(SELECTORS.saveBtn)).toHaveText(/Save JSON/);
    });

    test('Load JSON button exists', async ({ page }) => {
      await expect(page.locator(SELECTORS.loadBtn)).toBeVisible();
      await expect(page.locator(SELECTORS.loadBtn)).toHaveText(/Load JSON/);
    });

    test('Clear All button exists', async ({ page }) => {
      await expect(page.locator(SELECTORS.clearAllBtn)).toBeVisible();
      await expect(page.locator(SELECTORS.clearAllBtn)).toHaveText('Clear All');
    });

    test('Print button exists', async ({ page }) => {
      await expect(page.locator(SELECTORS.exportBtn)).toBeVisible();
      await expect(page.locator(SELECTORS.exportBtn)).toHaveText(/Print/);
    });

  });

  // ========================================
  // 深色模式 (Dark Mode)
  // ========================================
  test.describe('Dark Mode', () => {

    test('Dark mode uses correct CSS variables', async ({ page }) => {
      // 模擬系統深色模式
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();

      // 檢查背景色是否變深
      const body = page.locator('body');
      const bgColor = await body.evaluate(el => getComputedStyle(el).getPropertyValue('--background'));

      // 深色模式的背景應該是深色
      expect(bgColor.trim()).not.toBe('#ffffff');
    });

    test('Text remains readable in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();

      // 檢查主要文字顏色
      const textColor = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return style.getPropertyValue('--text-color').trim();
      });

      // 深色模式文字應該是淺色
      expect(textColor).not.toBe('#333333');
      expect(textColor).not.toBe('#000000');
    });

    test('Cards are visible in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();

      // 確認卡片可見且有邊框
      const smCard = page.locator(SELECTORS.smCard);
      await expect(smCard).toBeVisible();

      const borderColor = await smCard.evaluate(el => getComputedStyle(el).borderColor);
      expect(borderColor).toBeTruthy();
    });

    test('Input fields are readable in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();

      // 檢查輸入框樣式
      const input = page.locator(SELECTORS.smCard).locator('.sm-mw');
      await expect(input).toBeVisible();

      const inputBg = await input.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(inputBg).toBeTruthy();
    });

  });

  // ========================================
  // 試劑 Fetch 增強功能
  // ========================================
  test.describe('Reagent Fetch Enhancement', () => {

    test('Reagent Fetch fills SMILES like SM/Product', async ({ page }) => {
      await mockPubChemWithPhysicalProps(page, {
        mw: 32.04,
        smiles: 'CO',
        name: 'methanol'
      });

      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();

      await reagent.locator(SELECTORS.reagentCas).fill('67-56-1');
      await reagent.locator(SELECTORS.btnFetch).click();

      // 等待 loading 結束
      await expect(reagent.locator(SELECTORS.btnFetch)).not.toHaveClass(/btn-loading/, { timeout: 5000 });

      // 檢查 SMILES 已填入
      await expect(reagent.locator(SELECTORS.reagentSmiles)).toHaveValue('CO', { timeout: 5000 });
    });

    test('Reagent Fetch auto-detects liquid and fills density', async ({ page }) => {
      // Mock 包含熔點和密度的回應 (甲醇：熔點 -98°C，密度 0.79)
      await mockPubChemWithPhysicalProps(page, {
        mw: 32.04,
        smiles: 'CO',
        name: 'methanol',
        meltingPoint: '-98 °C',
        density: '0.79'
      });

      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();

      await reagent.locator(SELECTORS.reagentCas).fill('67-56-1');
      await reagent.locator(SELECTORS.btnFetch).click();

      // 等待 loading 結束
      await expect(reagent.locator(SELECTORS.btnFetch)).not.toHaveClass(/btn-loading/, { timeout: 5000 });

      // 應自動切換到 Pure Liquid
      await expect(reagent).toHaveAttribute('data-type', 'pure-liquid', { timeout: 5000 });

      // 應自動填入密度
      await expect(reagent.locator(SELECTORS.reagentDensity)).toHaveValue('0.79', { timeout: 5000 });
    });

    test('Reagent Fetch keeps solid type for high melting point', async ({ page }) => {
      // Mock 阿斯匹靈：熔點 135°C (固體)
      await mockPubChemWithPhysicalProps(page, {
        mw: 180.16,
        smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
        name: 'aspirin',
        meltingPoint: '135 °C',
        density: null
      });

      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();

      await reagent.locator(SELECTORS.reagentCas).fill('50-78-2');
      await reagent.locator(SELECTORS.btnFetch).click();

      // 等待 loading 結束
      await expect(reagent.locator(SELECTORS.btnFetch)).not.toHaveClass(/btn-loading/, { timeout: 5000 });

      // 應保持 Pure Solid (預設類型)
      await expect(reagent).toHaveAttribute('data-type', 'pure-solid', { timeout: 5000 });
    });

    test('Shows warning toast when no physical data available', async ({ page }) => {
      // Mock 沒有熔點和密度資料
      await mockPubChemWithPhysicalProps(page, {
        mw: 100,
        smiles: 'C1CCCCC1',
        name: 'cyclohexane',
        meltingPoint: null,
        density: null
      });

      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();

      await reagent.locator(SELECTORS.reagentCas).fill('110-82-7');
      await reagent.locator(SELECTORS.btnFetch).click();

      // 等待 loading 結束
      await expect(reagent.locator(SELECTORS.btnFetch)).not.toHaveClass(/btn-loading/, { timeout: 5000 });

      // 應顯示警告 Toast
      await expect(page.locator('.toast.warning, .toast-warning')).toBeVisible({ timeout: 5000 });
    });

    test('User manual type selection is not overridden by Fetch', async ({ page }) => {
      await mockPubChemWithPhysicalProps(page, {
        mw: 32.04,
        smiles: 'CO',
        name: 'methanol',
        meltingPoint: '-98 °C',
        density: '0.79'
      });

      await page.click(SELECTORS.addReagentBtn);
      const reagent = page.locator(SELECTORS.reagentCard).first();

      // 用戶先手動選擇 Solution (Molarity)
      await reagent.locator(SELECTORS.reagentType).selectOption('solution-molarity');
      await page.waitForTimeout(100);

      // 確認已切換
      await expect(reagent).toHaveAttribute('data-type', 'solution-molarity');

      // 執行 Fetch
      await reagent.locator(SELECTORS.reagentCas).fill('67-56-1');
      await reagent.locator(SELECTORS.btnFetch).click();

      // 等待 loading 結束
      await expect(reagent.locator(SELECTORS.btnFetch)).not.toHaveClass(/btn-loading/, { timeout: 5000 });

      // 用戶手動選擇的類型應該被保留，不應被 Fetch 覆蓋
      await expect(reagent).toHaveAttribute('data-type', 'solution-molarity');
    });

  });

});
