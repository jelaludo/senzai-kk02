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

Move within reach and align the ring and diamond. Both turn green when aligned and in range. Fifteen tendrils converge; hold alignment for three seconds to capture the concept. Brief aim slips pause progress; longer slips or leaving reach reset the capture. The overfitting boundary adds orange-to-red interference and pushes you inward.

The Pilot is designed for a desktop keyboard and mouse. It uses WebGL and loads Three.js 0.180.0 from jsDelivr.

## Run locally

From this repository:

```sh
python3 -m http.server 8792 --bind 127.0.0.1
```

Open:

http://127.0.0.1:8792/

No build step is needed. GitHub Pages serves the `main` branch from the repository root.

## Gameplay checks

With Node.js 22.15 or newer and a local copy of Three.js 0.180.0:

```sh
node tools/test-pilot.mjs /path/to/three/build/three.module.js
```

If Three.js is installed locally, the path argument can be omitted. The checks cover inertia, braking, sweep expiry, boundary recovery, all seven captures, the fifteen-tip focus pose, aim slips, reacquisition, and narrow viewports. Holding W without aiming must not capture a concept.

## Assets and attribution

Original Senzai models, animation, code and concepts by **Jelaludo**. Preserve attribution when reusing them. This repository does not add a new open-source license.

`assets/senzai-kk02/README.md` and `manifest.json` preserve the asset's original runtime and provenance notes. References there to the larger Model Workshop repository, archived revisions and asset-pipeline reports describe the source project; those archives and reports are not part of this standalone release.
