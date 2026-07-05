import type { Chapter, Song, Character, Photo } from '@/types';

// Seluruh data kisah statis lama telah dihapus agar webapp sepenuhnya dinamis untuk seluruh pasangan.
export const chapters: Chapter[] = [];

export const songs: Song[] = [];

export const characters: Character[] = [
  {
    name: 'Aku',
    level: 99,
    hp: 'Infinite',
    mp: '100%',
    class: 'Soulmate',
    sprite: '/images/sprites/char-boy.png',
  },
  {
    name: 'Kamu',
    level: 99,
    hp: 'Infinite',
    mp: '100%',
    class: 'Partner',
    sprite: '/images/sprites/char-girl.png',
  },
];

export const photos: Photo[] = [];

export const getChapterById = (_id: number): Chapter | undefined => {
  return undefined;
};

export const getUnlockedChapters = (): Chapter[] => {
  return [];
};

export const getCompletedChapters = (): Chapter[] => {
  return [];
};
