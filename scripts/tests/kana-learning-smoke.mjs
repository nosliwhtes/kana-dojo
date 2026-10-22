// Run against this checkout's dev server, bound to localhost (not 127.0.0.1).
// Uses a fresh headless profile and blocks all requests outside the test origin.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const baseURL = process.env.BASE_URL || 'http://localhost:3188';
const output = path.resolve(process.env.EVIDENCE_DIR || '../evidence/browser');
const receipt = {
  status: 'running',
  startedAt: new Date().toISOString(),
  baseURL,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  checks: [],
  pageErrors: [],
  consoleErrors: [],
  views: [],
};
await mkdir(output, { recursive: true });
async function save() {
  const file = path.join(output, 'receipt.json');
  await writeFile(file + '.tmp', JSON.stringify(receipt, null, 2) + '\n');
  await rename(file + '.tmp', file);
}
await save();
let browser;
const check = (name, condition) => {
  receipt.checks.push({ name, passed: Boolean(condition) });
  assert(condition, name);
};
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  receipt.browserVersion = browser.version();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 1440, height: 900 },
  ]) {
    const key = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      hasTouch: viewport.width < 600,
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error =>
        receipt.pageErrors.push({ view: key, message: error.message }),
      );
      page.on('console', message => {
        if (message.type() === 'error')
          receipt.consoleErrors.push({ view: key, message: message.text() });
      });
      await page.route('**/*', route =>
        new URL(route.request().url()).origin === new URL(baseURL).origin
          ? route.continue()
          : route.abort(),
      );
      const response = await page.goto(`${baseURL}/kana`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      check(`${key}: selection renders`, response.status() === 200);
      const welcome = page.locator('[aria-labelledby=welcome-modal-title]');
      await welcome.waitFor();
      await page.keyboard.press('Escape');
      await welcome.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'あ-group', exact: true }).click();
      await page.getByRole('button', { name: 'Go', exact: true }).click();
      await page.getByRole('button', { name: /^Type/ }).click();
      await page
        .getByRole('button', { name: 'Go', exact: true })
        .last()
        .click();
      await page.waitForURL('**/kana/train');
      const input = page.getByRole('textbox', { name: 'Your answer' });
      await input.waitFor();
      await page.waitForFunction(() => {
        const el = document.querySelector('p[lang=ja]');
        return el && getComputedStyle(el).opacity === '1';
      });
      await page.evaluate(() => document.fonts.ready);
      const prompt = await page.locator('p[lang=ja]').innerText();
      const answer = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o' }[prompt];
      check(`${key}: valid selected prompt`, Boolean(answer));
      const initialCheck = page.getByRole('button', {
        name: 'check',
        exact: true,
      });
      check(`${key}: empty check disabled`, await initialCheck.isDisabled());
      const geometry = await page.evaluate(() => {
        const rect = selector => {
          const box = document.querySelector(selector).getBoundingClientRect();
          return {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            right: box.right,
            bottom: box.bottom,
          };
        };
        return {
          innerWidth,
          innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          prompt: rect('p[lang=ja]'),
          input: rect('textarea'),
        };
      });
      check(
        `${key}: no horizontal overflow`,
        geometry.scrollWidth <= viewport.width,
      );
      check(
        `${key}: answer input fits viewport`,
        geometry.input.x >= 0 &&
          geometry.input.right <= viewport.width &&
          geometry.input.bottom <= viewport.height,
      );
      await page.screenshot({ path: path.join(output, `${key}-question.png`) });
      receipt.views.push({ key, geometry, prompt });

      await input.fill('xyz');
      await input.press('Enter');
      await page.getByRole('status').filter({ hasText: 'Wrong!' }).waitFor();
      check(`${key}: wrong answer permits retry`, await input.isEnabled());
      await input.fill(answer.toUpperCase());
      const action = page.getByRole('button', { name: 'check', exact: true });
      await action.focus();
      await page.keyboard.down('Enter');
      await page
        .getByRole('status')
        .filter({ hasText: 'Nicely done!' })
        .waitFor();
      check(`${key}: correct answer frozen`, await input.isDisabled());
      // A repeated keydown on the same held key must not consume feedback.
      await page.keyboard.down('Enter');
      await page.keyboard.up('Enter');
      check(`${key}: held Enter keeps feedback`, await input.isDisabled());
      check(
        `${key}: correct answer announced`,
        (await page.getByRole('status').innerText()).includes(answer),
      );
      await page.screenshot({ path: path.join(output, `${key}-feedback.png`) });

      // Leave through the normal exit control so session totals are saved.
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /^new/i }).waitFor();
      await page.goto(`${baseURL}/kana`, { waitUntil: 'domcontentloaded' });
      const progress = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('kanadojo-stats')).state.allTimeStats,
      );
      check(
        `${key}: mastery survives navigation`,
        progress.characterMastery[prompt].correct === 1 &&
          progress.characterMastery[prompt].incorrect === 1,
      );
      check(
        `${key}: session totals survive navigation`,
        progress.totalCorrect === 1 && progress.totalIncorrect === 1,
      );
      check(
        `${key}: first answer has positive measured time`,
        progress.fastestAnswerMs > 0,
      );
    } finally {
      await context.close();
    }
  }
  check('no uncaught application errors', receipt.pageErrors.length === 0);
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed';
  receipt.error = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  receipt.finishedAt = new Date().toISOString();
  await save();
  process.stdout.write(
    JSON.stringify(
      {
        status: receipt.status,
        checks: receipt.checks.length,
        error: receipt.error,
        output,
      },
      null,
      2,
    ),
  );
}
