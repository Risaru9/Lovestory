const STORAGE_KEY = 'journey-completed-chapters';
export const JOURNEY_PROGRESS_EVENT = 'journey-progress-updated';

const normalizeIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  const uniqueIds = new Set<number>();

  value.forEach((item) => {
    const parsed = Number(item);
    if (Number.isInteger(parsed) && parsed > 0) {
      uniqueIds.add(parsed);
    }
  });

  return Array.from(uniqueIds).sort((a, b) => a - b);
};

const emitProgressUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(JOURNEY_PROGRESS_EVENT));
};

const saveCompletedChapterIds = (ids: number[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  emitProgressUpdated();
};

export const getCompletedChapterIds = (): number[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeIds(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const markChapterAsCompleted = (chapterId: number): number[] => {
  if (typeof window === 'undefined') return [];

  const current = getCompletedChapterIds();
  if (current.includes(chapterId)) return current;

  const updated = normalizeIds([...current, chapterId]);
  saveCompletedChapterIds(updated);
  return updated;
};

export const clearCompletedChapters = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitProgressUpdated();
};

export const getUnlockedChapterIdsInOrder = (
  orderedChapterIds: number[],
  completedIds: number[]
): number[] => {
  if (orderedChapterIds.length === 0) return [];

  const completedSet = new Set(completedIds);
  const unlocked: number[] = [];

  for (let index = 0; index < orderedChapterIds.length; index += 1) {
    const currentId = orderedChapterIds[index];

    if (index === 0) {
      unlocked.push(currentId);
      continue;
    }

    const previousId = orderedChapterIds[index - 1];

    if (completedSet.has(previousId)) {
      unlocked.push(currentId);
    } else {
      break;
    }
  }

  return unlocked;
};

export const isChapterUnlocked = (
  orderedChapterIds: number[],
  chapterId: number,
  completedIds: number[]
): boolean => {
  const unlockedIds = getUnlockedChapterIdsInOrder(orderedChapterIds, completedIds);
  return unlockedIds.includes(chapterId);
};