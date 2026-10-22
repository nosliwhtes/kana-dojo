import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import kanaMessages from '@/core/i18n/locales/en/kana.json';
import commonMessages from '@/core/i18n/locales/en/common.json';

vi.mock('@/features/Preferences', () => ({
  useThemePreferences: () => ({ isGlassMode: false }),
}));
vi.mock('@/core/i18n/routing', () => ({
  usePathname: () => '/kana/train',
  useRouter: () => ({ push: vi.fn() }),
  Link: 'a',
  routing: { locales: ['en', 'es'], defaultLocale: 'en' },
}));
vi.mock('@/shared/hooks/generic/useAudio', () => ({
  useClick: () => ({ playClick: vi.fn() }),
  useCorrect: () => ({ playCorrect: vi.fn() }),
  useError: () => ({ playErrorTwice: vi.fn() }),
}));
vi.mock('@/features/CrazyMode/hooks/useCrazyModeTrigger', () => ({
  useCrazyModeTrigger: () => ({ trigger: vi.fn() }),
}));
vi.mock('@/shared/ui-composite/Game/Stars', () => ({ default: () => null }));
vi.mock('@/shared/utils/adaptiveSelection', () => ({
  getGlobalAdaptiveSelector: () => ({
    selectWeightedCharacter: (chars: string[]) => chars[0],
    markCharacterSeen: vi.fn(),
    updateCharacterWeight: vi.fn(),
  }),
}));

import InputGame from '@/features/Kana/components/Game/Input';
import useKanaStore from '@/features/Kana/store/useKanaStore';
import { useStatsStore } from '@/features/Progress';

const showGame = (props = {}) =>
  render(
    <NextIntlClientProvider
      locale='en'
      messages={{ kana: kanaMessages, common: commonMessages }}
    >
      <InputGame isHidden={false} {...props} />
    </NextIntlClientProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers();
  useKanaStore.setState({ kanaGroupIndices: [0] });
  useStatsStore.setState(useStatsStore.getInitialState());
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Kana typing learning flow', () => {
  it('does not grade the Enter used to confirm IME composition', () => {
    showGame({ isReverse: true });
    const input = screen.getByRole('textbox');
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'あ' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(useStatsStore.getState().numCorrectAnswers).toBe(0);
    expect(useStatsStore.getState().numWrongAnswers).toBe(0);
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useStatsStore.getState().numCorrectAnswers).toBe(1);
  });

  it('times the first answer and excludes hidden time after resuming', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const view = showGame();
    now = 600;
    view.rerender(
      <NextIntlClientProvider
        locale='en'
        messages={{ kana: kanaMessages, common: commonMessages }}
      >
        <InputGame isHidden />
      </NextIntlClientProvider>,
    );
    now = 5600;
    view.rerender(
      <NextIntlClientProvider
        locale='en'
        messages={{ kana: kanaMessages, common: commonMessages }}
      >
        <InputGame isHidden={false} />
      </NextIntlClientProvider>,
    );
    now = 6100;
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(useStatsStore.getState().allTimeStats.answerTimesMs).toEqual([1000]);
  });

  it('credits kana mastery in reverse practice', () => {
    showGame({ isReverse: true });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'あ' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(useStatsStore.getState().allTimeStats.characterMastery).toEqual({
      あ: { correct: 1, incorrect: 0 },
    });
    expect(useStatsStore.getState().allTimeStats.hiraganaCorrect).toBe(1);
  });

  it('does not let hidden games consume Continue shortcuts', () => {
    const view = showGame();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    act(() => vi.advanceTimersByTime(350));
    view.rerender(
      <NextIntlClientProvider
        locale='en'
        messages={{ kana: kanaMessages, common: commonMessages }}
      >
        <InputGame isHidden />
      </NextIntlClientProvider>,
    );
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(
      (view.container.querySelector('textarea') as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
  });

  it('preserves held editing keys while entering an answer', () => {
    showGame();
    const input = screen.getByRole('textbox');
    for (const key of ['Backspace', 'ArrowLeft', 'a', ' ']) {
      expect(fireEvent.keyDown(input, { key, repeat: true })).toBe(true);
    }
    expect(fireEvent.keyDown(input, { key: 'Enter', repeat: true })).toBe(
      false,
    );
  });

  it('keeps feedback on rapid action clicks and suppresses held-key activation', () => {
    showGame();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'check' }));
    const next = screen.getByRole('button', { name: 'next' });
    fireEvent.click(next);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).disabled).toBe(
      true,
    );
    act(() => vi.advanceTimersByTime(350));
    expect(fireEvent.keyDown(next, { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.click(next);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).disabled).toBe(
      false,
    );
  });

  it('provides an accessible answer label and native disabled check action', () => {
    showGame();
    expect(screen.getByRole('textbox').getAttribute('aria-label')).toBeTruthy();
    const check = screen.getByRole('button', {
      name: /check/i,
    }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    expect(check.disabled).toBe(false);
    fireEvent.click(check);
    expect(screen.getByRole('status').textContent).toContain('a');
  });
});
