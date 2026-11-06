# Merge validation — 2026-11-06

PR #1 was reassessed against unchanged default-branch commit `44652062507dd36a9d563e88ebaf78676d137d4c`. The earlier draft status reflected the then-current authorization to publish without merging; no outstanding external reviewer approval or hidden product blocker was found. The later instruction authorizes completion and merge when review and validation are clear. No deployment or release is part of this work.

## CI and reproducible runtime

The PR quality workflow now runs `npm test` after `npm run check`, under the existing non-community change condition, and uses Node 26 LTS. Node 20 is end-of-life; Node 26.13.0 is an LTS release supported by the installed Next.js and Vitest engines. See the [Node release table](https://nodejs.org/en/about/previous-releases) and [Next installation requirements](https://nextjs.org/docs/app/getting-started/installation).

Validation uses a separate clone and an official Node 26.13.0/npm 11.20.0 archive verified against its published SHA-256 checksum. The user's global runtime, npm settings, live installations and browser profiles were preserved. `npm ci` succeeds without forced peer resolution or install-script approval changes. npm reports six dependencies with unapproved installation scripts; available prebuilt dependencies support the tested commands.

GitHub reported zero registered workflows, workflow runs, check runs and statuses before publication, despite the workflow file existing on `main`. This is unavailable hosted CI, not a passing hosted run. Actions settings were not changed. The previously denied branch-protection endpoint was not retried or bypassed.

## Dependency follow-up

A fresh install exposed 56 advisory entries (9 critical, 12 high, 33 moderate, 2 low). Independent review identified Next's enabled image optimizer as the material runtime patch priority. The old optimizer resolved nested sharp 0.35.3, distinct from root development tooling sharp 0.34.5.

Commit `19e73e438f401b5f9dfb708b47e7d6d27deda0cd` updates Next and its companion tooling to 16.4.5, Sentry to 10.78.0, and sharp to 0.35.5. The optimizer now resolves sharp 0.35.5. Compatible transitive patches include DOMPurify 3.4.17, Zod 4.6.7 and brace-expansion 1.1.21. Patched Storybook 10.6.6 requires Vitest 4 or 5; the selected Vitest/browser/coverage 4.1.12 versions are aligned. The browser provider type follows the [Vitest 4 migration guide](https://v4.vitest.dev/guide/migration.html). No forced overrides or audit-force downgrades were used.

The newer React lint checks exposed six ref-access errors in four components. Narrow fixes initialize the worker-capability boolean once, derive the nebula sector from rendered star state, synchronize Blitz callback refs in a layout effect, and attach the training button ref directly in JSX. Independent review found these preserve the intended behavior; lint rules were not weakened.

The resulting audit has **19 moderate entries, zero high or critical**, representing four underlying advisory families. These remain explicitly unresolved:

- [glob cancellation](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch pattern amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249): inherited build/lint traversal; no request-controlled runtime pattern path found.
- [PostCSS selector parsing](https://github.com/advisories/GHSA-rj75-hqrm-r3gf): exactly pinned by Typography, processing trusted build CSS; ordinary trusted build use is outside the advisory's stated impact.
- [Satori SVG escaping](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp): inherited through `@vercel/og`; no application import or ImageResponse route found.

These findings did not establish a material merge blocker in the inspected configuration. They do not prove general dependency safety. Unrelated major migrations or forced downgrades were not used merely to clear the audit count.

## Test-contract correction

The first final full-suite run found a randomized Anki property failure: seed `400499189`, path `57:0:0:0:0:0:1:0:0:0:0:0:3:3:3`, counterexample `[["?", "'  '"]]`. The property expected literal repeated spaces in a cloze hint, while `extractText` has always enabled whitespace normalization by default. Dedicated existing tests explicitly require collapsing repeated spaces. The same mismatch also affected the answer property.

Commit `0bb2229428601a006b453a71d87276ea322ae3c8` corrects expected ASCII spacing without changing production conversion, narrowing generators, reducing the 100 randomized runs, or adding skips. Explicit property examples reproduce both hint and answer cases, and two literal regression cases cover punctuation and Japanese text. The unchanged assertion with the recorded example fails deterministically; the corrected contract and focused text tests pass 62/62. Original RED evidence remains in the local evidence directory.

## Validation evidence

The final code/test source is `0bb2229428601a006b453a71d87276ea322ae3c8`.

- Fresh `npm ci`: exit 0 on the committed dependency lockfile.
- `npm run check`: exit 0; zero errors, 495 warnings.
- Full `npm test`: 115 files passed; **1,465 passed, one existing APKG skip**. The prior 1,463 tests remain, with two explicit cloze cases added.
- Independent review passed the original application changes, CI delta, dependency resolution, four ref fixes and Anki test-contract amendment. The reviewer independently executed five whitespace-contract checks; all passed.
- `NEXT_TELEMETRY_DISABLED=1 npm run build`: exit 0 on Next 16.4.5/Turbopack; compilation 28.2 seconds, TypeScript 5.4 seconds, generation 416/416 and sitemap generation completed. Build ID `xkCi7LiUnWGGZ9FIO4FyD`. The explicit production-build request supersedes the repository guide's generic no-build instruction.
- Local production optimizer: HTTP 200 for a repository PNG icon resized to 96×96 AVIF, decoded successfully with the actual Next-resolved sharp 0.35.5.
- Documented development-browser harnesses: **40/40 learning checks and 56/56 page checks**, zero console or page errors, at 320, 390 and 1440px widths. Fresh headless Chrome profiles blocked requests outside the local origin. Harness source and assertions were unchanged.
- Production-browser run: all 40 learning checks and 55/56 page checks passed, with no uncaught application errors. The remaining page assertion reports console errors from unavailable local `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` endpoints (404 and MIME errors). These require Vercel hosting; no hosting integration, analytics mocking or console-assertion weakening was introduced. Original receipts remain alongside the development-server rerun.

Detailed logs, audit JSON, test reports and the verified toolchain checksum are retained in the sibling workspace directory `evidence/merge-2026-11-06/`. Build warnings include the existing Edge Runtime/Node deprecations and a new Sentry v11 import-migration notice; the selected Sentry 10 version still supports the existing import. The generated sitemap was retained as evidence and restored to its exact tracked version. Local-server SSR logs also report unavailable browser storage, while browser progress checks exercise real isolated browser storage.

Historical audit documents describe their original snapshots and should not be interpreted as current dependency/runtime claims.

The work remains a scoped learning-flow, persistence, accessibility and dependency review. It is not complete theme/accessibility certification, native-IME or physical-device coverage, exhaustive testing of every experimental mode, or validation of authenticated external services and dormant Storybook browser integration.
