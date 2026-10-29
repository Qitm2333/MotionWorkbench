# Liquid Glass / Music Player evidence ledger

Research date: 2026-10-29

## Scope

One finished Kube article interaction: album search behind a floating glass music-player panel. This is separate from the Switch and Slider projects.

## Sources inspected

- Live reference: https://kube.io/blog/liquid-glass-css-svg/#playground
- Loaded article bundle: `https://kube.io/assets/blog-sWnMgqJX.js`
- Bundle SHA-256: `01da3b61cab80acce521028a7ff06d04001a218a594e9b187fe17a030e2344a0`
- Player implementation located near UTF-16 offset `90048`; search component near `110647`.
- MIT comparison repository: https://github.com/ObaidQatan/liquid-glass-component-library

## Confirmed from the Kube page

- The default search is `Jimi Hendrix`, and album metadata/artwork are requested from the iTunes Search API.
- The floating player is explicitly a fake player: its UI does not stream audio.
- Initial glass controls follow the source values for specular opacity `0.4`, saturation `6`, refraction `1`, blur `1`, and progressive blur `1`. The showcase lowers the panel background opacity from `0.6` to `0.28` so the refraction remains legible at the Workbench preview scale.
- A layered progressive-blur region sits behind the floating player panel.

## MIT repository comparison

The MIT repository's `LiquidGlassMusicPlayer` is a separate presentation component with local play/like/progress state. It does not implement Kube's iTunes album search or progressive-blur page composition. Its MIT-licensed displacement/specular texture geometry was adapted for the local map generator; the notice is preserved in `LICENSE.md`, while Kube's bundle remains the behavioral evidence.

## Adaptations and limits

- Search results are read from the public iTunes Search API at runtime; availability and CORS policy are external dependencies.
- Transport controls update local UI state only, matching the non-streaming nature of the source. No audio is bundled or played.
- The visual shell is adapted for Workbench, not a copy of Kube branding. Offline requests use locally generated color covers so the refractive panel still has visible material behind it. The SVG `backdrop-filter` effect falls back to frosted blur outside Chromium.
- Safari and Firefox were not available for manual verification in this Windows session. No Kube bundle, artwork, or branded assets are redistributed.
