# chem-tools v1.4

數位化學反應規劃工具 - 幫助化學家規劃反應、計算化學計量、視覺化分子結構

## v1.4 更新重點

- ✨ 新增產物 (Product) CAS 查詢與自動繪圖功能
- 🧪 實作試劑列表的結構視覺化預覽
- 🔄 新增「一鍵重置 (Clear All)」功能與安全確認機制
- ✅ 通過 60 個 Playwright 自動化測試

## 功能特色

### 分子結構視覺化
- 支援 SMILES 格式輸入
- Canvas 即時繪製分子結構
- 自動偵測手性中心並顯示警告
- 無效 SMILES 錯誤提示

### PubChem 整合
- 透過 CAS 號碼自動查詢化合物資料
- 自動取得 SMILES 與分子量

### 化學計量計算
支援多種試劑類型的雙向計算：
- **純固體**：質量、純度計算
- **純液體**：體積、密度計算
- **莫耳濃度溶液**：體積、濃度計算
- **重量百分比溶液**：體積、密度、wt% 計算

計算可從當量推算質量/體積，或反向從質量/體積推算當量。

### 反應條件設定
- 溶劑選擇與體積計算
- 目標濃度設定
- 溫度、時間記錄
- 備註欄位

### 資料管理
- LocalStorage 自動儲存
- 頁面重新載入後自動恢復資料
- 內建阿斯匹靈水解反應範例

### 列印匯出
- 列印優化的 CSS 樣式
- 可產生 PDF 文件

## 快速開始

1. 直接在瀏覽器中開啟 `index.html`
2. 不需要安裝任何後端或伺服器

```bash
# 如果需要本地伺服器
npx serve .
```

## 使用說明

### 1. 設定起始物
- 輸入 CAS 號碼並點擊「Fetch」自動取得資料
- 或直接輸入 SMILES 與分子量
- 輸入使用質量，系統自動計算 mmol

### 2. 新增試劑
- 點擊「Add Reagent」新增試劑
- 選擇試劑類型（固體/液體/溶液）
- 輸入當量或質量/體積，系統雙向計算

### 3. 設定反應條件
- 選擇溶劑、設定目標濃度
- 系統自動計算所需溶劑體積
- 記錄溫度、時間與備註

### 4. 儲存與列印
- 資料自動儲存於瀏覽器
- 點擊「Print」產生列印版本

## 技術架構

| 項目 | 技術 |
|------|------|
| 前端框架 | HTML5 + Vanilla JavaScript + CSS3 |
| 分子繪製 | [SMILES Drawer](https://github.com/reymond-group/smilesDrawer) v1.2.0 |
| 化合物資料 | [PubChem REST API](https://pubchem.ncbi.nlm.nih.gov/) |
| 資料儲存 | LocalStorage API |
| E2E 測試 | [Playwright](https://playwright.dev/) |

## 專案結構

```
chem-tools/
├── index.html            # 主應用程式（單頁應用）
├── structure-test.html   # SMILES 視覺化測試工具
├── package.json          # 專案設定與依賴
├── playwright.config.js  # 測試設定
└── tests/                # E2E 測試套件
    ├── dr-chem.spec.js                    # 核心功能測試
    ├── persona-intern.spec.js             # 新手使用者錯誤處理
    ├── persona-expert.spec.js             # 進階使用情境
    ├── feature-memory.spec.js             # 資料持久化測試
    ├── structure-visualization.spec.js   # 分子繪製測試
    └── v14-features.spec.js              # v1.4 新功能測試
```

## 測試

### 安裝測試依賴
```bash
npm install
```

### 執行測試
```bash
npx playwright test
```

### 測試涵蓋範圍
- 起始物計算
- 各類型試劑計算
- 溶劑濃度計算
- 資料自動儲存與恢復
- CAS 號碼查詢
- SMILES 繪製
- 手性中心警告
- 極端數值處理
- 錯誤輸入處理

## 授權

ISC License
