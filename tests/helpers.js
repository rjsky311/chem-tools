/**
 * Dr. Chem Test Helpers
 * 共用測試工具函數和選擇器常數
 */

// v5.0 選擇器常數
const SELECTORS = {
  // 按鈕
  addReagentBtn: '#add-reagent-btn',
  clearAllBtn: '#clearAllBtn',
  saveBtn: '#saveBtn',
  loadBtn: '#loadBtn',
  exportBtn: '#exportBtn',

  // SM 卡片
  smCard: '#starting-material-card',
  smMw: '#starting-material-card .sm-mw',
  smMass: '#starting-material-card .sm-mass',
  smMmol: '#sm-mmol',
  smCas: '#sm-cas',
  smSmiles: '#sm-smiles',
  smFetchBtn: '#sm-fetch-btn',
  smCanvas: '#sm-canvas',

  // 試劑卡片
  reagentCard: '.reagent-card',
  reagentType: '.reagent-type',
  reagentMw: '.reagent-mw',
  reagentEq: '.reagent-eq',
  reagentMass: '.reagent-mass',
  reagentVolume: '.reagent-volume',
  reagentMmol: '.reagent-mmol',
  reagentDensity: '.reagent-density',
  reagentMolarity: '.reagent-molarity',
  reagentPurity: '.reagent-purity',
  reagentCas: '.reagent-cas',
  reagentSmiles: '.reagent-smiles',
  reagentRole: '.reagent-role',
  btnFetch: '.btn-fetch',
  reagentCanvas: '.compound-canvas',

  // 產品卡片
  productMw: '#product-mw',
  productActual: '#product-actual',
  productTheoretical: '#product-theoretical',
  productCas: '#product-cas',
  productSmiles: '#product-smiles',
  productFetchBtn: '#product-fetch-btn',
  yieldDisplay: '#yield-display',
  yieldPercentage: '#yield-percentage',

  // 溶劑/條件
  solventName: '#solvent-name',
  solventCas: '#solvent-cas',
  solventBp: '#solvent-bp',
  solventConc: '#solvent-conc',
  solventVolume: '#solvent-volume',
  solventFetchBtn: '#solvent-fetch-btn',
  temperature: '#temperature',
  time: '#time',

  // Procedure
  newStepInput: '#new-step-input',
  addStepBtn: '#add-step-btn',
  procedureProgress: '#procedure-progress',
  procedureItem: '.procedure-item',
  stepText: '.step-text',
  stepCheckbox: '.step-checkbox',

  // 容器
  reactionSchemeSection: '#reaction-scheme-section',
  schemeContainer: '.scheme-container',
};

/**
 * Mock PubChem API 回應
 * @param {import('@playwright/test').Page} page
 * @param {Object} responseData - 回應資料
 */
async function mockPubChemAPI(page, responseData) {
  await page.route('**/pubchem.ncbi.nlm.nih.gov/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseData)
    });
  });
}

/**
 * Mock PubChem API 回應 (完整化學物質資料)
 * @param {import('@playwright/test').Page} page
 * @param {Object} options - { cid, mw, name, smiles }
 */
async function mockPubChemCompound(page, { cid = 887, mw = 32.04, name = 'methanol', smiles = 'CO' } = {}) {
  await mockPubChemAPI(page, {
    PropertyTable: {
      Properties: [{
        CID: cid,
        MolecularWeight: mw,
        IUPACName: name,
        CanonicalSMILES: smiles,
        IsomericSMILES: smiles
      }]
    }
  });
}

/**
 * Mock PubChem API 錯誤回應
 * @param {import('@playwright/test').Page} page
 */
async function mockPubChemError(page) {
  await page.route('**/pubchem.ncbi.nlm.nih.gov/**', route => {
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ Fault: { Code: 'PUGREST.NotFound', Message: 'No CID found' } })
    });
  });
}

/**
 * Mock PubChem API 回應 (包含物理性質：熔點、密度)
 * 用於測試自動偵測物質狀態功能
 * @param {import('@playwright/test').Page} page
 * @param {Object} options - { cid, mw, name, smiles, meltingPoint, density }
 */
async function mockPubChemWithPhysicalProps(page, {
  cid = 887,
  mw = 32.04,
  name = 'methanol',
  smiles = 'CO',
  meltingPoint = null,
  density = null
} = {}) {
  await page.route('**/pubchem.ncbi.nlm.nih.gov/**', (route, request) => {
    const url = request.url();

    // 1. CID 查詢
    if (url.includes('/cids/JSON')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          IdentifierList: { CID: [cid] }
        })
      });
      return;
    }

    // 2. 基本屬性查詢 (MW, SMILES, Name)
    if (url.includes('/property/')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          PropertyTable: {
            Properties: [{
              CID: cid,
              MolecularWeight: mw,
              IUPACName: name,
              CanonicalSMILES: smiles,
              IsomericSMILES: smiles
            }]
          }
        })
      });
      return;
    }

    // 3. 熔點查詢 (PUG-View)
    if (url.includes('heading=Melting')) {
      if (meltingPoint !== null) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            Record: {
              Section: [{
                TOCHeading: 'Melting Point',
                Section: [{
                  TOCHeading: 'Melting Point',
                  Section: [{
                    Information: [{
                      Value: { StringWithMarkup: [{ String: meltingPoint }] }
                    }]
                  }]
                }]
              }]
            }
          })
        });
      } else {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ Fault: { Code: 'PUGVIEW.NotFound' } })
        });
      }
      return;
    }

    // 4. 密度查詢 (PUG-View)
    if (url.includes('heading=Density')) {
      if (density !== null) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            Record: {
              Section: [{
                TOCHeading: 'Density',
                Section: [{
                  TOCHeading: 'Density',
                  Section: [{
                    Information: [{
                      Value: { StringWithMarkup: [{ String: `${density} g/mL` }] }
                    }]
                  }]
                }]
              }]
            }
          })
        });
      } else {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ Fault: { Code: 'PUGVIEW.NotFound' } })
        });
      }
      return;
    }

    // 預設：繼續原本的請求
    route.continue();
  });
}

/**
 * 清空環境並重載頁面
 * @param {import('@playwright/test').Page} page
 */
async function setupCleanState(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(SELECTORS.reactionSchemeSection);
}

/**
 * 設定 Starting Material 基準值
 * @param {import('@playwright/test').Page} page
 * @param {Object} options - { mw, mass }
 */
async function setupStartingMaterial(page, { mw = '100', mass = '100' } = {}) {
  const smCard = page.locator(SELECTORS.smCard);
  await smCard.locator('.sm-mw').fill(mw);
  await smCard.locator('.sm-mass').fill(mass);
  await page.waitForTimeout(100); // 等待計算完成
}

/**
 * 新增試劑卡片並填入資料
 * @param {import('@playwright/test').Page} page
 * @param {Object} options - { type, mw, eq, purity, density, molarity }
 */
async function addReagent(page, options = {}) {
  await page.click(SELECTORS.addReagentBtn);
  const reagentCard = page.locator(SELECTORS.reagentCard).last();

  if (options.type) {
    await reagentCard.locator(SELECTORS.reagentType).selectOption(options.type);
  }
  if (options.mw) {
    await reagentCard.locator(SELECTORS.reagentMw).fill(options.mw);
  }
  if (options.eq) {
    await reagentCard.locator(SELECTORS.reagentEq).fill(options.eq);
  }
  if (options.purity) {
    await reagentCard.locator(SELECTORS.reagentPurity).fill(options.purity);
  }
  if (options.density) {
    await reagentCard.locator(SELECTORS.reagentDensity).fill(options.density);
  }
  if (options.molarity) {
    await reagentCard.locator(SELECTORS.reagentMolarity).fill(options.molarity);
  }
  if (options.role) {
    await reagentCard.locator(SELECTORS.reagentRole).selectOption(options.role);
  }

  await page.waitForTimeout(100); // 等待計算完成
  return reagentCard;
}

module.exports = {
  SELECTORS,
  mockPubChemAPI,
  mockPubChemCompound,
  mockPubChemError,
  mockPubChemWithPhysicalProps,
  setupCleanState,
  setupStartingMaterial,
  addReagent
};
