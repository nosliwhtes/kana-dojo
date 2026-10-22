import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useStatsStore from '../store/useStatsStore';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useStatsStore.setState(useStatsStore.getInitialState());
  vi.runAllTimers();
});
afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const saved = () =>
  JSON.parse(localStorage.getItem('kanadojo-stats')!).state.allTimeStats;

describe('statistics persistence', () => {
  it('flushes the latest debounced statistics on pagehide', () => {
    useStatsStore.getState().incrementHiraganaCorrect();
    useStatsStore.getState().incrementHiraganaCorrect();
    window.dispatchEvent(new Event('pagehide'));
    expect(saved().hiraganaCorrect).toBe(2);
  });
  it('flushes when the tab becomes hidden', () => {
    useStatsStore.getState().incrementKatakanaCorrect();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(saved().katakanaCorrect).toBe(1);
  });

  it('keeps failed writes in memory and retries without an uncaught timer error', () => {
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    useStatsStore.getState().incrementHiraganaCorrect();
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(warning).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('pagehide'));
    expect(write).toHaveBeenCalledTimes(2);
    expect(saved().hiraganaCorrect).toBe(1);
  });

  it('does not resurrect deleted storage from a pending write', () => {
    useStatsStore.getState().incrementHiraganaCorrect();
    useStatsStore.persist.clearStorage();
    vi.runAllTimers();
    expect(localStorage.getItem('kanadojo-stats')).toBeNull();
  });
  it('recovers a JSON null fastest time without awarding a zero-ms record', async () => {
    localStorage.setItem(
      'kanadojo-stats',
      JSON.stringify({
        state: { allTimeStats: { fastestAnswerMs: null } },
        version: 0,
      }),
    );
    await useStatsStore.persist.rehydrate();
    useStatsStore.getState().recordAnswerTime(750);
    expect(useStatsStore.getState().allTimeStats.fastestAnswerMs).toBe(750);
  });
  it('ignores invalid and zero timing samples', () => {
    for (const ms of [0, -10, NaN, Infinity])
      useStatsStore.getState().recordAnswerTime(ms);
    expect(useStatsStore.getState().allTimeStats.answerTimesMs).toEqual([]);
  });
});
