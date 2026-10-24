import {
  matchesKanaAnswerParts,
  normalizeKanaAnswer,
} from './normalizeKanaAnswer';

interface KanaInputAnswerOptions {
  inputValue: string;
  correctChar: string;
  targetChar: string;
  isReverse: boolean;
  altRomanjiMap: Map<string, string[]>;
  /**
   * The individual kana parts that make up the prompt (e.g. ['し', 'ぶ']).
   * Required for correct alternative-romanji lookup on multi-character prompts.
   * When omitted the function falls back to the legacy single-key lookup.
   */
  promptParts?: string[];
  /**
   * The primary romaji for each prompt part in the same order as promptParts
   * (e.g. ['shi', 'bu']). Required alongside promptParts.
   */
  answerParts?: string[];
}

export const isKanaInputAnswerCorrect = ({
  inputValue,
  correctChar,
  targetChar,
  isReverse,
  altRomanjiMap,
  promptParts,
  answerParts,
}: KanaInputAnswerOptions): boolean => {
  // Normalize Unicode form and strip ALL whitespace so that input
  // from an IME, copy-paste, or with intentional spaces (e.g. "chi te")
  // is compared on equal footing with the stored answer.
  const normalizedInput = normalizeKanaAnswer(inputValue);
  if (!normalizedInput) return false;

  if (isReverse) {
    // Reverse mode: user types the kana character itself.
    return normalizedInput === normalizeKanaAnswer(targetChar);
  }

  // Normal mode: user types romaji. Compare case- and Unicode-insensitively.
  const lowerInput = normalizedInput.toLowerCase();
  const lowerTarget = normalizeKanaAnswer(targetChar);

  if (lowerInput === lowerTarget) {
    return true;
  }

  // Match registered alternatives at each prompt boundary.
  if (
    promptParts &&
    answerParts &&
    promptParts.length > 0 &&
    promptParts.length === answerParts.length
  ) {
    return matchesKanaAnswerParts(
      lowerInput,
      promptParts.map((part, index) => [
        answerParts[index],
        ...(altRomanjiMap.get(part) ?? []),
      ]),
    );
  }

  // Legacy single-character fallback (promptParts not provided).
  const alternatives = altRomanjiMap.get(correctChar);
  return alternatives
    ? alternatives.some(alt => lowerInput === normalizeKanaAnswer(alt))
    : false;
};
