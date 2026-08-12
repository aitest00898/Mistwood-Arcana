# Mistwood Arcana · Combat expansion

## Attack architecture

`src/attacks.ts` 是資料定義與 runtime handler 的集中入口。`AttackDefinition` 保存名稱、分類、圖示、稀有度與 rank 描述；`AttackSystem` 管理世界中的攻擊物件、冷卻、碰撞、傷害、VFX 與清理。主迴圈只透過 callbacks 回報傷害、爆發與音效，不在 `main.ts` 維護 15 種 attack switch。

現有的閃電球是第一個固定起始攻擊，另外 15 個可在升級卡中解鎖：

1. 月蝕刃環：面向半月斬。
2. 星界長槍：高速直線穿透槍。
3. 聖棘守護：減傷護盾與受擊反擊。
4. 重力霧井：拉扯並持續傷害的力場。
5. 星羽魔鴉：自主追擊的飛行魔鴉。
6. 王冠飛刃：不同於雷球的古金符刃環繞。
7. 荊棘投槍：慢速拋物線落地爆發。
8. 星痕彈珠：會在敵人之間實體飛行並彈跳。
9. 稜鏡折光：多稜鏡節點折射光束。
10. 風蝕輪舞：獨立移動的旋轉風刃。
11. 天穹星落：地面警示後延遲落星。
12. 幽霧殘像：位於另一位置、模仿主攻擊的殘像。
13. 雙生魔鏡：與玩家對稱並同步鏡像投射物。
14. 霧林符雷：沿最近行進路徑留下的觸發地雷。
15. 迴月飛輪：沿曲線飛出並回程的月輪。

每一種 attack 都有自己的移動／持續／碰撞模型、繪製分支與 `AudioEngine.playAttack()` 音色。攻擊 rank 至少會提升傷害以外的一項行為（數量、範圍、穿透、彈跳、反射、持續時間或 cooldown）。

## Run inventory and upgrade pool

`Stats.ownedAttacks` 與 `Stats.attackRanks` 是每次 run 的獨立狀態。最多同時裝備 8 個 attack，包含起始閃電球；run reset 時整組清空並重新加入 lightning。升級池分成三類：

- `attack-unlock`：只在未擁有且空間少於 8 格時出現。
- `attack-upgrade`：只對已擁有攻擊出現。
- `passive`：暴擊、法術傷害、持續時間等既有被動。

當 8 格已滿，`rollUpgradeCards()` 不會再加入任何新攻擊候選，只會抽取已擁有攻擊升級與被動。候選先嘗試涵蓋不同類別，再以 id 去重補足三張卡，避免重複三次同一個選項。

## Viewport-safe overlays

`GameUI.getVisibleRect()` 回傳實際可見的 `left/right/top/bottom/width/height`。選角與升級畫面都先由 layout 函式計算 geometry，再由同一份 geometry 驅動繪製與 hit-test；因此 PWA 在手機上因 cover scale 產生上下或左右裁切時，不會再把卡片或 CTA 畫到 nominal 512×728 之外。

`?debug=1` 提供不顯眼的測試鍵：`L` 強制升級、`U` 直接填入 8 格攻擊、`I` 以高 rank 填入壓力配置。這些功能不改變正常 run 的選擇流程。

## Audio safety

音訊路徑是 voice → per-effect envelope → SFX/music bus → dynamics compressor → master limiter → destination。SFX 有全域與分類 voice budget、短窗 coalescing 與最小 cooldown；整條 chain lightning 不會為每一段線段播放一個完整高音量 discharge。所有 procedural oscillator/noise 都以短 attack/release ramp 進出，避免 gain discontinuity。音樂為本地 WebAudio 生成的 69 秒多段落 modal fantasy score，menu、gameplay、combat 以 bus gain 平滑切換。

## Validation

建置驗證：

```bash
npm run typecheck
npm run build
npm run check
```

視覺驗證會使用 320×568、375×667、390×844 與 430×932 等 portrait viewport，另以 debug 壓力配置檢查 8 格 attack HUD、升級卡、密集 VFX 與音訊事件是否仍有界。
