# Chicken Simulator development

- Mobile-first top-down exploration/action game; strict TypeScript, Vite, Canvas 2D, localStorage, no backend or runtime framework.
- Preserve a true overhead camera, movement on both axes, and combat directly on the world map. Never restore side-view battle scenes.
- Keep `src/world` map/camera/collision/navigation/interactions independent of the DOM; rendering in `src/render`, browser input/audio in `src/platform`, UI in `src/ui`, combat/economy/save/lifecycle in `src/core`.
- Balance lives in `src/core/config.ts`. Preserve attack phases, directional arcs, per-target hit guards, limited block stamina, knockback collision and invulnerability. Village must stay safe.
- Author compact, traversable locations. Every interaction indicator needs a functioning interaction. Test that all zones and landmarks remain reachable after geometry changes.
- Preserve 60 Hz fixed simulation steps and bounded catch-up; cull rendering and avoid needless asset requests. Original procedural art/audio only, no unknown asset licenses or realistic violence.
- Support independent joystick/button pointers; clear them on cancel, blur, pause and screen changes. Check 667×375 and 844×390 landscape and portrait guidance. Never require desktop-only actions to play.
- Validate saves field by field and retain migration/backup tests. v0.1 progress must survive; unknown future schemas must not be overwritten. Resets require explicit confirmation.
- Russian is the default player language. All player-facing copy (including Canvas, accessibility, errors and notices) lives in src/localization/ru.ts and is accessed through src/localization. Keep source identifiers in English. Preserve locale shape for future translations. Check Russian declension and long labels at mobile sizes.
- Run `npm run typecheck`, `npm test`, `npm run build`; run browser scenarios for lifecycle/input/world changes. Distinguish controlled-clock Chromium playthroughs from physical Android testing. Browser tests may observe read-only snapshots but must not forge gameplay outcomes.
- Run `npm run format` and `npm run format:check`. Generated `artifacts/`, `dist/` and `test-results/` are not source.
- The actual slug and default Vite base are `chiken-simulator` and `/chiken-simulator/`. CI derives the base from the repository name. All asset paths must work under a subpath.
- Work on the requested feature branch using the existing isolated checkout. Do not create worktrees unless requested. Never push to main or merge a PR without explicit permission.
- Create review PRs through authorized GitHub tooling; never approve or merge them. Do not add custom deployment secrets, paid services or publish unverified URLs.
