export interface Chapter {
  id: number;
  month: number;
  title: string;
  date: string;
  description: string;
  story: string;
  achievement: string;
  image: string;
  unlocked: boolean;
  completed: boolean;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  src: string;
  caption: string;
  category: 'date' | 'travel' | 'food' | 'selfie' | 'other';
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  duration: string;
  src: string;
}

export interface Character {
  name: string;
  level: number;
  hp: string;
  mp: string;
  class: string;
  sprite: string;
}

export interface GameState {
  currentChapter: number;
  unlockedChapters: number[];
  completedChapters: number[];
  highScore: number;
  replyLetter: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}
