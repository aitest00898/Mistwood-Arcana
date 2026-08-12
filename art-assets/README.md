# Mistwood Arcana · Art Assets

這個資料夾收納《霧林秘典 · Mistwood Arcana》目前使用的原創美術素材。

## Art direction reset

- `ART-DIRECTION.md`：英雄比例、材質、光源、敵人剪影與生成提示錨點。
- `ASSET-MANIFEST.json`：英雄、15 種敵人、master art、turnaround 與 runtime atlas 的機器可讀清單。
- `characters/*/concept/`：三位英雄的高解析原創 master art。
- `characters/hero-turnaround-sheet.png`：三英雄一致的 chibi 前／側／背 canonical sheet。
- `characters/hero-gameplay-atlas.png`：三英雄透明 gameplay atlas。
- `enemies/lineup/`：15 種敵人概念陣列；`enemies/turnaround/`：15 種敵人的分批 turnarounds。
- `enemies/gameplay/enemy-atlas.png`：15 種透明 gameplay sprite atlas（4×4，最後一格保留）。

Runtime asset loader 位於 `src/assets.ts`。它只在載入時建立 `Image`，遊戲迴圈從 atlas 取樣；高解析 master 不會被每幀載入。若重新生成，必須維持 manifest 中的英雄順序、敵人 atlas 順序、透明去背驗證與 silhouette 規則。

## Raster / vector assets

- `bitmaps/forest-atmosphere.png`：森林地表與光影氛圍背景。
- `icons/icon.svg`：PWA 圖示向量原稿。
- `icons/icon-192.svg`、`icons/icon-512.svg`：向量安裝圖示版本。
- `icons/icon-192.png`、`icons/icon-512.png`：iOS / Android 安裝圖示。

## Procedural art source

遊戲中的 VFX 與環境仍有 Canvas 即時繪製；角色與敵人的 primary art 已改由上述原創 runtime atlas 載入。舊程式仍保留作為 fallback/reference：

- `procedural-source/entities.ts`：白色幽靈角色、五種魔物、電球、拾取物、粒子、技能 glyph。
- `procedural-source/world.ts`：草地、泥土路徑、花朵、莓果、松樹、苔蘚岩石。
- `procedural-source/ui.ts`：升級卡、稀有度邊框、技能節點、鎖頭、狀態列、音效按鈕。
- `procedural-source/utils.ts`：發光、漸層、柔影、多邊形與圓角繪製工具。
- `procedural-source/config.ts`：畫面尺寸與全域色盤。
- `procedural-source/upgrades.ts`：技能名稱、圖示 ID 與升級文字。

所有內容都是本專案原創替代素材；沒有下載或複製參考遊戲的專有檔案。
