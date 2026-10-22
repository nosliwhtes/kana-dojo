'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { kana } from '@/features/Kana/data/kana';
import useKanaStore from '@/features/Kana/store/useKanaStore';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import {
  useClick,
  useCorrect,
  useError,
} from '@/shared/hooks/generic/useAudio';
// import GameIntel from '@/shared/ui-composite/Game/GameIntel';
import { useStatsStore } from '@/features/Progress';
import { useShallow } from 'zustand/react/shallow';
import Stars from '@/shared/ui-composite/Game/Stars';
import { useCrazyModeTrigger } from '@/features/CrazyMode/hooks/useCrazyModeTrigger';
import { getGlobalAdaptiveSelector } from '@/shared/utils/adaptiveSelection';
import { GameBottomBar } from '@/shared/ui-composite/Game/GameBottomBar';
import { isKanaInputAnswerCorrect } from '@/features/Kana/lib/isKanaInputAnswerCorrect';
import { evaluateKanaAdaptivePositions } from '@/features/Kana/lib/evaluateKanaAdaptivePositions';
import useClassicSessionStore from '@/shared/store/useClassicSessionStore';
import { useAdaptiveTargetLength } from '@/shared/hooks/game/useAdaptiveTargetLength';
import { useThemePreferences } from '@/features/Preferences';
import { cn } from '@/shared/utils/utils';
import { shouldSuppressContinueKeyboardShortcut } from '@/shared/utils/game/continueShortcutGuard';

// Get the global adaptive selector for weighted character selection
const adaptiveSelector = getGlobalAdaptiveSelector();

// Helper function to determine if a kana character is hiragana or katakana
const isHiragana = (char: string): boolean => {
  // Hiragana Unicode range: U+3040 to U+309F
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309f;
};

const isKatakana = (char: string): boolean => {
  // Katakana Unicode range: U+30A0 to U+30FF
  const code = char.charCodeAt(0);
  return code >= 0x30a0 && code <= 0x30ff;
};

// Bottom bar states
type BottomBarState = 'check' | 'correct' | 'wrong';

interface InputGameProps {
  isHidden: boolean;
  isReverse?: boolean;
}

const InputGame = ({ isHidden, isReverse = false }: InputGameProps) => {
  const t = useTranslations('kana');
  const reducedMotion = useReducedMotion();
  const composingRef = useRef(false);
  const logAttempt = useClassicSessionStore(state => state.logAttempt);
  const {
    score,
    setScore,
    incrementHiraganaCorrect,
    incrementKatakanaCorrect,
    recordAnswerTime,
    incrementWrongStreak,
    resetWrongStreak,
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    addCorrectAnswerTime,
    incrementCharacterScore,
  } = useStatsStore(
    useShallow(state => ({
      score: state.score,
      setScore: state.setScore,
      incrementHiraganaCorrect: state.incrementHiraganaCorrect,
      incrementKatakanaCorrect: state.incrementKatakanaCorrect,
      recordAnswerTime: state.recordAnswerTime,
      incrementWrongStreak: state.incrementWrongStreak,
      resetWrongStreak: state.resetWrongStreak,
      incrementCorrectAnswers: state.incrementCorrectAnswers,
      incrementWrongAnswers: state.incrementWrongAnswers,
      addCharacterToHistory: state.addCharacterToHistory,
      addCorrectAnswerTime: state.addCorrectAnswerTime,
      incrementCharacterScore: state.incrementCharacterScore,
    })),
  );

  const isGlassMode = useThemePreferences().isGlassMode;

  const answerStartTimeRef = useRef<number | null>(null);
  const elapsedTimeMsRef = useRef(0);

  const { playClick } = useClick();
  const { playCorrect } = useCorrect();
  const { playErrorTwice } = useError();
  const { trigger: triggerCrazyMode } = useCrazyModeTrigger();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const justAnsweredRef = useRef(false);
  const {
    targetLength,
    recordCorrect: recordTargetLengthCorrect,
    recordWrong: recordTargetLengthWrong,
  } = useAdaptiveTargetLength({ correctsPerLevel: 10 });

  const [inputValue, setInputValue] = useState('');
  const [bottomBarState, setBottomBarState] = useState<BottomBarState>('check');
  const [_lastWrongInput, setLastWrongInput] = useState('');
  const [clearWrongFeedbackSignal, setClearWrongFeedbackSignal] = useState(0);
  const [wrongFeedbackSignal, setWrongFeedbackSignal] = useState(0);

  const kanaGroupIndices = useKanaStore(state => state.kanaGroupIndices);

  const selectedKana = useMemo(
    () => kanaGroupIndices.map(i => kana[i].kana).flat(),
    [kanaGroupIndices],
  );
  const selectedRomaji = useMemo(
    () => kanaGroupIndices.map(i => kana[i].romanji).flat(),
    [kanaGroupIndices],
  );

  // Map: kana → alternative romanji
  // Example: 'ん' → ['nn']
  const altRomanjiMap = useMemo(() => {
    const map = new Map<string, string[]>();
    kanaGroupIndices.forEach(i => {
      const group = kana[i];
      group.altRomanji?.forEach((alternatives, idx) => {
        if (alternatives.length > 0) {
          map.set(group.kana[idx], alternatives);
        }
      });
    });
    return map;
  }, [kanaGroupIndices]);

  // Create mapping pairs based on mode
  const selectedPairs = useMemo(
    () =>
      Object.fromEntries(
        isReverse
          ? selectedRomaji.map((key, i) => [key, selectedKana[i]])
          : selectedKana.map((key, i) => [key, selectedRomaji[i]]),
      ),
    [isReverse, selectedRomaji, selectedKana],
  );

  const buildTargetPair = useCallback(() => {
    const sourceArray = isReverse ? selectedRomaji : selectedKana;
    if (sourceArray.length === 0) {
      return {
        correctChar: '',
        targetChar: '',
        promptParts: [],
        answerParts: [],
      };
    }

    const used = new Set<string>();
    const promptParts: string[] = [];
    const answerParts: string[] = [];

    for (let i = 0; i < targetLength; i++) {
      const available = sourceArray.filter(char => !used.has(char));
      if (available.length === 0) break;
      const selected = adaptiveSelector.selectWeightedCharacter(available);
      used.add(selected);
      adaptiveSelector.markCharacterSeen(selected);
      promptParts.push(selected);
      answerParts.push(selectedPairs[selected]);
    }

    return {
      correctChar: promptParts.join(''),
      targetChar: answerParts.join(''),
      promptParts,
      answerParts,
    };
  }, [isReverse, selectedRomaji, selectedKana, targetLength, selectedPairs]);

  const buildTargetPairRef = useRef(buildTargetPair);
  const selectionSignature = useMemo(
    () =>
      `${isReverse ? 'reverse' : 'normal'}::${selectedKana.join('|')}::${selectedRomaji.join('|')}`,
    [isReverse, selectedKana, selectedRomaji],
  );

  const [pairData, setPairData] = useState(() => buildTargetPair());
  const correctChar = pairData.correctChar;
  const targetChar = pairData.targetChar;
  const promptParts = pairData.promptParts;
  const answerParts = pairData.answerParts;
  const pauseTimer = useCallback(() => {
    if (answerStartTimeRef.current !== null) {
      elapsedTimeMsRef.current +=
        performance.now() - answerStartTimeRef.current;
      answerStartTimeRef.current = null;
    }
  }, []);
  const getElapsedTimeMs = useCallback(() => {
    if (answerStartTimeRef.current !== null) {
      return (
        elapsedTimeMsRef.current +
        (performance.now() - answerStartTimeRef.current)
      );
    }
    return elapsedTimeMsRef.current;
  }, []);
  const resetTimer = useCallback(() => {
    answerStartTimeRef.current = null;
    elapsedTimeMsRef.current = 0;
  }, []);
  const startTimer = useCallback(() => {
    answerStartTimeRef.current = performance.now();
    elapsedTimeMsRef.current = 0;
  }, []);

  const hasKana = selectedKana.length > 0;
  const hasRomaji = selectedRomaji.length > 0;
  const isReady = isReverse ? hasRomaji : hasKana;

  useEffect(() => {
    if (!isHidden && inputRef.current && bottomBarState === 'check') {
      inputRef.current.focus();
    }
  }, [bottomBarState, isHidden]);

  useEffect(() => {
    buildTargetPairRef.current = buildTargetPair;
  }, [buildTargetPair]);

  // Keyboard shortcut for Enter/Space to trigger button
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isHidden ||
        event.isComposing ||
        event.keyCode === 229 ||
        composingRef.current
      )
        return;
      const target = event.target;
      if (event.repeat) {
        if (target === inputRef.current || target === buttonRef.current)
          event.preventDefault();
        return;
      }
      if (
        target instanceof HTMLElement &&
        target !== inputRef.current &&
        target.closest(
          'button, a, input, textarea, select, [contenteditable=true], [role=dialog]',
        )
      )
        return;
      const isEnter = event.key === 'Enter';
      const isSpace = event.code === 'Space' || event.key === ' ';
      const isContinueShortcut = isEnter || isSpace;

      if (isContinueShortcut && shouldSuppressContinueKeyboardShortcut()) {
        event.preventDefault();
        return;
      }

      if (isEnter) {
        if (justAnsweredRef.current) {
          event.preventDefault();
          return;
        }
        // Allow Enter to trigger Next button when correct
        if (bottomBarState === 'correct') {
          event.preventDefault();
          buttonRef.current?.click();
        }
      } else if (isSpace) {
        // Only trigger button for continue state.
        // If it's 'wrong', user might be trying to type a space to fix their answer.
        if (bottomBarState === 'correct') {
          event.preventDefault();
          buttonRef.current?.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bottomBarState, isHidden]);

  useEffect(() => {
    const syncTimer = () => {
      if (
        !isReady ||
        isHidden ||
        document.hidden ||
        bottomBarState === 'correct'
      ) {
        pauseTimer();
      } else if (answerStartTimeRef.current === null) {
        answerStartTimeRef.current = performance.now();
      }
    };
    syncTimer();
    document.addEventListener('visibilitychange', syncTimer);
    return () => {
      pauseTimer();
      document.removeEventListener('visibilitychange', syncTimer);
    };
  }, [isReady, isHidden, bottomBarState, pauseTimer]);

  useEffect(() => {
    if (isReady) {
      // Keep the current solved prompt frozen even if adaptive difficulty changes.
      // The next prompt should only be generated after explicit continue.
      setPairData(buildTargetPairRef.current());
    }
  }, [isReady, selectionSignature]);

  const generateNewCharacter = useCallback(() => {
    if (!isReady) return;
    setPairData(buildTargetPairRef.current());
  }, [isReady]);

  const handleCheck = () => {
    if (
      isHidden ||
      composingRef.current ||
      bottomBarState === 'correct' ||
      justAnsweredRef.current
    )
      return;
    const trimmedInput = inputValue.trim();
    if (trimmedInput.length === 0) return;

    const isCorrect = isKanaInputAnswerCorrect({
      inputValue: trimmedInput,
      correctChar,
      targetChar,
      isReverse,
      altRomanjiMap,
      promptParts,
      answerParts,
    });

    playClick();

    if (isCorrect) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer(trimmedInput);
    }
  };

  const handleCorrectAnswer = () => {
    pauseTimer();
    const answerTimeMs = getElapsedTimeMs();
    addCorrectAnswerTime(answerTimeMs / 1000);
    // Track answer time for speed achievements (Requirements 6.1-6.5)
    recordAnswerTime(answerTimeMs);
    resetTimer();
    playCorrect();
    const kanaParts = isReverse ? answerParts : promptParts;
    kanaParts.forEach(char => {
      addCharacterToHistory(char);
      incrementCharacterScore(char, 'correct');
    });
    incrementCorrectAnswers();
    setScore(score + 1);

    triggerCrazyMode();
    promptParts.forEach(char => {
      adaptiveSelector.updateCharacterWeight(char, true);
    });
    kanaParts.forEach(char => {
      if (isHiragana(char)) incrementHiraganaCorrect();
      else if (isKatakana(char)) incrementKatakanaCorrect();
    });
    // Reset wrong streak on correct answer (Requirement 10.2)
    resetWrongStreak();
    recordTargetLengthCorrect();
    setBottomBarState('correct');
    justAnsweredRef.current = true;
    setTimeout(() => {
      justAnsweredRef.current = false;
    }, 300);
    logAttempt({
      questionId: correctChar,
      questionPrompt: correctChar,
      expectedAnswers: [String(targetChar)],
      userAnswer: inputValue.trim(),
      inputKind: 'type',
      isCorrect: true,
      timeTakenMs: answerTimeMs,
      extra: { isReverse },
    });
  };

  const handleWrongAnswer = (wrongInput: string) => {
    setLastWrongInput(wrongInput);
    setInputValue('');
    setWrongFeedbackSignal(prev => prev + 1);
    playErrorTwice();

    (isReverse ? answerParts : promptParts).forEach(char => {
      incrementCharacterScore(char, 'wrong');
    });
    incrementWrongAnswers();
    if (score - 1 < 0) {
      setScore(0);
    } else {
      setScore(score - 1);
    }
    triggerCrazyMode();
    const positionResults = evaluateKanaAdaptivePositions({
      promptChars: promptParts,
      answerParts,
      inputValue: wrongInput,
      isReverse,
      altRomanjiMap,
    });
    promptParts.forEach((char, index) => {
      adaptiveSelector.updateCharacterWeight(char, positionResults[index]);
    });
    incrementWrongStreak();
    recordTargetLengthWrong();
    setBottomBarState('wrong');
    logAttempt({
      questionId: correctChar,
      questionPrompt: correctChar,
      expectedAnswers: [String(targetChar)],
      userAnswer: wrongInput,
      inputKind: 'type',
      isCorrect: false,
      extra: { isReverse },
    });
  };

  const handleContinue = useCallback(() => {
    if (isHidden || justAnsweredRef.current) return;
    playClick();
    setInputValue('');
    generateNewCharacter();
    setBottomBarState('check');
    startTimer();
  }, [isHidden, playClick, generateNewCharacter, startTimer]);

  const _gameMode = isReverse ? 'reverse input' : 'input';
  const canCheck = inputValue.trim().length > 0 && bottomBarState !== 'correct';
  const showContinue = bottomBarState === 'correct';
  const _showFeedback = bottomBarState !== 'check';
  const clearWrongFeedback = () => {
    if (bottomBarState === 'wrong') {
      setClearWrongFeedbackSignal(prev => prev + 1);
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center gap-4 sm:w-4/5 sm:gap-10',
        isHidden ? 'hidden' : '',
      )}
    >
      {/* <GameIntel gameMode={gameMode} /> */}
      <div
        className={cn(
          'flex max-w-full flex-row items-center gap-1',
          isGlassMode && 'rounded-xl bg-(--card-color) px-4 py-2',
        )}
      >
        <motion.p
          className='max-w-full text-center text-6xl leading-snug font-medium wrap-anywhere sm:text-8xl'
          lang={isReverse ? 'en' : 'ja'}
          initial={reducedMotion ? false : { opacity: 0, x: 30, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 150,
            damping: 20,
            mass: 1,
            duration: 0.5,
          }}
          key={correctChar}
        >
          {correctChar}
        </motion.p>
      </div>
      <p
        id='kana-answer-hint'
        className='text-center text-sm text-(--secondary-color)'
      >
        {t(
          isReverse
            ? 'modes.description.reverseInput'
            : 'modes.description.input',
        )}
      </p>
      <textarea
        ref={inputRef}
        value={inputValue}
        aria-label={t('game.answerLabel')}
        aria-describedby='kana-answer-hint'
        placeholder={t('game.answerPlaceholder')}
        autoCapitalize='none'
        autoCorrect='off'
        autoComplete='off'
        spellCheck={false}
        enterKeyHint='done'
        lang={isReverse ? 'ja' : 'en'}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        disabled={showContinue}
        rows={4}
        className={clsx(
          'w-full max-w-xs sm:max-w-sm md:max-w-md',
          'rounded-3xl px-5 py-4',
          'border-4 border-(--border-color) bg-(--card-color)',
          'text-top text-left text-lg font-medium lg:text-xl',
          'text-(--secondary-color) placeholder:text-base placeholder:font-normal placeholder:text-(--secondary-color)',
          'game-input resize-none focus:border-(--secondary-color)/70 focus:text-(--main-color) focus:outline-none',
          'transition-colors duration-200 ease-out',
          showContinue && 'cursor-not-allowed opacity-60',
        )}
        onChange={e => {
          setInputValue(e.target.value);
          clearWrongFeedback();
        }}
        onFocus={clearWrongFeedback}
        onKeyDown={e => {
          if (
            e.nativeEvent.isComposing ||
            e.nativeEvent.keyCode === 229 ||
            composingRef.current ||
            e.repeat
          )
            return;
          if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim().length > 0 && bottomBarState !== 'correct') {
              handleCheck();
            }
          }
        }}
      />
      <Stars />

      <GameBottomBar
        state={bottomBarState}
        onAction={showContinue ? handleContinue : handleCheck}
        canCheck={canCheck}
        feedbackContent={targetChar}
        buttonRef={buttonRef}
        hideRetry
        clearWrongFeedbackSignal={clearWrongFeedbackSignal}
        wrongFeedbackSignal={wrongFeedbackSignal}
      />

      {/* Spacer */}
      <div className='h-32' />
    </div>
  );
};

export default InputGame;
