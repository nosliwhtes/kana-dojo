// Node 25+ supplies Web Storage globals. Browser unit tests must instead use
// their isolated jsdom window, just as application code does in the browser.
// Vitest aliases window to globalThis; use the environment's actual JSDOM
// instance so a pre-existing Node global cannot mask the browser property.
const browserWindow = (
  globalThis as typeof globalThis & { jsdom?: { window: Window } }
).jsdom?.window;
if (browserWindow) {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: browserWindow[name],
    });
  }
}
