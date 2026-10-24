import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('localforage', () => ({ default: { createInstance: () => storage } }));
const oldData = {
  version: 1,
  updatedAt: 1,
  kanji: { 日: { correct: 4 } },
  vocabulary: {},
};
beforeEach(() => {
  vi.resetModules();
  storage.getItem.mockReset().mockResolvedValue(null);
  storage.setItem.mockReset().mockImplementation(async (_key, value) => value);
});
afterEach(() => vi.useRealTimers());

describe('set progress durability and hydration', () => {
  it('does not restore old progress when a clear races hydration', async () => {
    let resolveRead!: (value: unknown) => void;
    storage.getItem.mockReturnValue(
      new Promise(resolve => {
        resolveRead = resolve;
      }),
    );
    const store = (await import('../store/useSetProgressStore')).default;
    const hydration = store.getState().hydrate();
    await store.getState().clearSetProgress();
    resolveRead(oldData);
    await hydration;
    expect(store.getState().data.kanji).toEqual({});
  });

  it('discards answers waiting on hydration when progress is cleared', async () => {
    let resolveRead!: (value: unknown) => void;
    storage.getItem.mockReturnValue(
      new Promise(resolve => {
        resolveRead = resolve;
      }),
    );
    const store = (await import('../store/useSetProgressStore')).default;
    const kanji = store.getState().recordKanjiProgress('日');
    const vocabulary = store
      .getState()
      .recordVocabularyProgress('日本語', 'reading');
    await store.getState().clearSetProgress();
    resolveRead(oldData);
    await Promise.all([kanji, vocabulary]);
    expect(store.getState().data.kanji).toEqual({});
    expect(store.getState().data.vocabulary).toEqual({});
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('persists an acknowledged answer without waiting for a debounce timer', async () => {
    vi.useFakeTimers();
    const store = (await import('../store/useSetProgressStore')).default;
    await store.getState().recordKanjiProgress('日');
    expect(storage.setItem).toHaveBeenCalledWith(
      'kanadojo-set-progress-v1',
      expect.objectContaining({ kanji: { 日: { correct: 1 } } }),
    );
  });

  it('serializes writes so an older answer cannot overwrite a clear', async () => {
    let release!: () => void;
    const values: unknown[] = [];
    storage.setItem
      .mockImplementationOnce(async (_key, value) => {
        await new Promise<void>(resolve => {
          release = resolve;
        });
        values.push(value);
      })
      .mockImplementation(async (_key, value) => {
        values.push(value);
      });
    const store = (await import('../store/useSetProgressStore')).default;
    await store.getState().hydrate();
    const answer = store.getState().recordKanjiProgress('日');
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const clear = store.getState().clearSetProgress();
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([answer, clear]);
    expect((values.at(-1) as typeof oldData).kanji).toEqual({});
  });

  it('retries a failed write even when the next answer is already capped', async () => {
    storage.getItem.mockResolvedValue({
      ...oldData,
      kanji: { 日: { correct: 29 } },
    });
    storage.setItem.mockRejectedValueOnce(
      new Error('storage temporarily unavailable'),
    );
    const store = (await import('../store/useSetProgressStore')).default;
    await store.getState().recordKanjiProgress('日');
    expect(store.getState().persistenceError).toBe(true);
    await store.getState().recordKanjiProgress('日');
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(store.getState().persistenceError).toBe(false);
    expect(storage.setItem).toHaveBeenLastCalledWith(
      'kanadojo-set-progress-v1',
      expect.objectContaining({ kanji: { 日: { correct: 30 } } }),
    );
  });

  it('does not overwrite disk after a failed read and retries hydration', async () => {
    storage.getItem.mockRejectedValue(new Error('temporarily unavailable'));
    const store = (await import('../store/useSetProgressStore')).default;
    await store.getState().hydrate();
    expect(store.getState().isHydrated).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.getItem.mockResolvedValue(oldData);
    await store.getState().recordKanjiProgress('日');
    expect(store.getState().data.kanji['日'].correct).toBe(5);
  });

  it('repairs malformed persisted counters while preserving usable progress', async () => {
    storage.getItem.mockResolvedValue({
      ...oldData,
      kanji: { 日: { correct: 4 }, 火: { correct: '4' }, 水: null },
      vocabulary: { 日本語: { meaningCorrect: -2, readingCorrect: 2 } },
    });
    const store = (await import('../store/useSetProgressStore')).default;
    await store.getState().hydrate();
    await store.getState().recordKanjiProgress('火');
    await store.getState().recordKanjiProgress('水');
    expect(store.getState().data.kanji).toEqual({
      日: { correct: 4 },
      火: { correct: 1 },
      水: { correct: 1 },
    });
    expect(store.getState().data.vocabulary['日本語']).toEqual({
      meaningCorrect: 0,
      readingCorrect: 2,
    });
  });
});
