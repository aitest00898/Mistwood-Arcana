# Hero 16-direction integration

Mistwood Arcana keeps movement fully analogue but presents each hero through 16
camera-compatible chibi views derived from the supplied reference board.

## Direction math

`direction16FromVector(x, y, previous)` uses screen coordinates and computes:

```text
sector = 2π / 16
index = round(atan2(x, y) / sector) mod 16
```

This makes `d00` screen-down/front, `d04` screen-right, `d08` screen-up/back,
and `d12` screen-left. A vector under the 0.05 dead zone returns `previous`, so
stopping does not snap the hero to a default pose.

## Asset contract

Each hero atlas is a 4×4 PNG containing 16 192×192 transparent tiles. The tile
order is row-major (`d00`–`d03`, then `d04`–`d07`, and so on). The source board
is retained under `art-assets/characters/source/`; the reproducible preparation
script is `scripts/prepare-hero-16.mjs`.

The `ArtAssets` loader preloads all three directional atlases and the existing
master illustrations. A run cannot start until the directional atlases, enemy
atlas, and hero masters are ready. The old three-cell atlas remains only as a
defensive fallback and is not the primary render path.
