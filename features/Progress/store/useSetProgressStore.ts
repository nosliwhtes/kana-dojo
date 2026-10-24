'use client';

import localforage from 'localforage';
import { create } from 'zustand';

import {
  KANJI_SET_PROGRESS_CAP,
  VOCAB_MEANING_PROGRESS_CAP,
  VOCAB_READING_PROGRESS_CAP,
} from '@/features/Progress/lib/setProgress';

export interface AllTimeSetProgress {
  version: 1;
  updatedAt: number;
  kanji: Record<string, { correct: number }>;
  vocabulary: Record<
    string,
    { meaningCorrect: number; readingCorrect: number }
  >;
}

interface SetProgressState {
  isHydrated: boolean;
  persistenceError: boolean;
  data: AllTimeSetProgress;
  hydrate: () => Promise<void>;
  recordKanjiProgress: (kanjiChar: string) => Promise<void>;
  recordVocabularyProgress: (
    word: string,
    questionType: 'meaning' | 'reading',
  ) => Promise<void>;
  clearSetProgress: () => Promise<void>;
}

const STORAGE_KEY = 'kanadojo-set-progress-v1';

const setProgressStore = localforage.createInstance({
  name: 'kanadojo',
  storeName: 'set_progress',
});

const createDefaultSetProgress = (): AllTimeSetProgress => ({
  version: 1,
  updatedAt: Date.now(),
  kanji: {},
  vocabulary: {},
});

function validCount(value: unknown, cap: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(cap, Math.max(0, Math.floor(value)))
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function loadPersistedSetProgress(): Promise<AllTimeSetProgress> {
  const data = await setProgressStore.getItem<unknown>(STORAGE_KEY);
  if (!isRecord(data) || data.version !== 1) return createDefaultSetProgress();
  return {
    version: 1,
    updatedAt:
      typeof data.updatedAt === 'number' && Number.isFinite(data.updatedAt)
        ? data.updatedAt
        : Date.now(),
    kanji: Object.fromEntries(
      Object.entries(isRecord(data.kanji) ? data.kanji : {}).map(
        ([key, entry]) => [
          key,
          {
            correct: validCount(
              isRecord(entry) ? entry.correct : undefined,
              KANJI_SET_PROGRESS_CAP,
            ),
          },
        ],
      ),
    ),
    vocabulary: Object.fromEntries(
      Object.entries(isRecord(data.vocabulary) ? data.vocabulary : {}).map(
        ([key, entry]) => [
          key,
          {
            meaningCorrect: validCount(
              isRecord(entry) ? entry.meaningCorrect : undefined,
              VOCAB_MEANING_PROGRESS_CAP,
            ),
            readingCorrect: validCount(
              isRecord(entry) ? entry.readingCorrect : undefined,
              VOCAB_READING_PROGRESS_CAP,
            ),
          },
        ],
      ),
    ),
  };
}

// Keep IndexedDB writes ordered. Each returned promise covers its write, rather
// than acknowledging an answer while its only copy is in a debounce timer.
let writeQueue: Promise<unknown> = Promise.resolve();
function persistSetProgressNow(data: AllTimeSetProgress): Promise<unknown> {
  const write = writeQueue.then(() =>
    setProgressStore.setItem(STORAGE_KEY, data),
  );
  writeQueue = write.catch(() => undefined);
  return write;
}

let hydrationGeneration = 0;
let hydrationPromise: Promise<void> | null = null;

const useSetProgressStore = create<SetProgressState>((set, get) => ({
  isHydrated: false,
  persistenceError: false,
  data: createDefaultSetProgress(),

  hydrate: async () => {
    if (get().isHydrated) return;
    if (hydrationPromise) return hydrationPromise;

    const generation = hydrationGeneration;
    hydrationPromise = (async () => {
      try {
        const data = await loadPersistedSetProgress();
        if (generation === hydrationGeneration)
          set({ data, isHydrated: true, persistenceError: false });
      } catch {
        // A transient read failure must not turn existing disk data into an
        // empty database on the next answer. Allow hydration to retry.
        if (generation === hydrationGeneration) set({ persistenceError: true });
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },

  recordKanjiProgress: async kanjiChar => {
    if (!kanjiChar) return;
    const generation = hydrationGeneration;
    if (!get().isHydrated) {
      await get().hydrate();
    }
    if (!get().isHydrated || generation !== hydrationGeneration) return;

    let nextData = get().data;
    let didChange = false;

    set(state => {
      const current = state.data.kanji[kanjiChar] ?? { correct: 0 };
      const nextCorrect = Math.min(current.correct + 1, KANJI_SET_PROGRESS_CAP);

      if (nextCorrect === current.correct) {
        nextData = state.data;
        return state;
      }

      didChange = true;
      nextData = {
        ...state.data,
        updatedAt: Date.now(),
        kanji: {
          ...state.data.kanji,
          [kanjiChar]: { correct: nextCorrect },
        },
      };

      return { data: nextData };
    });

    if (!didChange && !get().persistenceError) {
      return;
    }

    try {
      await persistSetProgressNow(nextData);
      set({ persistenceError: false });
    } catch {
      set({ persistenceError: true });
    }
  },

  recordVocabularyProgress: async (word, questionType) => {
    if (!word) return;
    const generation = hydrationGeneration;
    if (!get().isHydrated) {
      await get().hydrate();
    }
    if (!get().isHydrated || generation !== hydrationGeneration) return;

    let nextData = get().data;
    let didChange = false;

    set(state => {
      const current = state.data.vocabulary[word] ?? {
        meaningCorrect: 0,
        readingCorrect: 0,
      };

      const nextEntry =
        questionType === 'meaning'
          ? {
              ...current,
              meaningCorrect: Math.min(
                current.meaningCorrect + 1,
                VOCAB_MEANING_PROGRESS_CAP,
              ),
            }
          : {
              ...current,
              readingCorrect: Math.min(
                current.readingCorrect + 1,
                VOCAB_READING_PROGRESS_CAP,
              ),
            };

      const isUnchanged =
        nextEntry.meaningCorrect === current.meaningCorrect &&
        nextEntry.readingCorrect === current.readingCorrect;

      if (isUnchanged) {
        nextData = state.data;
        return state;
      }

      didChange = true;
      nextData = {
        ...state.data,
        updatedAt: Date.now(),
        vocabulary: {
          ...state.data.vocabulary,
          [word]: nextEntry,
        },
      };

      return { data: nextData };
    });

    if (!didChange && !get().persistenceError) {
      return;
    }

    try {
      await persistSetProgressNow(nextData);
      set({ persistenceError: false });
    } catch {
      set({ persistenceError: true });
    }
  },

  clearSetProgress: async () => {
    hydrationGeneration += 1;
    const data = createDefaultSetProgress();
    set({ data, isHydrated: true });
    try {
      await persistSetProgressNow(data);
      set({ persistenceError: false });
    } catch {
      set({ persistenceError: true });
    }
  },
}));

if (typeof window !== 'undefined') {
  void useSetProgressStore.getState().hydrate();
}

export default useSetProgressStore;
