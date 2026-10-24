# Production build verification

On 2026-10-22, the explicitly requested production build passed on source commit `5a69f71623134bf4615ce627ab48cef736ba29ef`, branch `fix/learning-flow-integrity`, in the existing isolated checkout. The later explicit build request superseded the repository guide's earlier instruction against using builds for verification.

```bash
NEXT_TELEMETRY_DISABLED=1 npm run build
```

The documented command runs commit-information generation and `next build`, followed by the existing `next-sitemap` postbuild script. Runtime: Node 26.7.0, npm 11.19.0, Next.js 16.3.0 with Turbopack.

| Stage                                       | Result                         |
| ------------------------------------------- | ------------------------------ |
| Commit information                          | Correct source commit recorded |
| Optimized compilation                       | Passed, 23.7 seconds           |
| After-compile hook                          | Passed                         |
| TypeScript                                  | Passed, 4.8 seconds            |
| Page-data collection/static-generation work | Completed 416/416 entries      |
| Page optimization                           | Completed                      |
| `next-sitemap`                              | Passed; one sitemap generated  |
| Overall command                             | Exit 0                         |

Build ID: `JBPNk36dhfPV_Wn-6ddXQ`. Many routes are dynamic and rendered on demand; the generation count does not mean every route was exercised or emitted as static HTML.

No application fix, dependency change, new secret or service configuration was required. No deployment, push, PR, merge, release or paid API action was performed. No local environment files or configured service credentials were present. Public Google Fonts downloads are part of the existing production font loader.

The first attempt used the restricted execution sandbox. The commit-information helper caught `spawnSync /bin/sh EPERM`; a separate probe reproduced that exact restriction. While the compiler remained at the compile stage without emitted bundles, that attempt was stopped with SIGTERM (exit 143), then the same command was run with normal local process/network access. The interrupted attempt is not classified as an application build failure. The second attempt generated correct commit information and completed successfully.

Warnings remain: Node's `module.register()` deprecation, Next's Edge Runtime deprecation/static-generation limitation, and Node 26's experimental localStorage warning without a storage-file argument. None blocked this build. No warning suppression, credential workaround, TLS bypass or product configuration change was introduced.

The postbuild step regenerated the tracked sitemap. Its generated copy and diff were retained as evidence, then the tracked file was restored to the exact pre-build version. Previous commits, patch packages and test evidence are preserved. Documentation is the only new committed change.

Evidence is in the sibling workspace directory `evidence/build/`: `production-build-2.log`, `.exit`, `receipt.json`, build/route/prerender manifests, build ID and generated sitemap. The restricted-attempt log, exit code, process-stop record and spawn-error reproduction are retained separately.

This verifies the production build pipeline. It does not add deployment validation, production-server browser coverage, physical-device coverage or tests of authenticated external integrations. The earlier 1,463 passing tests and 96 browser checks remain applicable because application source did not change.
