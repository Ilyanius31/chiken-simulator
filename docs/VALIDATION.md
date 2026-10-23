# v0.1 validation — 2026-10-23

Performed in Codex Cloud using Node 24.19.0, npm 11.9.0 and system Chromium. This records observed local results, not a GitHub Pages deployment or a physical Android test.

- `npm ci --no-audit --no-fund --cache /tmp/chicken-npm-cache`: passed from the committed lockfile.
- `npm run typecheck`: passed, strict TypeScript including unit and browser tests.
- `npm test`: 23 tests passed, zero failures/skips. Damage, windup/range/one-hit guards, invulnerability, cooldown/recovery, stamina/guard break, knockback, separation/walls, outcomes, combos, scaling, egg deadlines, prices/purchases, victory bonuses, preservation on losses, validated save round-trip, partial corruption, backup recovery, denied storage, future schema protection, reset and AI match simulations.
- `npm run test:browser`: all four Playwright scenarios passed in 52 seconds. Includes an actual Rookie victory through held keyboard controls, rewards, shop purchase/reload, next rival, real simultaneous touch events via Chromium DevTools, cancellation, focus pause, portrait guidance, settings persistence and reset cancellation.
- After visual CSS corrections, the two affected browser scenarios (`layouts|touch`) passed again. Screenshots inspected at 844×390, 667×375, 390×844 and 1440×900. The shop fits 667×375; the stamina icon no longer inherits the HUD meter layout.
- `npm run build` and `PAGES_BASE_PATH=/chiken-simulator/ npm run build`: both passed. Final bundle approximately 35.60 KB JS + 23.42 KB CSS before compression, 19.22 KB combined gzip, plus HTML and a tiny SVG favicon. No runtime packages or remote asset requests.
- Production `vite preview` was exercised under the actual `/chiken-simulator/` subpath, checking successful HTML/JS/CSS loads and initiating eggs and multiple attacks in Chromium. No page errors or failed asset responses.
- `npm audit --omit=dev --audit-level=high`: zero production vulnerabilities (no production npm dependencies).
- Git whitespace validation: passed.

Git HTTPS read access was verified. GitHub CLI authentication was unavailable and a read-only GitHub API request was rejected by the outbound proxy (CONNECT 403). These observations do not establish Pages permissions or publication. Follow the Android publication steps in the README and verify the resulting HTTPS deployment before declaring the release public. Phone sound playback, real-thumb comfort and physical-device performance remain manual checks.
