import { normalizeKanaAnswer } from './normalizeKanaAnswer';

interface EvaluateKanaAdaptivePositionsOptions {
  promptChars: string[];
  answerParts: string[];
  inputValue: string;
  isReverse: boolean;
  altRomanjiMap: Map<string, string[]>;
}

export const evaluateKanaAdaptivePositions = ({
  promptChars,
  answerParts,
  inputValue,
  isReverse,
  altRomanjiMap,
}: EvaluateKanaAdaptivePositionsOptions): boolean[] => {
  const normalizedInput = normalizeKanaAnswer(inputValue);
  const results = promptChars.map(() => false);

  if (!normalizedInput) return results;

  if (isReverse) {
    let cursor = 0;
    for (let i = 0; i < promptChars.length; i++) {
      const expected = normalizeKanaAnswer(answerParts[i] ?? '');
      results[i] =
        expected.length > 0 &&
        normalizedInput.slice(cursor, cursor + expected.length) === expected;
      cursor += expected.length;
    }
    return results;
  }

  const lowerInput = normalizedInput.toLowerCase();
  let cursor = 0;

  for (let i = 0; i < promptChars.length; i++) {
    const promptChar = promptChars[i];
    const primary = normalizeKanaAnswer(answerParts[i] ?? '');
    const alternatives = (altRomanjiMap.get(promptChar) ?? []).map(alt =>
      normalizeKanaAnswer(alt),
    );
    const options = Array.from(new Set([primary, ...alternatives]))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const remaining = lowerInput.slice(cursor);
    const matched = options.find(option => remaining.startsWith(option));

    if (matched) {
      results[i] = true;
      cursor += matched.length;
      continue;
    }

    results[i] = false;
    cursor += primary.length;
  }

  return results;
};
