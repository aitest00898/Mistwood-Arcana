# HD camera, hero art, attack art and audio pass

## Camera and world

Gameplay keeps a 512×728 HUD surface but renders the world through the actual
visible logical rectangle at `WORLD_VIEW_ZOOM = 0.74`. The camera therefore
shows a wider and taller world slice while movement and touch hit testing keep
their existing coordinates. The world is `3072×3840`; detail density was raised
along with the world bounds so travel does not expose an empty edge.

## Hero directional art

The three heroes use separate 1254px source boards under
`art-assets/characters/source/`. `scripts/prepare-hd-art.mjs` removes connected
green-screen pixels, removes enclosed strong-chroma holes, derives 16 cells and
exports 768×768 transparent WebP atlases. Runtime order remains `d00` through
`d15`, row-major in a 4×4 atlas, and `direction16FromVector()` still quantizes
only the displayed facing; movement remains continuous analog movement.

## Attack art

The attack source board is a 4×4 set of 16 distinct painterly emblems. The
atlas is used for the lightning orb, projectiles, orbital blades, familiar,
clone and rune mine. Existing procedural fields, trails, warning sigils and
impact particles remain layered around those sprites so each attack retains
its gameplay readability and a non-asset fallback.

## Audio safety and music

SFX flows through per-voice envelopes, a bounded global voice budget, SFX
dynamics, a master soft-clip safety stage and a final limiter. Chain lightning
events are coalesced in a 28ms window, hit feedback in 32ms, and death feedback
in 60ms; dense combat no longer creates one full-volume sound per segment or
enemy. Music is an original, local WebAudio arrangement: modal harmonic pads,
low drone/bass, plucked ostinato, sustained upper voice and restrained
percussion evolve through a 69-second six-phase form, with smooth menu/gameplay
intensity changes.
