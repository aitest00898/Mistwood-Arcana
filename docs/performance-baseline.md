# Mistwood Arcana performance baseline

測試日期：2026-08-12

## Method

- Production bundle generated with `npm run check`.
- Vite preview, 390 × 844 portrait viewport.
- Three runs per mode; each run measured 150 animation frames after a 900ms asset warm-up.
- Fixed stress scene: 78 live enemies, 5 orbs, 7-link chains, 35 maximum simultaneous lightning segments, particles, and floating damage numbers.
- Baseline URL: `?debug=1&perf=stress&legacyWorld=1&legacyLightning=1`
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
