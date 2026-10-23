# Chicken Simulator development

- This is a mobile-first, browser-only TypeScript / Vite / Canvas 2D game. Keep runtime dependencies and asset downloads minimal; no backend, React or heavy engine.
- Use strict TypeScript. Balance and attack definitions belong in `src/core/config.ts`.
- Keep combat, AI, economy and saves independent of the DOM. Rendering belongs in `src/render`, browser integration in `src/platform`, and interface templates in `src/ui`.
- Preserve the fixed simulation timestep, attack windup/active/recovery phases, per-attack hit guard, fighter separation and bounded stamina.
- Support simultaneous pointers and release controls on cancel, focus loss, pause and navigation. Check Android landscape at 667×375 and 844×390, and portrait guidance.
- All player-facing text is English. Keep UI strings in the UI layer to make future localization straightforward.
- Do not use real animal violence, blood, paid APIs, unlicensed art, remote fonts, trackers or secret credentials. Roosters and sounds are original procedural artwork.
- Validate saved fields individually. Preserve unknown save versions and healthy backups. Do not change the save schema without a migration plan and tests.
- Run `npm run typecheck`, `npm test`, `npm run build` for code changes. Run `npm run test:browser` for game lifecycle or input changes when Chromium is available. Do not describe emulation as a real Android device test.
- Default Vite base is `/chicken-simulator/`; CI derives the subpath from the actual repository name. Never hard-code root-relative asset URLs.
- Work on a feature branch. Never push the default branch without explicit permission. Keep the Pages workflow official and token-free.
- Use the existing isolated checkout under `/workspace`; do not create a worktree unless requested. `npm ci` reproduces the dependency setup.
