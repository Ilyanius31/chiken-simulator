## Summary

Replaces the side-view fighter with a playable, mobile-first top-down action RPG. This branch starts from v0.1 commit `e52501e`, so the PR includes the original project foundation even though `main` was still empty.

## Gameplay changes

- Free 360° movement with a multitouch joystick, smooth bounded camera, directional peck/wing/kick attacks, block, stamina, combos, knockback and readable enemy attack arcs.
- Combat takes place in the world. Rookie, Speedy, Bramble and Champion have distinct stats and behaviors, line-of-sight detection, obstacle navigation, retreat and egg drops.
- Working nests, crates, training dummy, physical upgrade shop, NPCs, signs, hidden egg stashes and arena challenge bell.
- Six objectives, a minimap/world atlas, safe-village healing, defeat recovery, an arena boss and the Golden Comb reward.
- Original overhead character/environment art and procedural sounds. No external runtime assets, backend or paid services.
- Reuses the upgrade/economy/audio foundation and safely migrates v0.1 eggs, upgrades, records and settings. The old save remains intact until an explicit reset.

## Map and zones

A continuous 3072×2304 world connects Chicken Village, Sunny Fields, Dark Forest and Champion’s Arena. Paths, buildings, fences, ponds, trees, rocks and logs provide recognizable routes and cover. Every zone is reachable without a loading or battle screen.

## Screenshots

Actual Chromium screenshots (implemented build):

![Chicken Village](https://raw.githubusercontent.com/Ilyanius31/chiken-simulator/feat/top-down-world-v0.2/docs/v02-village.png)
![World atlas](https://raw.githubusercontent.com/Ilyanius31/chiken-simulator/feat/top-down-world-v0.2/docs/v02-map.png)

## Validation

Passed: strict TypeScript, **37 unit tests**, **4 Playwright scenarios (36.1s)** including a full exploration/boss playthrough, production build and production-subpath browser smoke check. See `docs/VALIDATION.md` for evidence, review findings and limits of device emulation. CI repeats strict TypeScript, unit tests, formatting and production build before publishing artifacts or deploying.

## Deployment status

Vite uses the verified `/chiken-simulator/` base. Every feature-branch push produces a downloadable review artifact with the static site and a self-contained HTML preview. Pages deployment runs only after merging to `main`/`master`; this PR does not merge itself or publish the feature branch over the main site. A public preview URL is not claimed.

## Known limitations

One compact authored world; no multiplayer, cloud save, crafting or offline service worker. Real Android thumb comfort, audio behavior and sustained device performance still need phone testing. Saves are browser/origin-specific. The downloadable HTML is a fallback artifact; opening local HTML depends on the Android browser/file handler.
