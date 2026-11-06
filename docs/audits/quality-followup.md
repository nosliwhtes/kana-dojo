# KanaDojo quality follow-up and final delivery

> Subsequent explicit build verification also passed. See the [production build addendum](production-build-verification.md). The build-related limits below describe this original delivery checkpoint.

Completed 2026-10-22 in the isolated `kana-dojo` checkout on branch `fix/learning-flow-integrity`.

- Original repository HEAD: `44652062507dd36a9d563e88ebaf78676d137d4c`.
- Learning and persistence fixes: `451ac179c` and `f448e480e`.
- Full-suite and page fixes: `dd17a8738` and `08e4ac4aa`.
- Verified application source: `08e4ac4aa9a5a244fec34b801713e7717e39e67e`.
- Final browser harness: `5fd0431088db890afeefc38812f6e17c3fab1869`; application source is identical to the verified commit.
- Runtime: Node 26.7.0, npm 11.19.0, Chrome 155.0.8059.84.

The final full suite passes: **1,463 tests passed, one existing skipped test, 115 files passed**. Isolated browser checks pass **40/40 learning-flow checks and 56/56 broader page checks**. TypeScript and ESLint pass with **483 warnings and zero errors**. Independent review gives a scoped **PASS**.

Nothing was pushed, published, merged, released, or deployed. No paid APIs, credentials, security settings, live installations, or user browser profiles were changed. The package manifest and lockfile are unchanged. No production build was run, following the repository's explicit `AGENTS.md` instruction.

## What improved

The [first-stage report](learning-flow-integrity.md) documents kana normalization, efficient alternative matching, adaptive digraph grading, IME and shortcut guards, first-answer/hidden-page timing, reverse-mode mastery, serialized and recoverable progress persistence, reset race protection, accessible controls, and responsive practice feedback. Those fixes remain intact.

This continuation addressed the remaining failure clusters and the real defects they exposed:

| Area                             | Change and reason                                                                                                                                                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runnable test harness            | Inline next-intl through Vite to resolve its extensionless Next imports. Use the actual jsdom storage realm so Node 26's experimental native storage does not replace browser storage. Render translated components under the real message provider. No exclusions or error suppression were added. |
| Theme audit                      | Repair the moved theme import and support the repository's numeric OKLCH color syntax. Calculate finite contrast values using OKLCH → Oklab → linear sRGB → sRGB conversion. Correct `1%` versus `1` lightness parsing. Existing palette values are preserved.                                      |
| Locale metadata                  | Suppress hreflang alternatives when locale routing uses `never`, since cookie-selected locales share the same URL. Prefix-based helper behavior remains covered separately.                                                                                                                         |
| Resource browsing                | Keep zero counts visible, use translated plurals and card labels, expose platform context in card names, remove nested hidden actions, and show keyboard focus.                                                                                                                                     |
| Resource dialog                  | Closed dialogs unmount; the close action has a translated accessible name and a 44px minimum target. A controlled dialog opened without Radix Trigger now restores focus to its opener. Duplicate platform values no longer create duplicate keys.                                                  |
| Academy and conjugator structure | Remove nested main landmarks, including a redundant ARIA `main`; name the article body and correct touched heading hierarchy. Browser checks inspect semantic roles rather than only HTML tags.                                                                                                     |
| Conjugator learning help         | Translate the existing concise three-group explanation with existing messages. Add the useful warning that an `-iru`/`-eru` ending alone does not establish Ichidan: 帰る is Godan, consistent with the repository's verb catalog. Preserve the minimalist design.                                  |
| Progress documentation           | Reconcile the guide and boundary tests with the existing product caps, including Kanji 10 answers per star and 30 total. Explain serialized writes, recovery, and lifecycle limits. Product caps were not changed.                                                                                  |

Official references informed the implementation: [next-intl testing](https://next-intl.dev/docs/environments/testing), [next-intl no-prefix routing](https://next-intl.dev/docs/routing/configuration#locale-prefix-never), and [CSS Color 4 conversion formulas](https://www.w3.org/TR/css-color-4/#color-conversion-code). The color audit estimates contrast after clipping to sRGB; it is not a complete browser CSS parser or gamut-mapping implementation.

## Test integrity and root causes

The first-stage comparable baseline recorded 42 failed tests and five suite-loading errors; its final checkpoint still had 41 failures and the same load errors. The original logs and test hashes remain in `evidence/`. This follow-up deliberately amends stale contracts and test setup rather than presenting those tests as unchanged.

| Cluster                       | Evidence and resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Four next-intl loading errors | Official testing instructions prescribe dependency inlining. Loaded component suites then exposed missing provider setup; real English message providers now render them.                                                                                                                                                                                                                                                                                                                  |
| Theme loading error           | The data module moved to `data/themes/themes`. Fixing the import exposed unsupported OKLCH inputs. Reference RGB vectors, black/white contrast, low-percent lightness and malformed-input tests now cover conversion. The old unconditional theme assertion was strengthened to finite, bounded contrast and consistent issue reporting.                                                                                                                                                   |
| Mastery assertions            | Repository history `ad1c506fb4` changed the Kanji threshold from 5 to 10. Tests now match that product change and explicitly cover 9/10, 19/20, 29/30 and capped 31 boundaries.                                                                                                                                                                                                                                                                                                            |
| Metadata/routes               | `e1cd29e309` unified public routes; `0a7decd771` removed Tools routes; `a28c9c3cc` removed the OG endpoint. Exact route, breadcrumb, position and retired-endpoint assertions reflect those intentional changes.                                                                                                                                                                                                                                                                           |
| Blog rendering                | Semantic heading/text/time queries replace deleted test IDs while retaining content assertions. Related cards use the existing `/academy` route. New checks catch nested main elements and the missing article-region name.                                                                                                                                                                                                                                                                |
| Conjugator help tests         | `6d84e1ec3` intentionally removed the large SEO catalog, tips and collapsible content. The old 21-test group was replaced by five tests for the active three-group explanation, hierarchy, examples, exception warning, optional verb context and Spanish messages. Removed content was not reintroduced merely to satisfy stale tests.                                                                                                                                                    |
| Resource generators           | The long description uses a distinct field prefix so shrinking cannot accidentally match a different field. Absence of the description region is explicitly tested. Existing modal completeness assertions remain, now with the real provider.                                                                                                                                                                                                                                             |
| Hidden feedback               | Feedback stays mounted for animation; its correct contract is exclusion from the accessibility tree and tab order while hidden, not absence of its text node.                                                                                                                                                                                                                                                                                                                              |
| Anki stochastic case          | Seed `-655145063`, path `44:2:0:14:12`, shrank to `":: "`. The converter correctly builds a hierarchy, but the test required a flat root name. Anki [documents `::` as the hierarchy separator](https://docs.ankiweb.net/manual/getting-started#decks). The amended property keeps the same random inputs and checks the entire exact path and every empty cards array, adding deterministic `":: "`, `"日本語"`, `"日本語::かな"` and `"親::::子"` examples. Converter code is unchanged. |

`evidence/followup/acceptance-amendments.json` records before/after hashes for changed existing test/configuration files and separately lists new tests. Failed evidence is retained, including the final pre-review run with seven missing-provider failures and the Anki counterexample. No test was disabled or marked skipped by this work.

## Final verification

Paths below are relative to the workspace containing the checkout.

| Check                  | Result                                                     | Evidence                                                                |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Native `npm test`      | 115 files passed; 1,463 passed, 1 skipped                  | `evidence/followup/accepted-tests.log`, `.exit`, `accepted-vitest.json` |
| `npm run check`        | Exit 0; 483 warnings, zero errors                          | `evidence/followup/accepted-check.log`, `.exit`                         |
| Translation validation | Exit 0, English/Spanish namespaces valid                   | `evidence/followup/i18n.log`, `.exit`                                   |
| Learning browser       | 40/40, no page or console errors, source `08e4ac4aa`       | `evidence/followup/accepted-learning-browser/receipt.json`              |
| Broader browser        | 56/56, no page or console errors, clean source `5fd043108` | `evidence/followup/hydrated-site-browser/receipt.json`                  |
| Independent review     | Scoped PASS, final harness delta accepted                  | `evidence/followup/independent-review.md`                               |
| Patch reconstruction   | Applies to original base and recreates final Git tree      | `evidence/followup/patch-verification.json`                             |

The suite count grew partly because the previously unloadable theme suite now executes its 192 per-theme checks. It is not a claim that hundreds of new tests were authored. The existing skipped APKG test requires a valid SQLite fixture and remains a known coverage gap.

Both harnesses use fresh headless contexts, block all requests outside the local origin, and test 320, 390 and 1440px widths with touch emulation on narrow views. Learning coverage includes wrong-answer retry, uppercase correctness, held Backspace and Enter, accessible status, persisted mastery/totals and positive first-answer timing. The broader flow covers keyboard-opened resource dialogs and focus return, overflow, named article content, public canonical routing, one semantic main landmark, localized help and the Godan exception. Screenshots were visually inspected.

One intermediate browser run recorded a hydration mismatch on `caret-color: transparent`. Installed Playwright screenshot code temporarily adds that style. Using `caret: 'initial'` removed the mutation; no console errors are filtered out. The final harness also waits for ConjugatorInput's mount-effect focus before counting landmarks or scrolling, so autofocus cannot invalidate the intended screenshot. The failed receipt remains available.

Independent review requested and verified fixes for the earlier reset race, capped-write retry, repeated editing keys, remaining ARIA main landmark and missing modal test provider. It reran 151 focused checks and another 25 checks after the final fixes, and compared six derived-color paths across 530 existing OKLCH literals without finding palette changes. The reviewer inspected exact-commit browser receipts; it did not independently rerun the browser.

## Reproduce

Use the unchanged lockfile with Node and npm compatible with the project. In this checkout:

```bash
npm ci --ignore-scripts
npm test
npm run check
npm run i18n:validate
```

Start a local server in one terminal:

```bash
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next dev \
  --turbo --hostname localhost --port 3189
```

Run browser checks in another terminal:

```bash
BASE_URL=http://localhost:3189 BROWSER_EXECUTABLE=/opt/google/chrome/chrome \
  node scripts/tests/kana-learning-smoke.mjs
BASE_URL=http://localhost:3189 BROWSER_EXECUTABLE=/opt/google/chrome/chrome \
  node scripts/tests/site-quality-smoke.mjs
```

`BROWSER_EXECUTABLE` can be omitted with Playwright Chromium installed. `EVIDENCE_DIR` changes the output directory. Use `localhost` consistently; this checkout's development locale rewrite loops with a differently named host such as `127.0.0.1`.

## Limits and remaining work

No execution or approval blocker remains. The local server used for verification was stopped after testing. Original stage-one delivery artifacts are retained; the current delivery manifest identifies the final patch, source commits and checksums.

The theme audit reports issues for all 192 themes under its combined WCAG and design heuristics. These are not all necessarily WCAG failures. Palettes were preserved, and neither passing tests nor the repaired calculations certify theme accessibility. Low-opacity text and all theme combinations still need a dedicated contrast/design pass. The 483 lint warnings remain; no global warning suppression was introduced.

There is no production-build verification, physical mobile-device or native-IME verification, screen-reader audit, cross-browser validation, complete multi-tab persistence analysis, or exhaustive end-to-end coverage of every mode and route. New lifecycle protections cannot guarantee persistence after abrupt OS/browser termination or permanent storage failure. Broader conjugator UI translation remains incomplete outside the touched help and labels. The focused improvements and green suite do not establish full-app safety or accessibility conformance.
