# Liquid Glass / Switch evidence ledger

Research date: 2026-10-29

## Scope

One finished Kube article interaction: its glass switch. The example does not include the article's four-panel displacement diagnostic playground.

## Sources inspected

- Live reference: https://kube.io/blog/liquid-glass-css-svg/#playground
- Loaded article bundle: `https://kube.io/assets/blog-sWnMgqJX.js`
- Bundle SHA-256: `01da3b61cab80acce521028a7ff06d04001a218a594e9b187fe17a030e2344a0`
- Switch implementation located near UTF-16 offset `178986` in the loaded bundle.
- MIT comparison repository: https://github.com/ObaidQatan/liquid-glass-component-library

## Confirmed from the Kube page

- The thumb supports pointer dragging, toggles on click, and has a Force active state for inspecting the pressed treatment.
- The surface uses a lip profile and a generated SVG displacement/specular filter referenced through `backdrop-filter`.
- Initial controls: specular opacity `0.5`, specular saturation `6`, refraction `1`, and blur `0.2`.
- This SVG URL form of `backdrop-filter` is Chromium-specific; other browsers use the ordinary frosted-glass fallback.

## MIT repository comparison

The repository is a separate React component library. Its README describes the liquid-glass treatment as inspired by Kube, and its Toggle implementation has a distinct component/theme/spring system. The local displacement/specular texture generator began from that repository's MIT-licensed geometry code, then was corrected against the article bundle's profile and refraction math. Its MIT notice is preserved in `LICENSE.md`; it is not treated as evidence for Kube's state model.

## Adaptations and limits

- The code is a readable HTML/JS study with Workbench-owned parameters; the visual shell is not Kube's branded article shell.
- The filter map is regenerated locally. The showcase starts with Force active enabled so the refractive state is visible immediately; Kube's article control defaults it off.
- Safari and Firefox were not available for manual verification in this Windows session.
- No Kube bundle, logo, fonts, or artwork are redistributed.
