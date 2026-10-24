# Progress & Star System

## Overview

KanaDojo tracks learning progress with **progress bars** and a **star system** (up to 3 stars per level/group). Progress is always shown as 0–100% per level. Stars indicate how many times that level has been fully completed.

Both progress and stars are **derived mathematically** from the same stored counters — no separate star storage or destructive counter resets.

## Constants

| Constant                                                    | Value   | Purpose                                   |
| ----------------------------------------------------------- | ------- | ----------------------------------------- |
| `MAX_STARS_PER_SET`                                         | 3       | Maximum stars per set                     |
| `KANJI_SET_PROGRESS_TARGET`                                 | 10      | Correct answers per character per star    |
| `KANJI_SET_PROGRESS_CAP`                                    | 30      | Stored counter cap                        |
| `VOCAB_MEANING_PROGRESS_TARGET`                             | 5       | Correct meaning answers per word per star |
| `VOCAB_READING_PROGRESS_TARGET`                             | 5       | Correct reading answers per word per star |
| `VOCAB_MEANING_PROGRESS_CAP` / `VOCAB_READING_PROGRESS_CAP` | 15 each | Stored counter caps                       |
| `KANA_ROW_MASTERY_TARGET`                                   | 50      | Correct answers per kana per star         |
| `KANA_ROW_MASTERY_CAP`                                      | 100     | Effective display cap                     |

All constants are defined in `features/Progress/lib/setProgress.ts`.

All caps use `TARGET × MAX_STARS_PER_SET`. Changing a target value automatically adjusts the cap.

## How Progress Bars Work

Each item (kanji character, vocabulary word, or kana character) has a stored `correct` counter raised by one each time the user answers correctly. The progress bar for a set/group shows how close the group is to the per-cycle target.

### Formula

```
For a set with N items, each requiring `target` correct per cycle:

maxPerItem = target × MAX_STARS_PER_SET   // 3 cycles worth
earned     = sum(min(item.count, maxPerItem))
cycleTarget = N × target
cappedEarned = min(earned, cycleTarget × MAX_STARS_PER_SET)

stars  = min(floor(cappedEarned / cycleTarget), MAX_STARS_PER_SET)
        // 0, 1, 2, or 3

progress = (cappedEarned − stars × cycleTarget) / cycleTarget
        // 0.0 → 1.0 (wraps around at each star boundary)

At MAX_STARS_PER_SET (3 stars), progress stays at 1.0 (100%).
```

The denominator `cycleTarget = N × target` never changes — the number of correct answers needed to fill the bar once is the same regardless of stars. Stars just track how many full cycles have been completed.

### Example (Kanji, 10 characters, target=10)

| Total correct earned | stars | Display progress         |
| -------------------- | ----- | ------------------------ |
| 0                    | 0     | 0%                       |
| 50                   | 0     | 50%                      |
| 100                  | 1     | 0% (wraps, star awarded) |
| 150                  | 1     | 50%                      |
| 200                  | 2     | 0% (wraps, star awarded) |
| 250                  | 2     | 50%                      |
| 300                  | 3     | 100% (fully mastered)    |

## Storage

### Kanji & Vocabulary counters

File: `features/Progress/store/useSetProgressStore.ts`

- Persisted via **localforage** (IndexedDB) under key `kanadojo-set-progress-v1`
- Shape: `{ kanji: Record<string, { correct }>, vocabulary: Record<string, { meaningCorrect, readingCorrect }> }`
- The `recordKanjiProgress` / `recordVocabularyProgress` actions cap at `TARGET × MAX_STARS_PER_SET` (e.g., 30 for kanji)
- Hydrated on app boot via `useSetProgressHydration()`
- Writes start on each answer and are serialized. Each action awaits its write attempt; failed writes retain in-memory data and set `persistenceError` for retry. Reset invalidates pending hydration and pre-reset answers.

### Kana counters

File: `features/Progress/store/useStatsStore.ts`

- Persisted via **Zustand persist** (localStorage) under key `kanadojo-stats`
- Shape in `allTimeStats.characterMastery`: `Record<string, { correct, incorrect }>`
- Correct counts are unbounded — no cap in storage, only in display math
- **Live persistence**: `incrementCharacterScore` updates `characterMastery` immediately (reactive), persisted with a 2-second debounce and flushed on pagehide/hidden visibility. Lifecycle events reduce loss on navigation but cannot guarantee durability after a process/OS termination or persistent storage failure.
- `characterScores` (in-memory) is still maintained for session logging and achievements via `saveSession()`, but the `characterMastery` merge loop has been removed from `saveSession` since it's now redundant.

## Data Flow

### Kanji / Vocabulary

```
user answers correctly
    ↓
useSetProgressStore.recordKanjiProgress(char)
    or recordVocabularyProgress(word, type)
    ↓ (stored in IndexedDB, capped at target × 3)
KanjiCards / VocabCards reads kanjiProgress / vocabularyProgress
    ↓
calculateKanjiSetProgressAndStars(entries) → { progress, stars }
    or calculateVocabularySetProgressAndStars(entries) → { progress, stars }
    ↓
LevelSetCards receives getSetProgress / getSetStars props
    ↓
MasteryBar renders bar at `percent`% + `stars` Star icons below
```

### Kana

```
user answers correctly
    ↓
useStatsStore.incrementCharacterScore(char, 'correct')
    ↓ (accumulated unbounded in characterMastery)
SubsetNew reads characterMastery
    ↓
getRowProgressAndStars(rowKana) → { progress, stars }
    ↓ (inline calculation in SubsetNew)
MasteryBar renders bar at `percent`% + `stars` Star icons below
```

## Functions

File: `features/Progress/lib/setProgress.ts`

| Function                                 | Input                          | Returns               | Used by            |
| ---------------------------------------- | ------------------------------ | --------------------- | ------------------ |
| `calculateKanjiSetProgress`              | `KanjiSetProgressEntry[]`      | `number` (0–1)        | Legacy (unchanged) |
| `calculateVocabularySetProgress`         | `VocabularySetProgressEntry[]` | `number` (0–1)        | Legacy (unchanged) |
| `calculateKanjiSetProgressAndStars`      | `KanjiSetProgressEntry[]`      | `{ progress, stars }` | KanjiCards         |
| `calculateVocabularySetProgressAndStars` | `VocabularySetProgressEntry[]` | `{ progress, stars }` | VocabCards         |

Kana uses an inline equivalent `getRowProgressAndStars` in `SubsetNew.tsx`.

## Dev Seeding

In `development` mode only, `LevelSetCards.tsx` hardcodes the star display for levels 1–3:

| `levelNumber` | Stars shown |
| ------------- | ----------- |
| 1             | 1 star      |
| 2             | 2 stars     |
| 3             | 3 stars     |

This override happens at render time in `LevelSetCards.tsx` via a `process.env.NODE_ENV` check on the `setTemp.levelNumber`. It is completely independent of actual progress stats. All other levels use real progress data normally.
