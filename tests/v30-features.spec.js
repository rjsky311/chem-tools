const { test, expect } = require('@playwright/test');

test.describe('v3.0 Features', () => {
  test.beforeEach(async ({ page }) => {
    // 先載入頁面
    await page.goto('http://localhost:3000');

    // 使用 evaluate 直接在當前頁面寫入空資料 (只執行一次，不會在 reload 時重複)
    await page.evaluate(() => {
        const emptyPlan = {
            startingMaterial: { smiles: '', mw: 0, mass: 0, mmol: 0, cas: '' },
            product: { smiles: '', cas: '', mw: 0, name: '', theoreticalYield: 0, actualMass: 0, percentYield: 0 },
            reagents: [],
            conditions: { solventName: '', solventCAS: '', solventBP: '', solventConc: 0, solventVolume: 0, temperature: '', time: '', notes: '' },
            limitingReagent: null,
            reagentCounter: 0
        };
        localStorage.setItem('reactionPlanData', JSON.stringify(emptyPlan));
    });

    // 重新整理頁面，讓 App 讀取這份空資料 (這會跳過範例載入)
    await page.reload();
  });

  test('v3.0 Feature: Limiting Reagent › SM should be limiting when it has lowest mmol', async ({ page }) => {
    // Setup SM
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100'); // 1 mmol

    // Add Reagent (Excess)
    await page.click('#add-reagent');
    const row = page.locator('.reagent-row').first();
    await row.locator('.reagent-mw').fill('50');
    await row.locator('.reagent-eq').fill('2.0'); // 2 mmol

    // Check Badge on SM
    await expect(page.locator('#sm-card')).toHaveClass(/is-limiting/);
    await expect(page.locator('#sm-card .limiting-badge')).toBeVisible();
  });

  test('v3.0 Feature: Limiting Reagent › Reagent should be limiting when eq < 1', async ({ page }) => {
    // Setup SM
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100'); // 1 mmol

    // Add Reagent (Limiting)
    await page.click('#add-reagent');
    const row = page.locator('.reagent-row').first();
    await row.locator('.reagent-mw').fill('50');
    await row.locator('.reagent-eq').fill('0.5'); // 0.5 mmol

    // Check Badge on Reagent
    await expect(row).toHaveClass(/is-limiting/);
    await expect(row.locator('.limiting-badge')).toBeVisible();
  });

  test('v3.0 Feature: Limiting Reagent › Catalysts should not affect limiting calculation', async ({ page }) => {
    // Setup SM
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100'); // 1 mmol

    // Add Catalyst (Small amount)
    await page.click('#add-reagent');
    const row = page.locator('.reagent-row').first();
    // 選擇 Catalyst (這會觸發 updateReagentInModel 和 determineLimitingReagent)
    await row.locator('.reagent-role').selectOption('catalyst');
    await row.locator('.reagent-mw').fill('50');
    await row.locator('.reagent-eq').fill('0.1'); // 0.1 mmol (lowest but catalyst)

    // SM should still be limiting (or another reactant), not catalyst
    await expect(page.locator('#sm-card')).toHaveClass(/is-limiting/);
    await expect(row).not.toHaveClass(/is-limiting/);
  });

  test('v3.0 Feature: Yield Calculation › Should calculate theoretical yield correctly', async ({ page }) => {
    // SM: 1 mmol
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100');
    
    // Product MW: 200
    await page.fill('#product-mw', '200');

    // Theoretical = 1 mmol * 200 = 200 mg
    const theoretical = await page.locator('#product-theoretical').textContent();
    expect(theoretical).toBe('200.00');
  });

  test('v3.0 Feature: Yield Calculation › Should show green light for >80% yield', async ({ page }) => {
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100'); // 1 mmol SM
    await page.fill('#product-mw', '100'); // 100 mg theoretical
    
    // Actual: 90 mg (90%)
    await page.fill('#product-actual', '90');
    
    const yieldDisplay = page.locator('#yield-display');
    await expect(yieldDisplay).toHaveClass(/yield-excellent/);
  });

  test('v3.0 Feature: Yield Calculation › Should show yellow light for 50-80% yield', async ({ page }) => {
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100');
    await page.fill('#product-mw', '100');
    
    // Actual: 60 mg (60%)
    await page.fill('#product-actual', '60');
    
    const yieldDisplay = page.locator('#yield-display');
    await expect(yieldDisplay).toHaveClass(/yield-good/);
  });

  test('v3.0 Feature: Yield Calculation › Should show red light for <50% yield', async ({ page }) => {
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100');
    await page.fill('#product-mw', '100');
    
    // Actual: 30 mg (30%)
    await page.fill('#product-actual', '30');
    
    const yieldDisplay = page.locator('#yield-display');
    await expect(yieldDisplay).toHaveClass(/yield-poor/);
  });

  test('v3.0 Feature: Yield Calculation › Yield percentage should display correctly', async ({ page }) => {
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100');
    await page.fill('#product-mw', '100');
    await page.fill('#product-actual', '75');
    
    const yieldPercentage = await page.locator('#yield-percentage').textContent();
    expect(yieldPercentage).toBe('75.0%');
  });

  test('v3.0 Feature: Product MW › Product MW input should exist', async ({ page }) => {
    await expect(page.locator('#product-mw')).toBeVisible();
  });

  test('v3.0 Feature: Product MW › Theoretical yield should update when Product MW changes', async ({ page }) => {
    await page.fill('#sm-mw', '100');
    await page.fill('#sm-mass', '100'); // 1 mmol
    
    await page.fill('#product-mw', '150');
    
    const theoretical = await page.locator('#product-theoretical').textContent();
    expect(theoretical).toBe('150.00');
  });

  test('v3.0 Feature: Role Selector › Role selector should exist on reagent cards', async ({ page }) => {
    await page.click('#add-reagent');
    const roleSelect = page.locator('.reagent-row .reagent-role').first();
    await expect(roleSelect).toBeVisible();
  });

  test('v3.0 Feature: Role Selector › Role selector should have correct options', async ({ page }) => {
    await page.click('#add-reagent');
    const roleSelect = page.locator('.reagent-row .reagent-role').first();
    
    await expect(roleSelect.locator('option[value="reactant"]')).toBeAttached();
    await expect(roleSelect.locator('option[value="reagent"]')).toBeAttached();
    await expect(roleSelect.locator('option[value="catalyst"]')).toBeAttached();
  });

  test('v3.0 Feature: Role Selector › Role should default to reagent', async ({ page }) => {
    await page.click('#add-reagent');
    const roleValue = await page.locator('.reagent-row .reagent-role').first().inputValue();
    expect(roleValue).toBe('reagent');
  });

  test('v3.0 Feature: Data Persistence › Product MW should persist after reload', async ({ page }) => {
    await page.fill('#product-mw', '250');
    await page.reload();
    const mwValue = await page.locator('#product-mw').inputValue();
    expect(mwValue).toBe('250');
  });

  test('v3.0 Feature: Data Persistence › Actual mass should persist after reload', async ({ page }) => {
    await page.fill('#product-actual', '75');
    await page.reload();
    const actualValue = await page.locator('#product-actual').inputValue();
    expect(actualValue).toBe('75');
  });

  test('v3.0 Feature: Data Persistence › Reagent role should persist after reload', async ({ page }) => {
    await page.click('#add-reagent');
    const row = page.locator('.reagent-row').first();
    await row.locator('.reagent-role').selectOption('catalyst');
    
    // Wait for save
    await page.waitForTimeout(500);
    
    await page.reload();
    await page.waitForSelector('.reagent-row');
    
    const roleValue = await page.locator('.reagent-row .reagent-role').first().inputValue();
    expect(roleValue).toBe('catalyst');
  });
});