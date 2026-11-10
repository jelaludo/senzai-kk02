# Senzai-KK02

A living fiber field in latent space, by **Jelaludo**. Fly with momentum, reveal drifting concepts with a sweep, and align two reticles to capture them while they resist.

Play:

https://jelaludo.github.io/senzai-kk02/

The Pilot lives at `senzai-kk02-pilot/`. The companion Observatory, at `senzai-kk02/`, presents the authored living-attention cycle with timeline, detail and camera controls.

## Pilot controls

| Input | Action |
| --- | --- |
| F | Sweep; briefly reveal concepts and their names |
| Z | Select or release a concept |
| Mouse | Align your pale aiming ring with the amber target diamond |
| W / S | Approach the selected concept / retreat |
| A / D | Strafe around the selected concept |
| Space / C | Ascend / descend (Ctrl+Space also descends) |
| Shift / Alt | Surge / fine movement |
| X | Brake |
| Q / E, arrow keys | Look, or adjust aim while a concept is selected |
| Tab / Shift+Tab | Next / previous uncaptured concept |
| 1–7 | Select a specific concept |
| R | Recenter view and aiming ring |
| Mouse wheel | Camera distance |
| H | Toggle the controls legend |

Selected thoughts gently draw the sphere closer and carry it with their movement, settling around 44 metres away. Thrust speeds up the approach; retreat or brake overrides the pull. The pull ends on release or capture. Tendrils reach 68 metres, with 78 metres of slack once focus starts. Align the ring and diamond. Both turn green when aligned and in range. Fifteen tendrils converge; hold alignment for three seconds to capture the concept. Brief aim slips (up to 0.35 seconds) pause progress; longer slips or leaving reach reset the capture. Thoughts begin resisting once examination starts. The overfitting boundary adds orange-to-red interference and pushes you inward.

## Mobile and installation

The Pilot adapts to phones and tablets in portrait or landscape. Use the left thumbstick to thrust and strafe; drag the open field with another finger to look or align the reticle. Sweep, Lock and Next are on the right, alongside held ascent, brake and descent controls. The HUD fades after a few seconds; tap the field or a control to reveal it. The three-dot menu pauses flight and provides zoom, recenter and installation controls.

Choose **Install app** from the flight menu or your browser's **Add to Home Screen** command. On iPhone, open the site in Safari and use Share → Add to Home Screen, enabling Open as Web App when offered. Launch from the new icon for a browser-free view. The app requests fullscreen, with standalone mode as a platform fallback; ordinary browser tabs can enter fullscreen only where the browser supports it.

The first online visit downloads the game for offline use. Wait for **Ready for offline flight** in the flight menu before disconnecting. Game code, Three.js, and the default model are cached together. New releases wait behind **Update ready · restart**, so they do not interrupt a capture. Extra Observatory model detail levels are cached after use.

Mobile rendering uses fewer fiber segments, a capped pixel ratio and a 30 FPS target. Flight pauses when the app is backgrounded, and interrupted touches release their controls. WebGL is required. Add `?touch=1` to the Pilot URL to preview touch controls on a desktop.

## Run locally

From this repository:

```sh
python3 -m http.server 8792 --bind 127.0.0.1
```

Open:

http://127.0.0.1:8792/

No build step is needed to run. After changing application files, regenerate the versioned offline shell before publishing:

```sh
node tools/build-sw.mjs
```

GitHub Pages serves the `main` branch from the repository root. PWA installation and offline caching require HTTPS or localhost.

## Gameplay checks

With Node.js 22.15 or newer:

```sh
node tools/test-pilot.mjs
node tools/test-mobile.mjs
node tools/test-pwa.mjs
node tools/build-sw.mjs --check
```

The checks cover inertia, braking, sweep expiry, boundary recovery, all seven captures, the fifteen-tip focus pose, aim slips, reacquisition, narrow viewports, natural pursuit without held thrust, long-range captures, brake/retreat overrides, analog touch pursuit, simultaneous pointers, cancellation and pause. Holding forward without aiming must not capture a concept. PWA checks exercise installation, offline requests, scoped cache cleanup and explicit update activation. The gameplay test uses the bundled Three.js; an alternate module path can be supplied as its first argument.

## Assets and attribution

Original Senzai models, animation, code and concepts by **Jelaludo**. Preserve attribution when reusing them. This repository does not add a new open-source license.

The required Three.js 0.180.0 modules are bundled in `vendor/three/` for offline loading, under their original MIT license in `vendor/three/LICENSE`. No CDN is needed at runtime.

`assets/senzai-kk02/README.md` and `manifest.json` preserve the asset's original runtime and provenance notes. References there to the larger Model Workshop repository, archived revisions and asset-pipeline reports describe the source project; those archives and reports are not part of this standalone release.
