# Senzai-KK02 / Living attention

A separate evolution of **LATENT v1**: the 32 m dark fiber field now breathes, bends and directs emerald tendrils toward three spatial signals. It shifts swiftly between listening positions while large projected four-dimensional frames, folded grids and suspended dust move slowly around it. Two-metre reference posts and camera parallax establish scale. This is a visual interpretation of higher-dimensional space, rendered as a three-dimensional scene.

Open http://localhost:8788/senzai-kk02/

The former LATENT route now opens the upgraded Senzai-KK01 developer edition: http://localhost:8788/senzai-kk01/

## Motion and presentation

`Senzai_Attention_Cycle` is a deterministic, seamless **72-second engine-driven cycle**. Forty-eight tendrils independently probe, hold, curl and withdraw, with **27–46 visibly awake** across sampled poses. Broad S-curves, changing tip direction, shared breeze and a lag along each filament replace the earlier small radial oscillations. The fine glass field breathes and leans with that same breeze, including during dormancy.

Each attention tip changes its distance from the field center by **7.16–38.57 m** across the cycle. A strand can retract below the surrounding fiber canopy, curl, then extend beyond it. Length changes are independent of illumination: dimming is no longer the only sign of withdrawal.

Five broad detection events recruit **21–24 tendrils within 0.7 seconds**. The 27-second Echo event instead recruits exactly fifteen into a precision inspection. Tips acquire their shared target over 0.48 s, with 25–185 ms individual response delays and up to 220 ms more lag along the shaft. The group extends, points its distal tangents toward the target, holds briefly and releases over 3.1 s. The remaining strands keep foraging. Mean locked-tip target alignment is 0.9778 (dot product); these are procedural visual attention signals, not gameplay prey detection.

| Detection | Focus |
| --- | --- |
| 8 s | Signal / first collective acquisition |
| 19 s | Trace |
| 27 s | Echo / fifteen-tip precision inspection |
| 40 s | Signal |
| 47 s | Trace |
| 65 s | Signal / return |

At **27 s**, fifteen stable front-facing tendrils converge around the fixed world-space Echo spot at `[-38,24,20]` m. Their tips form a small irregular ring, measuring at most **2.037 m across**, and point inward toward that same spot. They close over 0.8 s plus individual response delay, remain tightly grouped through 31.1 s, then release over 2.4 s. Small independent tip motions (up to 0.236 m over the measured hold) suggest close examination. Their ends stay at the world-space spot while the body moves toward it at 29–30.6 s. The readout shows **EXAMINING**. Dormancy cancels the inspection; the first focus and other events retain their earlier motion.

The original whole-field travel remains: 10–11.5 s toward Signal, 29–30.6 s toward Echo, 49–50.5 s toward Trace and 67–69 s returning home, with drift between shifts. Sampled peak shift speed remains 26.2301 m/s. Attention can investigate another signal without moving the whole field there. The **Next focus** control jumps 0.6 s before the next detection so its sudden recruitment is visible.

The dimensional chamber uses actual 4D vertex rotations followed by perspective projection into 3D. Three nested tesseracts, gently warped 8 m spatial grids, 650 dust points and eighteen 2 m reference posts provide the companion setting. It is presentation geometry, not a collision room or a new GLB module. The field and curved filaments remain the visual focus.

Drag to orbit, scroll to approach. Pause, timeline, Restart and time scale control the cycle. **Next focus** starts just before the next collective detection. **Fiber macro** follows the field closely and hides the chamber; **Living field** restores the spatial composition. Dormant fades and retracts the emerald attention while retaining drift. Settings provides detail tiers, chamber visibility, optional camera follow, fog and bloom. Cinema/Escape hides/restores overlays. Save image exports a clean PNG. Reduced-motion preference starts paused.

## Plain GLB exports

| File | Role | Triangles | Model draws | Bytes |
| --- | --- | ---: | ---: | ---: |
| `senzai_kk02_d0_lod0.glb` | Detailed master / recordings | 204,576 | 2 | 7,011,300 |
| `senzai_kk02_d0_lod1.glb` | Animated game study | 23,088 | 2 | 791,336 |
| `senzai_kk02_d0_lod2.glb` | Static distance / loading proxy | 2,904 | 1 | 140,648 |

All are self-contained, texture-free, plain GLBs with vertex colors, 151 stable dot-free names, matching axes, plot and socket conventions. LOD1/2 are explicitly derived; detailed source is preserved. The game model fits the 25k articulated-unit triangle reference, but exceeds the 8k triangle / 400 KB landmark targets. Distance meets its 3k triangle / one draw / 250 KB targets. This remains an animated spatial study, not an accepted game integration.

With chamber, fine fibers and postprocessing enabled, browser measurements are **36 render calls** for master/game and 31 for distance. Game presentation renders 24,352 triangles, 221,625 line segments and 18,698 points; master renders 205,840 triangles, 581,625 segments and 36,698 points. These include the setting and postprocessing and must not be confused with model-only cost. Counts are functional SwiftShader evidence, not device benchmarks or FPS claims.

## Runtime contract

- Metres, +Y up, +Z forward. Origin is the ground plot center. The field begins at `[-8,25,3]` m and moves within a **100 × 100 m plot, 64 m high**. No floor/collision mesh is part of the model. The nominal dormant radius is 16 m; curved and extended attention tips require the larger reserved bounds. Scene grids extend beyond the plot and are presentation only.
- Transform the entire loaded scene when placing the asset. `SENZAI_ROOT` owns `FLOAT_FRAME`. This frame drives translation; `FIBER_ROOT_01`–`FIBER_ROOT_48` mark fixed local curve origins. `EYE_01`–`EYE_48` follow tip positions and point local +Y along the curve tangent. `SOCKET_FIELD_CENTER` and `SOCKET_EYE_01`–`SOCKET_EYE_48` provide attachment frames.
- Import `createRig` from `runtime.js`, construct `const rig = createRig(gltf.scene)`, then call `rig.pose(seconds, {awake: 1, hdr: false})`. Returned state includes centre, velocity, focus, per-strand illumination, extension, probe and commitment values, active count, breeze and group-acquisition envelope. `awake` accepts 0–1; interpolate it for fading dormancy. Time is reversible and modulo 72 s. There are **no baked GLB clips**: a generic GLB viewer shows the exported time-zero pose.
- `LIVING_ATTENTION` is a merged mesh whose vertices/normals/colors are deformed by the helper. Preserve `_FIBERID`, `_ALONG`, `_OFFSET`, `_LOCALNORMAL`, `_GLOW` and vertex colors through conversion. GLTFLoader exposes these custom attributes in lowercase. No skinning dependency is needed. `KHR_materials_unlit` is used for the emerald attention. Optional viewer HDR colors drive bloom.
- The plain mesh includes curved dormant fibers and runtime-deformable attention strands. The **fine living surface**, tip halos, fog, bloom and dimensional chamber are companion renderer effects in `senzai-kk02/effects.js`, `space.js` and `viewer.js`, not baked into the GLB. The many companion dormant strands sway, breathe and lean toward group attention on the GPU; the darker supporting GLB fiber mesh retains its authored curved shape. Copy the companion shaders or adapt them to obtain the full presentation in another engine.
- Add `createFibers(lod).group` and `createAttention().group` under `rig.frame`; feed both helpers the state returned from `pose`. Place `createSpace().group` in world space alongside the model. See the viewer for the complete light, fog, follow-camera and composer setup. Clone geometry/colors for independent instances; mutable vertex buffers cannot be shared between different attention states.
- LOD2 is a **static time-zero proxy** with a deliberately coarse filament silhouette. Retained names are lookup markers; do not animate them. Provisional game-entry/distance-return thresholds are 130/160 m; keep LOD1 whenever motion is readable. LOD0 serves close shots and recordings. The viewer selects tiers manually.
- Only `d0` is authored. Awake/dormant and focus changes are runtime states, not damage states or LOD identifiers. D1–D3 are pending.

## Revision preservation / 10 November 2026

Revision 2 regenerated all three plain tiers at the new time-zero pose. Triangle counts, model draws, root/mount positions, node names, coordinate system and plot reservation remain consistent. Tip socket positions follow the revised curves and are refreshed in the manifest across all tiers. The earlier revision from commit `f27b371` is preserved in `originals/r1/`, including its three GLBs, runtime, source snapshots and reports. Archived reports describe that older revision only.

Revision 3 changes only the runtime attention at 27 s and its release. All three GLBs, their costs, time-zero sockets and static distance pose remain byte-identical to revision 2 at `fad5afc`. The previous runtime is preserved by that commit. The manifest records the precision-inspection settings.

## WebKit rendering fix / 10 November 2026

The fiber shader clamps its along-fiber and rim-light inputs before fractional powers. WebKit line interpolation could previously undershoot zero and produce NaN colors, which bloom spread into a large black rectangle. The original fix reproduced the prior defect in native WebKit. After this motion revision, `webkit-report.json` verifies zero non-finite scene/bloom pixels in **48 cases** across display scales 1/2, all three tiers, field/macro cameras, group acquisitions, precision convergence/hold/release, travel and the cycle boundary. Browser module cache versions were advanced again for this revision. The original fix evidence is preserved in `originals/r1/webkit-report.json`.

## Validation and preservation

`manifest.json` provides file hashes, source fingerprints, measurements, reserved bounds, sockets, tier policy and the hashes of all fourteen LATENT asset/viewer files. **Original LATENT assets at commit `d8cc09d` remain byte-identical.** The original viewer is preserved under `source/archive/latent-field-v1/viewer/`; the preservation map points its entry HTML there. The live LATENT route now opens Senzai-KK01 by request. KK02's model and animation remain separate from that viewer upgrade.

`validation-report.json` records all three GLBs with zero validator errors/warnings and no degenerate triangles; informational empty nodes are intentional attachment/lookup frames. It checks 151-name parity, hashes, custom attributes, actual decoded runtime deformation, tip attachments, finite geometry, bounds, static behavior, loop geometry/colors and 720 temporal samples. Maximum sampled curve departure from its straight chord is 5.0889 m; minimum sampled attention clearance is 5.6362 m. Additional 1,440-pose checks measure endpoint radius swings, fixed origins, target-facing tangents, group recruitment, dormant tip motion and continuity at acquisitions and the cycle boundary. Sixty-one precision-hold samples verify stable fifteen-strand membership, a maximum 2.037 m tip diameter, target-facing tangents and a fixed world-space inspection region while the body travels. The 100 × 100 × 64 m reservation is also checked against decoded model geometry at motion and hold poses. This is not a general collision solver.

`browser-report.json` records all tiers, rendered counts, matching GLB downloads, curve/field movement, projected-space motion, controls, PNG capture and 390 px layout. Visual review covers probing, collective acquisition, swift travel, each focus, macro, dormant and mobile views. No compressed copy is shipped; consuming-game gltfpack output still requires decoded validation, especially custom-attribute retention.

Rebuild and validate:

```sh
node tools/asset-pipeline/build-senzai-kk02.mjs
node tools/asset-pipeline/validate-senzai-kk02.mjs
node tools/asset-pipeline/test-senzai-kk02.mjs
```

The browser script uses the local Chromium/Playwright installation. Handoff is the **containing commit plus `assets/senzai-kk02/`**, with `senzai-kk02/` for the companion scene and `tools/asset-pipeline/*senzai-kk02*` for reproducibility. Pending: visual acceptance, consuming-game shader/packing adapter, decoded release checks, camera thresholds, device profiling and damage behavior.

Original geometry, shaders, animation and scene by **jelaludo / Model Workshop**. Derived from the separately preserved LATENT design and its user-supplied concept; no reference image pixels or third-party meshes are embedded. Original Workshop reuse and attribution terms apply.
