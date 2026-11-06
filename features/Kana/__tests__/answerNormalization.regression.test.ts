import { describe, expect, it } from 'vitest';
import { isKanaInputAnswerCorrect } from '../lib/isKanaInputAnswerCorrect';
import { isKanaGameAnswerCorrect } from '../lib/isKanaGameAnswerCorrect';
import { evaluateKanaAdaptivePositions } from '../lib/evaluateKanaAdaptivePositions';

const ga = { kana: 'ガ', romaji: 'ga', altRomanji: [] };
describe('consistent kana answer normalization', () => {
  it.each(['ＧＡ', ' ga '])(
    'accepts width/case variants of romaji: %s',
    answer => {
      expect(isKanaGameAnswerCorrect(ga, answer, false)).toBe(true);
      expect(
        isKanaInputAnswerCorrect({
          inputValue: answer,
          correctChar: 'ガ',
          targetChar: 'ga',
          isReverse: false,
          altRomanjiMap: new Map(),
        }),
      ).toBe(true);
    },
  );
  it.each(['カ\u3099', 'ｶﾞ'])(
    'accepts equivalent katakana in reverse games: %s',
    answer => {
      expect(isKanaGameAnswerCorrect(ga, answer, true)).toBe(true);
      expect(
        isKanaInputAnswerCorrect({
          inputValue: answer,
          correctChar: 'ga',
          targetChar: 'ガ',
          isReverse: true,
          altRomanjiMap: new Map(),
        }),
      ).toBe(true);
    },
  );
  it('preserves script, small-kana and voicing distinctions', () => {
    for (const answer of ['が', 'カ', 'か'])
      expect(isKanaGameAnswerCorrect(ga, answer, true)).toBe(false);
    expect(
      isKanaGameAnswerCorrect(
        { kana: 'ャ', romaji: 'xya', altRomanji: [] },
        'ヤ',
        true,
      ),
    ).toBe(false);
  });
  it('scores full digraphs rather than individual code units in reverse practice', () => {
    expect(
      evaluateKanaAdaptivePositions({
        promptChars: ['kya', 'gyu', 'a'],
        answerParts: ['きゃ', 'ぎゅ', 'あ'],
        inputValue: 'きゃ きゅ あ',
        isReverse: true,
        altRomanjiMap: new Map(),
      }),
    ).toEqual([true, false, true]);
  });
  it('normalizes spaces and width before partial-credit alignment', () => {
    expect(
      evaluateKanaAdaptivePositions({
        promptChars: ['し', 'ぶ', 'ち'],
        answerParts: ['shi', 'bu', 'chi'],
        inputValue: 'ＳＩ bu xx',
        isReverse: false,
        altRomanjiMap: new Map([['し', ['si']]]),
      }),
    ).toEqual([true, true, false]);
  });
});
