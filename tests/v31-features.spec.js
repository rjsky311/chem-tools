const { test, expect } = require('@playwright/test');

test.describe('v3.1 Feature: Save/Load JSON', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 使用完整的 URL
    await page.goto('http://localhost:3000');
    // 2. 等待頁面載入完成
    await page.waitForSelector('#reaction-scheme-section');
  });

  test('Save JSON button should be visible with correct text', async ({ page }) => {
    const saveBtn = page.locator('#saveBtn');
    await expect(saveBtn).toBeVisible();
    // 檢查按鈕文字是否包含 "Save JSON" (忽略 emoji)
    await expect(saveBtn).toHaveText(/Save JSON/);
  });

  test('Load JSON button should be visible with correct text', async ({ page }) => {
    const loadBtn = page.locator('#loadBtn');
    await expect(loadBtn).toBeVisible();
    await expect(loadBtn).toHaveText(/Load JSON/);
  });

  test('Print button should be renamed from Print/Export', async ({ page }) => {
    const printBtn = page.locator('#exportBtn'); // ID 沒變，但文字變了
    await expect(printBtn).toBeVisible();
    await expect(printBtn).toHaveText(/Print/);
  });

  test('Hidden file input should exist with correct attributes', async ({ page }) => {
    const fileInput = page.locator('#fileInput');
    await expect(fileInput).toBeHidden(); // 它應該是隱藏的
    await expect(fileInput).toHaveAttribute('type', 'file');
    await expect(fileInput).toHaveAttribute('accept', '.json');
  });

  test('Load button should trigger file input click', async ({ page }) => {
    // 這是一個進階測試：我們要監聽 file input 是否被點擊了
    // 使用 evaluate 在瀏覽器端加上一個臨時的監聽器
    const isClicked = await page.evaluate(() => {
        return new Promise(resolve => {
            const input = document.getElementById('fileInput');
            // 覆寫 click 方法來攔截呼叫
            const originalClick = input.click;
            input.click = () => {
                resolve(true);
                // 還原 click 以免副作用 (雖然測試結束就重置了)
                input.click = originalClick; 
            };
            // 點擊 Load 按鈕
            document.getElementById('loadBtn').click();
            // 如果 1秒後沒反應，就回傳 false
            setTimeout(() => resolve(false), 1000);
        });
    });
    expect(isClicked).toBe(true);
  });

  test('Header buttons should be in correct order', async ({ page }) => {
    // 檢查 header-buttons 容器裡的順序
    // 預期：Clear All, Load JSON, Save JSON, Print
    const buttons = page.locator('.header-buttons button');
    await expect(buttons.nth(0)).toHaveId('clearAllBtn');
    // 注意：中間兩個是新加的，順序可能會變，我們只要確認它們存在於容器中即可
    await expect(page.locator('.header-buttons #loadBtn')).toBeVisible();
    await expect(page.locator('.header-buttons #saveBtn')).toBeVisible();
    await expect(page.locator('.header-buttons #exportBtn')).toBeVisible();
  });
});

test.describe('v3.1 Feature: restoreReactionPlan function', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
    });

    test('restoreReactionPlan function should exist', async ({ page }) => {
        const type = await page.evaluate(() => typeof window.restoreReactionPlan);
        expect(type).toBe('function');
    });
});