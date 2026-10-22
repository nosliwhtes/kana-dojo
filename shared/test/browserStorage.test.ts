import { expect, it } from 'vitest';

it('uses the same browser storage through global and window access', () => {
  localStorage.setItem('storage-realm-test', 'browser');
  expect(window.localStorage.getItem('storage-realm-test')).toBe('browser');
  window.localStorage.removeItem('storage-realm-test');
  expect(localStorage.getItem('storage-realm-test')).toBeNull();
  sessionStorage.setItem('storage-realm-test', 'session');
  expect(window.sessionStorage.getItem('storage-realm-test')).toBe('session');
  sessionStorage.removeItem('storage-realm-test');
});
