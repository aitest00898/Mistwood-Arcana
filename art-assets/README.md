# Mistwood Arcana · Art Assets

這個資料夾收納《霧林秘典 · Mistwood Arcana》目前使用的原創美術素材。

## Raster / vector assets

- `bitmaps/forest-atmosphere.png`：森林地表與光影氛圍背景。
- `icons/icon.svg`：PWA 圖示向量原稿。
- `icons/icon-192.svg`、`icons/icon-512.svg`：向量安裝圖示版本。
- `icons/icon-192.png`、`icons/icon-512.png`：iOS / Android 安裝圖示。

## Procedural art source

遊戲中的主要美術不是外部 sprite，而是由 Canvas 即時繪製；以下是可重用的原始繪製程式：

- `procedural-source/entities.ts`：白色幽靈角色、五種魔物、電球、拾取物、粒子、技能 glyph。
- `procedural-source/world.ts`：草地、泥土路徑、花朵、莓果、松樹、苔蘚岩石。
- `procedural-source/ui.ts`：升級卡、稀有度邊框、技能節點、鎖頭、狀態列、音效按鈕。
- `procedural-source/utils.ts`：發光、漸層、柔影、多邊形與圓角繪製工具。
- `procedural-source/config.ts`：畫面尺寸與全域色盤。
- `procedural-source/upgrades.ts`：技能名稱、圖示 ID 與升級文字。

所有內容都是本專案原創替代素材；沒有下載或複製參考遊戲的專有檔案。
