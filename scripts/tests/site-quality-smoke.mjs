// Isolated browser checks for the pages repaired during the full-suite audit.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.BASE_URL || 'http://localhost:3189';
const output = path.resolve(
  process.env.EVIDENCE_DIR || '../evidence/followup/site-browser',
);
const receipt = {
  status: 'running',
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  sourceDirty: Boolean(
    execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  ),
  baseURL,
  startedAt: new Date().toISOString(),
  checks: [],
  pageErrors: [],
  consoleErrors: [],
};
await mkdir(output, { recursive: true });
const save = () =>
  writeFile(
    path.join(output, 'receipt.json'),
    JSON.stringify(receipt, null, 2) + '\n',
  );
await save();
const check = (name, condition) => {
  receipt.checks.push({ name, passed: Boolean(condition) });
  assert(condition, name);
};
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  receipt.browserVersion = browser.version();
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
      hasTouch: width < 600,
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error =>
        receipt.pageErrors.push({ width, message: error.message }),
      );
      page.on('console', message => {
        if (message.type() === 'error')
          receipt.consoleErrors.push({ width, message: message.text() });
      });
      await page.route('**/*', route =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
          ? route.continue()
          : route.abort(),
      );
      let firstVisit = true;
      async function visit(url) {
        const response = await page.goto(baseURL + url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        check(`${width}: ${url} renders`, response.status() === 200);
        const welcome = page.locator('[aria-labelledby=welcome-modal-title]');
        if (firstVisit) {
          await welcome.waitFor();
          await page.keyboard.press('Escape');
          await welcome.waitFor({ state: 'hidden' });
          firstVisit = false;
        }
      }
      async function screenshot(name) {
        await page.screenshot({
          path: path.join(output, `${width}-${name}.png`),
          // Avoid mutating an input's style while streamed content hydrates.
          caret: 'initial',
        });
        check(
          `${width}: ${name} fits viewport`,
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        );
      }
      await visit('/resources/websites');
      const card = page.locator('article[role=button]').first();
      await card.waitFor();
      check(
        `${width}: platform context on resource action`,
        (await card.getAttribute('aria-label')).includes('Available on:'),
      );
      check(
        `${width}: no hidden nested action`,
        (await card.locator('button').count()) === 0,
      );
      await screenshot('resources');
      await card.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      check(
        `${width}: resource dialog receives focus`,
        await dialog.evaluate(element =>
          element.contains(document.activeElement),
        ),
      );
      await screenshot('resource-dialog');
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      // Radix restores focus after the close/unmount lifecycle completes.
      await page.waitForFunction(
        () =>
          document.activeElement ===
          document.querySelector('article[role=button]'),
      );
      check(
        `${width}: close restores card focus`,
        await card.evaluate(element => document.activeElement === element),
      );

      await visit('/academy/katakana-basics');
      await page.locator('article[data-testid=blog-post]').waitFor();
      check(
        `${width}: article has one main landmark`,
        (await page.getByRole('main').count()) === 1,
      );
      check(
        `${width}: article body is named`,
        (await page
          .locator('section[aria-labelledby="article-title-katakana-basics"]')
          .count()) === 1,
      );
      check(
        `${width}: article canonical has public route`,
        (
          await page.locator('link[rel=canonical]').getAttribute('href')
        ).endsWith('/academy/katakana-basics'),
      );
      await screenshot('academy');

      await visit('/conjugate');
      // The input focuses from its mount effect; wait for client hydration before
      // counting landmarks or scrolling so delayed focus cannot undo the scroll.
      await page.waitForFunction(
        () =>
          document.activeElement ===
          document.querySelector('input[aria-labelledby="verb-input-label"]'),
      );
      const help = page.getByRole('region', {
        name: 'Understanding Japanese Verb Conjugation',
        exact: true,
      });
      await help.waitFor();
      check(
        `${width}: conjugator has one main landmark`,
        (await page.getByRole('main').count()) === 1,
      );
      check(
        `${width}: conjugator explains the Ichidan exception`,
        (await help.innerText()).includes('帰る (kaeru) is Godan'),
      );
      await help.scrollIntoViewIfNeeded();
      await screenshot('conjugator-help');

      await context.addCookies([
        { name: 'NEXT_LOCALE', value: 'es', url: baseURL },
      ]);
      await visit('/conjugate');
      await page
        .getByRole('heading', {
          name: 'Entendiendo la Conjugación de Verbos Japoneses',
          exact: true,
        })
        .waitFor();
      check(
        `${width}: Spanish learning help renders`,
        (await page.locator('#seo-content-heading').innerText()).startsWith(
          'Entendiendo',
        ),
      );
    } finally {
      await context.close();
    }
  }
  check('no uncaught application errors', receipt.pageErrors.length === 0);
  check('no browser console errors', receipt.consoleErrors.length === 0);
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed';
  receipt.error = String(error);
  throw error;
} finally {
  await browser?.close();
  receipt.finishedAt = new Date().toISOString();
  await save();
  process.stdout.write(
    JSON.stringify({
      status: receipt.status,
      checks: receipt.checks.length,
      output,
    }) + '\n',
  );
}
