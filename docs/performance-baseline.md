# Mistwood Arcana performance baseline

測試日期：2026-08-12

## Method

- Production bundle generated with `npm run check`.
- Vite preview, 390 × 844 portrait viewport.
- Three runs per mode; each run measured 150 animation frames after a 900ms asset warm-up.
- Fixed stress scene: 78 live enemies, 5 orbs, 7-link chains, 35 maximum simultaneous lightning segments, particles, and floating damage numbers.
- Baseline URL: `?debug=1&perf=stress&legacyWorld=1&legacyLightning=1&legacySeparation=1`
- Optimized URL: `?debug=1&perf=stress`
- Values below are medians across the three runs. Times are JavaScript callback/render costs, not a claim about the browser's presentation refresh rate.

## Results

| Metric | Baseline | Optimized | Change |
| --- | ---: | ---: | ---: |
| Average full frame | 1.0073 ms | 0.7175 ms | 28.8% faster |
| Render section | 0.8380 ms | 0.5250 ms | 37.4% faster |
| World rendering | 0.4353 ms | 0.1150 ms | 73.6% faster |
| Update section | 0.1740 ms | 0.1787 ms | within measurement variance |
| P95 full frame | 1.6 ms | 1.2 ms | lower |
| P99 full frame | 1.8 ms | 1.6 ms | lower |
| Maximum full frame | 3.3 ms | 2.6 ms | lower |
| Frames above 20 ms | 0 | 0 | unchanged |
| Peak enemies | 78 | 78 | unchanged |
| Peak particles | 193 | 190 | same workload range |
| Peak lightning segments | 35 | 35 | unchanged |
| Peak damage texts | 70 | 70 | unchanged |

## Changes measured

1. Static forest atmosphere, paths, and boundary shading are rendered once to an offscreen canvas and sampled by camera rectangle.
2. Rock draw order, rock polygon points, and tree highlight placement are seeded once instead of being sorted or regenerated during every frame.
3. Grass, flowers, berries, trees, and rocks outside a padded camera rectangle are skipped while preserving all world data and animation for visible details.
4. Orb positions are reused between combat targeting, world rendering, and HUD rendering during the same simulation tick.
5. The main lightning path is reused for the same 22ms flicker tick, matching the previous path seed and animation cadence. Branch lightning continues to rebuild every draw so its original per-frame movement and visual character remain intact.

The `legacyWorld` and `legacyLightning` switches are benchmark-only fallbacks; they are not enabled in normal play.

## 2026-08-12 loading and separation follow-up

The production runtime now loads the three high-resolution selection images first, exposes the character-select screen as soon as that phase completes, and loads the enemy atlas plus the selected hero's directional atlas in the background. The remaining directional atlases do not block entering a run. Runtime PNG art was converted to WebP: the forest atmosphere fell from 2.53 MB to 0.31 MB, the enemy atlas from 1.46 MB to 0.36 MB, and the seven hero atlases from 4.11 MB to 0.73 MB combined.

The separation loop has an explicit `legacySeparation=1` A/B switch and now uses a 96px spatial grid in normal play. The debug performance snapshot reports `separationChecks`, `maxSeparationChecks`, and the three asset load durations so mobile regressions can be measured from the deployed page rather than inferred from source alone.

Isolated local stress samples at 78 enemies (same code path, one browser tab at a time) recorded:

| Metric | Legacy full scan | Spatial grid | Change |
| --- | ---: | ---: | ---: |
| Separation checks | 906,906 | 183,652 | 79.8% fewer |
| Maximum checks/frame | 6,006 | 1,524 | 74.6% fewer |
| Average full frame | 1.052 ms | 1.052 ms | within run variance |
| P95 full frame | 1.7 ms | 1.6 ms | slightly lower |

The scene stayed below 20ms for all sampled frames. Asset timing in that run was approximately 28–34ms for selection art and 14–16ms for gameplay WebP assets after local cache warm-up; the first uncached mobile load is the reason the visible boot stage now reports selection progress separately.
