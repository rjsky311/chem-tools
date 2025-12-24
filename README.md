# 🧪 Dr. Chem - Digital Reaction Planner> **A lightweight, offline-first, and smart electronic lab notebook (ELN) designed for organic chemists.**> 專為有機化學家打造的輕量級、離線優先、具備化學智慧的數位反應規劃工具。



![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)

![License](https://img.shields.io/badge/license-MIT-green.svg)

![Status](https://img.shields.io/badge/status-stable-success.svg)## 📖 簡介 (Introduction)**Dr. Chem** 是一個開源的網頁應用程式，旨在解決傳統 Excel 表格或昂貴 ELN 軟體（如 Benchling, ChemDraw）的痛點。它**無需安裝**、**啟動極快**，並且具備**化學邏輯**，能夠自動處理繁瑣的化學計量計算，讓化學家專注於實驗本身。## 🚀 核心功能 (Key Features)### 🧠 v3.0 Chemical Intelligence (化學智慧升級)* **🏆 限量試劑自動判斷 (Smart Limiting Reagent Logic)**：    * 不再需要手動標記！系統會根據莫耳數 (mmol) 與化學計量係數，自動判斷誰是限量試劑。    * 支援 **Role Selector**：精確區分 Reactant (反應物)、Reagent (試劑) 與 Catalyst (催化劑)。* **🚥 產率紅綠燈 (Traffic Light Yield System)**：    * 自動計算理論產量 (Theoretical Yield)。    * 輸入實際質量後，即時計算產率 (%) 並以顏色視覺化：        * 🟢 **Green (>80%)**: Excellent        * 🟡 **Yellow (50-80%)**: Good        * 🔴 **Red (<50%)**: Low yield* **⚠️ GHS 安全資訊整合 (Safety Integration)**：    * 串接 PubChem API，自動抓取 GHS 危害圖示 (如 🔥, ☠️, 🧪)。    * 在試劑卡片上即時顯示安全警示，提升實驗室工安意識。### ⚡ 基礎功能 (Core Features)* **Card-based UI**：現代化的卡片式介面，支援橫向捲動，操作直覺流暢。* **自動化學計量 (Auto-Stoichiometry)**：    * 支援純固體 (Mass/MW)。    * 支援純液體 (Volume/Density)。    * 支援溶液 (Molarity 或 Wt%)。* **結構視覺化 (Visualization)**：輸入 SMILES 自動繪製化學結構 (Powered by SmilesDrawer)。* **API 整合**：輸入 CAS Number 自動從 PubChem 抓取分子量 (MW)、名稱與結構。* **列印優化 (Print Ready)**：專為 A4 橫向列印設計的樣式，可直接輸出為專業實驗報告 PDF。* **資料持久化 (Auto-Save)**：所有數據自動儲存於瀏覽器 (LocalStorage)，重新整理不丟失。## 🛠️ 技術棧 (Tech Stack)* **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Variables & Flexbox/Grid)* **Testing**: Playwright (End-to-End Testing)* **External Libraries**:     * [SmilesDrawer](https://github.com/reymond-group/smilesDrawer) (Chemical Structure Parsing)* **Architecture**: No-build step, browser-native modules.## 🏁 快速開始 (Getting Started)



由於 Dr. Chem 是純靜態網頁應用，你只需要一個靜態伺服器即可運行。### 前置需求* Node.js (建議 v14+)### 安裝與執行1. **Clone 專案**

   ```bash

   git clone [https://github.com/your-username/chem-tools.git](https://github.com/your-username/chem-tools.git)

   cd chem-tools

啟動開發伺服器

Bash



npx serve .

開啟瀏覽器

前往 http://localhost:3000 即可開始使用。

執行測試 (Testing)

本專案擁有完整的自動化測試覆蓋 (Test Driven Development)。

Bash



# 執行所有測試

npx playwright test --reporter=list

🗺️ 發展藍圖 (Roadmap)

[x] v1.0: 基礎計量計算機 (Table UI)

[x] v2.0: UI 重構 (Card Layout) 與列印優化

[x] v2.1: 溶劑計算機與 CAS 查詢

[x] v3.0: 化學智慧 (限量試劑、產率、GHS 安全)

[ ] v3.1: 檔案系統 (Save/Load JSON 實驗檔案)

[ ] v3.2: 實驗步驟清單 (Procedure Checklist)

[ ] v4.0: UI/UX 美化與深色模式優化

🤝 貢獻 (Contributing)

歡迎提交 Pull Request 或 Issue！我們特別歡迎針對「實驗室真實場景」的功能建議。

📄 License

MIT License



***



### 📝 更新重點摘要



1.  **強調 v3.0 新功能**：我把限量試劑、產率紅綠燈、GHS 安全整合放在最顯眼的 **Features** 區塊。

2.  **徽章 (Badges)**：加入了 Version 3.0.0 和 Status Stable 的徽章，看起來更專業。

3.  **Role Selector**：特別提到這點，展現我們對化學邏輯的嚴謹度。

4.  **Roadmap (藍圖)**：更新了進度，把 v3.0 打勾 `[x]`，並列出了我們下一步要做的 **v3.1 (Save/Load)**，這能讓使用者（和未來的開發者）知道專案的方向。

