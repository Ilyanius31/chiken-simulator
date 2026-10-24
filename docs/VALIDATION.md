# v0.2 validation and review — 2026-10-24

Executed in Codex Cloud using Node 24.19.0 and Chromium. These results describe the implemented branch, not physical Android testing or a confirmed public deployment.

## Executed checks

- Strict TypeScript: `npm run typecheck` passed.
- Unit tests: `npm test` passed **37/37**, with no failures or skips. Coverage includes four-axis and analog movement, camera bounds, obstacle/water collision, routes to all zones, enemy navigation and sight, directional damage, windup/cooldowns, stamina/block, hit guards, knockback, actual Rookie combat, defeat recovery, boss activation/reward, object interactions, egg deadlines, atomic purchases, objectives, save migration, field validation, backup recovery and future-schema protection.
- Browser tests: `npm run test:browser` passed **4/4 in 36.1 seconds**, with no failures or skips. The complete playthrough uses ordinary keyboard/click input: Pip dialogue, nest, laying, Rookie victory, physical shop purchase, all four zones, bell activation, Champion victory and reload persistence. Separate scenarios cover simultaneous joystick/attack touch events, cancellation, focus pause, portrait guidance, legacy save migration, sound/reset cancellation and layout checks at 667×375, 844×390 and 1440×900.
- The browser clock is controlled for repeatability. The playthrough does not teleport the player or fabricate currency/damage; read-only Canvas data attributes expose positions for navigation assertions.
- Production build: `npm run build` passed with `/chiken-simulator/`. JS **58.20 KB** and CSS **22.30 KB**, approximately **27.76 KB combined gzip**, plus HTML/favicon. No runtime npm dependencies or remote art/font requests.
- Production Chromium smoke check loaded the correct subpath and its JS/CSS/favicon, started the world and laid an egg. No browser errors or failed asset responses.
- `npm run preview:pack` generated an **81,679-byte** self-contained HTML preview. This artifact is separate from HTTPS publication.
- Screenshots in this directory were captured from the actual browser test run. The village, atlas and arena were visually inspected.

## Review findings and corrections

The old side-view assumptions have been removed from movement, camera, rendering, collision, combat and lifecycle. The economy/audio/storage foundations remain, with explicit v1-to-v2 migration. Gameplay logic is independently testable and browser input clears on cancellation and pause.

During development, long-distance combat sight checks were limited to nearby fighters, and steering checks use character clearance instead of sight clearance. Browser helpers were corrected to reach the exact final destination after grid navigation and to wait for attack recovery before laying an egg. The save-migration fixture now runs before application startup. Earlier failed/interrupted runs are not counted as passes; the final four-scenario run completed successfully.

No release-blocking failure was observed in the executed checks. This is an implementation self-review, not an independent audit. Remaining scope and risks:

- Physical Android thumb comfort, sound unlock and sustained frame rate still need device testing. Chromium viewport/touch emulation does not establish those outcomes.
- Combat balance is an initial accessible tuning; a skilled player can win the first Champion encounter without a long upgrade grind. Further phone playtests should guide difficulty changes.
- Local saves are browser/origin-specific. Reload restores position at full health and resets active encounters; combat itself is not serialized.
- The world is intentionally compact, with one authored map and no multiplayer, crafting, backend or service worker.
- Opening the standalone HTML directly depends on the Android browser/file handler. GitHub Actions also provides the normal static-site build.
- GitHub Pages publication is gated on user review/merge and repository Pages settings. A successful local build does not establish a public HTTPS site.

## Android acceptance after publication

Open the URL supplied by the successful Pages deployment. Turn the phone sideways; move and attack with both thumbs, cancel touches and switch apps. Talk to Pip, collect a nest, lay an egg, strike the dummy, open a crate, defeat a Rookie, buy an upgrade, visit the forest and defeat the arena Champion. Reload and confirm eggs/upgrades/objectives/settings persist. Check portrait guidance, audio mute and reset cancellation.
