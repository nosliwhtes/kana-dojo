import { isKanaInputAnswerCorrect } from './isKanaInputAnswerCorrect';
import type { KanaCharacter } from './flattenKanaGroup';

/**
 * Shared answer check for the Kana game modes (Blitz, Gauntlet, ...).
 *
 * In normal mode the user types romaji: the primary romanization and any
 * registered alternative (e.g. "si" for し, "hu" for ふ) are accepted, matching
 * the main Type mode. In reverse mode the user types the kana character itself.
 *
 * Centralising this keeps the modes consistent - previously Blitz and Gauntlet
 * only accepted the primary romaji, so alternatives valid in the main mode were
 * marked wrong.
 */
export const isKanaGameAnswerCorrect = (
  question: Pick<KanaCharacter, 'kana' | 'romaji' | 'altRomanji'>,
  answer: string,
  isReverse: boolean | undefined,
): boolean => {
  return isKanaInputAnswerCorrect({
    inputValue: answer,
    correctChar: isReverse ? question.romaji : question.kana,
    targetChar: isReverse ? question.kana : question.romaji,
    isReverse: Boolean(isReverse),
    altRomanjiMap: new Map([[question.kana, question.altRomanji]]),
  });
};
