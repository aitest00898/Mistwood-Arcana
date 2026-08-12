# Mistwood Arcana Art Direction

## North star

Mistwood Arcana is a premium Japanese high-fantasy anime action roguelite set in a painterly storybook forest. The world uses deep emerald grass, warm worn paths, blue-green mossy stone, and soft upper-left daylight. Heroes are elegant fantasy adventurers with readable silhouettes; enemies are compact ecological creatures with strong black silhouettes and distinct material languages.

## Character rules

- Hero masters use refined anime anatomy, layered costume construction, restrained cel-shading, visible materials, and generous negative space.
- Gameplay heroes are approximately 2.8–3.2 heads tall and must remain readable at 40–60 logical pixels.
- Aether Mage: royal blue / ivory / antique gold, sapphire-cyan aether, circular star-ring staff.
- Holy Spellblade: ivory / sapphire / pale blue / gold, agile partial plate, slender enchanted sword.
- Mistwood Ranger: forest green / charcoal / warm leather / jade, asymmetrical cape, darkwood bow and spirit talisman.

## Enemy rules

- Every species must survive a black-silhouette test at gameplay scale.
- Use silhouette, anatomy, material, and ecological role—not recolor alone—to differentiate species.
- Small enemies occupy less visual area than medium enemies; moss golem, gargoyle, and grove guardian are visibly elite/large.
- Enemy highlights follow soft upper-left light and lower-right grounding shadows.

## Runtime treatment

Master concepts and turnarounds are archive/reference art. Runtime atlases are chroma-key removed PNGs, loaded once by `src/assets.ts`, and sampled by atlas cell. VFX (lightning, bloom, impact sparks, shadows) remains procedural and separate from entity art.

## Prompt anchors

`original Mistwood Arcana`, `premium painterly anime high fantasy`, `crisp dark silhouette`, `soft upper-left woodland daylight`, `refined cel-shading`, `readable chibi gameplay sprite`, `no logo`, `no watermark`, `no copied franchise design`.

## Forbidden patterns

No emojis, generic blobs, flat CSS characters, primitive circles as primary enemy art, recolored duplicates, fan art, copyrighted game/anime assets, missing transparency, or runtime loading of the 1024px+ master illustrations.
