const { test, expect } = require('@playwright/test');

test.describe('Dr. Chem v5.0 Pro Edition - 嚴格驗收測試', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // 清空環境
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // 確保主要區域已載入 (這裡用 .scheme-container 是 v5.0 的新 class)
    // 如果你的 HTML 還沒完全改成 v5，這個可能會 timeout，但這是正確的驗收標準
    await page.waitForSelector('body'); 
  });

  // 1. 驗證: 試劑卡片 UI (SMILES + Canvas)
  test('v5.0 Reagent UI: Should have SMILES input and Canvas', async ({ page }) => {
    // 修正選擇器: #add-reagent -> #add-reagent-btn
    await page.click('#add-reagent-btn');
    const reagentCard = page.locator('.reagent-card').first();

    // 檢查 SMILES 輸入框
    await expect(reagentCard.locator('.reagent-smiles')).toBeVisible();

    // 檢查 Canvas (寬度屬性應為 450)
    await expect(reagentCard.locator('canvas.compound-canvas')).toHaveAttribute('width', '450');
  });

  // 2. 驗證: Fetch 功能 (自動填入 SMILES)
  test('v5.0 Integration: Fetching Reagent CAS should auto-fill SMILES', async ({ page }) => {
    // 🔧 Mock PubChem API 回應 (避免網路依賴)
    await page.route('**/pubchem.ncbi.nlm.nih.gov/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          PropertyTable: {
            Properties: [{
              CID: 887,
              MolecularWeight: 32.04,
              IUPACName: "methanol",
              CanonicalSMILES: "CO"
            }]
          }
        })
      });
    });

    await page.click('#add-reagent-btn');
    const reagentCard = page.locator('.reagent-card').first();

    await reagentCard.locator('.reagent-cas').fill('67-56-1'); // Methanol
    await reagentCard.locator('.btn-fetch').click();

    // 等待 Fetch 結束 (loading class removed)
    await expect(reagentCard.locator('.btn-fetch')).not.toHaveClass(/btn-loading/, { timeout: 5000 });

    // 檢查 SMILES 是否正確 (Methanol SMILES = "CO")
    const smilesInput = reagentCard.locator('.reagent-smiles');
    await expect(smilesInput).toHaveValue('CO', { timeout: 5000 });
    console.log('[Test] Fetched SMILES: CO ✅');
  });

  // 3. 驗證: 計算邏輯 (mmol)
  test('v5.0 Logic: Reagent Amount (mmol) should be calculated correctly', async ({ page }) => {
    // 設定 SM (100mg / 100g/mol = 1 mmol)
    // 這裡假設我們有 id 或 class，用 locator 比較保險
    const smCard = page.locator('#starting-material-card'); // 假設 SM 卡片有這個 ID
    await smCard.locator('.sm-mw').fill('100');
    await smCard.locator('.sm-mass').fill('100');
    
    // 新增試劑 (Eq = 2)
    await page.click('#add-reagent-btn');
    const reagentCard = page.locator('.reagent-card').first();
    await reagentCard.locator('.reagent-mw').fill('50');
    await reagentCard.locator('.reagent-eq').fill('2.0');

    // 驗證: 1 mmol * 2.0 = 2.0 mmol
    // 使用 toHaveValue 會比 textContent 更適合檢查 input 欄位
    const mmolInput = reagentCard.locator('.reagent-mmol');
    await expect(mmolInput).toHaveValue('2.000'); 
    
    console.log('[Test] Reagent mmol checked successfully');
  });

  // 4. 驗證: 響應式佈局 (在平板/手機尺寸下應可換行)
  test('v5.0 Layout: Container should allow wrapping on mobile/tablet', async ({ page }) => {
    // 設定視窗寬度 < 1200px 以觸發響應式換行
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();

    // 這裡我們抓 v5.0 新的 container class
    const container = page.locator('.scheme-container');
    
    // 確保它存在
    await expect(container).toBeVisible();

    // 檢查 CSS
    await expect(container).toHaveCSS('flex-wrap', 'wrap');
    console.log('[Test] Flex wrap verified');
  });
});