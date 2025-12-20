const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Dr. Chem 數位反應規劃表驗收', () => {
  
  test.beforeEach(async ({ page }) => {
    // 這裡我們讓 Playwright 直接打開您的檔案，這樣就不用管 Live Server 有沒有開了！
    // 這是最簡單的本地測試方法
    const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
    await page.goto(fileUrl); 
  });

  test('階段一：基準設定 (Starting Material)', async ({ page }) => {
    // 1. 輸入 MW=100, Mass=100
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100');
    
    // 2. 驗證 mmol 是否為 1.0000 (精度檢查)
    const mmolValue = await page.inputValue('#sm-mmol');
    expect(mmolValue).toBe('1.0000');
  });

  test('階段二：純固體測試 (Pure Solid)', async ({ page }) => {
    // 1. 設定 SM
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100'); // 1 mmol

    // 2. 新增試劑
    await page.click('#add-reagent');
    
    // 3. 設定 Pure Solid 參數
    // 注意：因為 Playwright 速度太快，有時候要先確保元素出現
    const row = page.locator('.reagent-row').first();
    await row.locator('.reagent-type').selectOption('pure-solid');
    await row.locator('.reagent-mw').fill('50');
    await row.locator('.reagent-eq').fill('2.0');
    await row.locator('.reagent-purity').fill('50'); // 50% 純度

    // 4. 驗證 Mass 是否放大 (理論 100mg / 0.5 = 200mg)
    const massValue = await row.locator('.reagent-mass').inputValue();
    expect(massValue).toBe('200.00');
  });

  test('階段三：純液體測試 (Pure Liquid)', async ({ page }) => {
    // 1. 設定 SM (1 mmol)
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100');

    // 2. 新增試劑
    await page.click('#add-reagent');
    const row = page.locator('.reagent-row').first();
    
    // 3. 切換為 Pure Liquid
    await row.locator('.reagent-type').selectOption('pure-liquid');
    
    // 4. 輸入參數 (MW=100, d=0.8)
    await row.locator('.reagent-mw').fill('100');
    await row.locator('.reagent-eq').fill('1.0');
    await row.locator('.reagent-density').fill('0.8');
    await row.locator('.reagent-purity').fill('100');

    // 5. 驗證 Volume (理論 100mg / 0.8 = 125 uL = 0.125 mL)
    const volValue = await row.locator('.reagent-volume').inputValue();
    expect(volValue).toBe('0.125');
  });

  test('階段四：溶劑計算機精度 (Solvent)', async ({ page }) => {
    // 1. 設定 SM (1 mmol)
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100');

    // 2. 設定溶劑濃度 0.1 M
    await page.fill('#solvent-conc', '0.1');

    // 3. 驗證體積 (1 / 0.1 = 10.000 mL)
    const solventVol = await page.inputValue('#solvent-volume');
    // 字串比對，確認有三位小數
    expect(solventVol).toBe('10.000');
  });
});