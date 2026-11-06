# Learning flow and progress integrity audit

> Historical first-stage checkpoint. The subsequent [quality follow-up](quality-followup.md) resolves the failures listed below and records the final green full-suite result. Statements here about unchanged original tests/configuration apply only to this first stage.

Completed 2026-10-22 against `nosliwhtes/kana-dojo` in an isolated clone.

- Branch: `fix/learning-flow-integrity`
- Baseline: `44652062507dd36a9d563e88ebaf78676d137d4c`
- Main implementation: `451ac179cb18be45b4f7ee01a3cc7d910bf0c399`
- Final verified source: `f448e480ea3da696e73ee426e1b8f1e7a4a33a75`
- Runtime: Node 26.7.0, npm 11.19.0, Chrome 155.0.8059.84

The work improves the existing practice experience and browser-local progress stores. It does not add a new learning mode or change the kana curriculum. Nothing was pushed, published, merged, released, or deployed. Dependencies, credentials, settings, and live installations were not changed. The package lock and original tests/configuration remain unchanged.

## Repository inspection and scope

The actual installed stack is Next.js 16.3.0, React 19, TypeScript, Zustand, next-intl, and localforage. The root guide's Next.js 15 description is older than the package manifest. Business logic remains within the feature architecture; Kana uses the public Progress facade. New interface strings follow existing locale files in English, Spanish, and Chinese; active routing currently supports English and Spanish.

Inspection followed kana selection into classic typing, answer matching shared with Blitz/Gauntlet, adaptive grading, mastery/statistics, and asynchronous Kanji/vocabulary set progress. Shared game controls were checked for keyboard, touch, and accessibility behavior. This is a focused audit, not exhaustive coverage of every feature, theme, or route.

## Fixed findings

| Area                     | Observed problem                                                                                                                                      | Result                                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Answer handling          | Equivalent width and combining-mark inputs were graded inconsistently across modes.                                                                   | NFKC normalization, whitespace handling, and case folding are shared across kana validators. Hiragana/katakana, small kana, and voicing distinctions remain significant. Existing accepted romanizations are retained. |
| Multiple-answer matching | Alternative combinations were allocated as an exponential Cartesian product.                                                                          | Matching tracks reachable input offsets without materializing every answer string. No whole-app performance claim is made.                                                                                             |
| Adaptive feedback        | Reverse grading indexed individual characters instead of complete answer parts such as digraphs.                                                      | Complete normalized answer parts determine which positions are correct.                                                                                                                                                |
| IME and keyboard         | Composition Enter could submit an unfinished answer; global handlers could affect hidden games or unrelated controls.                                 | Composition-aware guards, scoped shortcuts, and rapid/repeated activation protection preserve feedback and normal held-key editing.                                                                                    |
| Timing and mastery       | The first answer could lack a running timer; hidden time could contaminate timing; reverse mode credited romaji as mastery keys.                      | Timing begins when ready, pauses while hidden, and credits the actual kana in reverse practice. Invalid timing samples are ignored.                                                                                    |
| Statistics persistence   | Debounced writes could be lost during navigation; pending writes could recreate removed data; JSON converted the no-sample Infinity sentinel to null. | Lifecycle flush, pending-write cancellation, error containment/retry, and sentinel restoration protect statistics.                                                                                                     |
| Set progress persistence | Answer promises resolved before delayed writes; writes could arrive out of order; reset could be undone by pending hydration/answers.                 | Immediate serialized writes and a generation guard preserve write order and reset intent.                                                                                                                              |
| Storage recovery         | Malformed counts and transient read/write failures could damage or strand progress.                                                                   | Counts are validated and capped. Failed reads do not authorize an empty overwrite. Failed capped writes can be retried on the next answer. Storage errors remain observable through store state.                       |
| Practice controls        | Empty Check remained actionable; answer input/report controls lacked clear accessible names; training buttons hid their visible text.                 | Native disabled semantics, translated labels/help, feedback status announcements, visible Go/Blitz/Gauntlet text, focus treatment, and larger report targets.                                                          |
| Small screens and motion | Long prompts/feedback could overflow; practice motion ignored reduced-motion preference.                                                              | Prompt/feedback wrapping, input bounds, and reduced-motion treatment in the touched practice components.                                                                                                               |

Normalization follows the browser's [String.normalize API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize). IME handling uses [KeyboardEvent.isComposing](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing), with a composition ref and legacy key-code fallback. Hidden-page timing and flush behavior use the [visibilitychange lifecycle event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event). These references support the browser behavior; the existing kana answer catalog remains the curriculum source.

## Validation

Evidence is in the sibling `evidence/` directory of the delivered workspace. Exit-code files accompany the major command logs. Browser screenshots and a source-commit-bound receipt are in `evidence/browser/`.

| Check                                                    | Baseline                                                                    | Final source                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Full Vitest suite, jsdom-compatible Node storage setting | 1,148 passed, 42 failed, 1 skipped; 18 failed files including 5 load errors | 1,176 passed, 41 failed, 1 skipped; 18 failed files including the same 5 load errors |
| Focused existing and new learning/progress tests         | New regressions first demonstrated failures                                 | 62/62 passed across 10 files                                                         |
| Added regression tests                                   | Not present                                                                 | 27/27 passed; independently rerun by reviewer                                        |
| TypeScript and ESLint (`npm run check`)                  | Exit 0; 487 warnings, 0 errors                                              | Exit 0; 486 warnings, 0 errors                                                       |
| Translation validation                                   | —                                                                           | Exit 0                                                                               |
| Original test/configuration checksums                    | Recorded before edits                                                       | All unchanged                                                                        |
| Isolated browser smoke                                   | —                                                                           | 40/40 checks, no page/console errors                                                 |

The full suite remains red. Failure-header comparison found no newly failing test or suite. One stochastic Resources property failure did not recur; this is **not** claimed as a fix. The native Node 26 storage behavior initially produced additional baseline failures; both comparable baseline and final runs used `NODE_OPTIONS=--no-experimental-webstorage` to let jsdom own browser storage. No test expectations, fixtures, exclusions, or Vitest configuration were changed to obtain the result.

Remaining baseline failure areas:

- Five suite-loading errors: four through Next navigation/next-intl resolution and one stale theme-data import.
- Blog and Conjugator SEO assertions incompatible with current no-prefix locale routing/content.
- Blog/Resources rendering expectations and property tests.
- Three Kanji progress assertions expecting older caps. Current product caps were preserved.

### Browser coverage

Fresh headless contexts tested 320×568, 390×844, and 1440×900, with touch capability on narrow views and reduced motion. The harness blocks requests outside the local test origin and never uses the user's browser profile.

The flow selects a kana group, enters typing practice, verifies the prompt and disabled empty Check, exercises held Backspace, submits a wrong answer then an uppercase correct answer, holds Enter without skipping feedback, inspects status semantics, exits/reloads, and verifies persisted mastery, totals, and positive first-answer time. It also checks horizontal overflow and answer-input bounds. Six screenshots capture question and feedback states.

The exact source commit is recorded in `browser/receipt.json`; `browser/server-identity.txt` identifies the serving checkout. Browser evidence verifies this flow, not all Blitz/Gauntlet, reverse-input, or Kanji/vocabulary screens. Reverse, IME, timing, and storage failure/race cases are covered by targeted automated tests.

### Independent review

An independent reviewer requested fixes for a pending-answer/reset race, failure recovery at the progress cap, and an overbroad repeated-key guard. Each received a reproducing regression test and a fix. Final scoped verdict: **PASS** at `f448e480ea3da696e73ee426e1b8f1e7a4a33a75`, with 27 regressions independently passing and the exact-commit 40-check browser receipt inspected. The reviewer did not independently rerun the browser. The complete final review is retained in `evidence/independent-review.md`.

## Reproduce

From this checkout, using its lockfile-installed dependencies:

```bash
NODE_OPTIONS=--no-experimental-webstorage npm test -- --maxWorkers=2
npm run check
npm run i18n:validate

NODE_OPTIONS=--no-experimental-webstorage npm test -- \
  features/Kana/__tests__/answerNormalization.regression.test.ts \
  features/Kana/__tests__/learningFlow.regression.test.tsx \
  features/Progress/__tests__/statsPersistence.regression.test.ts \
  features/Progress/__tests__/setProgressPersistence.regression.test.ts
```

Run the browser smoke in separate terminals. Bind to `localhost`: this checkout's development locale rewrite loops when accessed through a differently named host such as `127.0.0.1`.

```bash
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next dev \
  --turbo --hostname localhost --port 3188
```

```bash
BROWSER_EXECUTABLE=/opt/google/chrome/chrome \
  node scripts/tests/kana-learning-smoke.mjs
```

`BROWSER_EXECUTABLE` is optional when Playwright's Chromium is installed. `BASE_URL` and `EVIDENCE_DIR` override the harness defaults. No production build was run: the repository's `AGENTS.md` explicitly forbids `npm run build` as verification.

## Limits and next priorities

The first follow-up should resolve the existing test harness/import failures and reconcile stale assertions with intended product behavior, then expand end-to-end coverage to other learning modes. Storage errors cannot guarantee durability if the browser/OS terminates before writes finish, or if storage remains unavailable. Multi-tab conflict handling and interrupted browser processes were not exhaustively tested.

Chrome viewport emulation is not a physical mobile device or native Japanese IME. Manual assistive-technology checks, physical-device keyboards, additional browser engines, all themes, production output, and full-application performance/security audits remain outside this validation. The targeted results do not establish full-app safety or accessibility conformance.
