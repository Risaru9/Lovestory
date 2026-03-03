// --- GAME TYPES ---

export type GameMode = 'classic' | 'timeAttack' | 'survival' | 'chaos';

export type HeartType = 
  | 'good' 
  | 'bad' 
  | 'golden' 
  | 'freeze' 
  | 'speed' 
  | 'slow' 
  | 'bomb' 
  | 'rainbow' 
  | 'magnet' 
  | 'shield';

export type EffectType = 'freeze' | 'speed' | 'slow' | 'magnet' | 'shield' | 'double';

export interface Heart {
  id: number;
  x: number;
  y: number;
  type: HeartType;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
  scale: number;
  rotation: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'star';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  scale: number;
}

export interface ActiveEffect {
  id: EffectType;
  name: string;
  duration: number;
  maxDuration: number;
  category: 'TIME' | 'SPEED' | 'MAGNET' | 'SHIELD' | 'SCORE';
  onStart: () => void;
  onEnd: () => void;
  icon: string;
}

export interface ModeConfig {
  id: GameMode;
  name: string;
  description: string;
  timeLimit: number;
  lives: number;
  spawnRate: number;
  speedMultiplier: number;
  badHeartChance: number;
  specialHeartChance: number;
  background: string;
  goals: string[];
  challenges: string[];
}

export interface HeartConfig {
  type: HeartType;
  name: string;
  points: number;
  effect: EffectType | null;
  effectDuration: number;
  spawnWeight: number;
  description: string;
}

export const HEART_CONFIGS: Record<HeartType, HeartConfig> = {
  good: {
    type: 'good',
    name: 'Love Heart',
    points: 10,
    effect: null,
    effectDuration: 0,
    spawnWeight: 50,
    description: 'Basic heart, collect for points!'
  },
  bad: {
    type: 'bad',
    name: 'Dark Heart',
    points: -50,
    effect: null,
    effectDuration: 0,
    spawnWeight: 15,
    description: 'Avoid! Loses points and breaks combo!'
  },
  golden: {
    type: 'golden',
    name: 'Golden Heart',
    points: 100,
    effect: 'double',
    effectDuration: 5000,
    spawnWeight: 5,
    description: 'Rare! High points + double score!'
  },
  freeze: {
    type: 'freeze',
    name: 'Frozen Heart',
    points: 5,
    effect: 'freeze',
    effectDuration: 3000,
    spawnWeight: 8,
    description: 'Freezes time countdown!'
  },
  speed: {
    type: 'speed',
    name: 'Speed Heart',
    points: 5,
    effect: 'speed',
    effectDuration: 4000,
    spawnWeight: 8,
    description: 'Move super fast!'
  },
  slow: {
    type: 'slow',
    name: 'Slow Heart',
    points: 5,
    effect: 'slow',
    effectDuration: 3000,
    spawnWeight: 8,
    description: 'Movement slowed down...'
  },
  bomb: {
    type: 'bomb',
    name: 'Bomb Heart',
    points: -100,
    effect: null,
    effectDuration: 0,
    spawnWeight: 5,
    description: 'EXPLOSIVE! Avoid at all costs!'
  },
  rainbow: {
    type: 'rainbow',
    name: 'Rainbow Heart',
    points: 200,
    effect: 'double',
    effectDuration: 8000,
    spawnWeight: 2,
    description: 'ULTRA RARE! Massive points!'
  },
  magnet: {
    type: 'magnet',
    name: 'Magnet Heart',
    points: 15,
    effect: 'magnet',
    effectDuration: 5000,
    spawnWeight: 6,
    description: 'Attracts nearby hearts!'
  },
  shield: {
    type: 'shield',
    name: 'Shield Heart',
    points: 15,
    effect: 'shield',
    effectDuration: 6000,
    spawnWeight: 6,
    description: 'Protects from bad hearts!'
  }
};

export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  classic: {
    id: 'classic',
    name: 'CLASSIC',
    description: 'The traditional heart catching experience',
    timeLimit: 60,
    lives: 3,
    spawnRate: 800,
    speedMultiplier: 1,
    badHeartChance: 0.15,
    specialHeartChance: 0.2,
    background: '/images/backgrounds/bg_classic.png',
    goals: [
      'Catch as many hearts as possible in 60 seconds',
      'Build combos by catching hearts quickly',
      'Avoid dark hearts to keep your score'
    ],
    challenges: [
      'Hearts fall faster as time progresses',
      'Bad hearts appear more frequently at higher levels',
      'One life lost per missed heart (in survival)'
    ]
  },
  timeAttack: {
    id: 'timeAttack',
    name: 'TIME ATTACK',
    description: 'Race against the clock!',
    timeLimit: 30,
    lives: 1,
    spawnRate: 400,
    speedMultiplier: 1.5,
    badHeartChance: 0.2,
    specialHeartChance: 0.25,
    background: '/images/backgrounds/bg_timeattack.png',
    goals: [
      'Score as many points as possible in 30 seconds',
      'Golden hearts give time bonuses!',
      'Maintain high combos for multipliers'
    ],
    challenges: [
      'Extremely fast spawn rate',
      'Only 1 life - no room for mistakes',
      'Hearts fall at 1.5x speed'
    ]
  },
  survival: {
    id: 'survival',
    name: 'SURVIVAL',
    description: 'How long can you last?',
    timeLimit: 9999,
    lives: 3,
    spawnRate: 600,
    speedMultiplier: 1.2,
    badHeartChance: 0.25,
    specialHeartChance: 0.3,
    background: '/images/backgrounds/bg_survival.png',
    goals: [
      'Survive as long as possible',
      'Missing a good heart costs 1 life',
      'Catch special hearts to recover lives'
    ],
    challenges: [
      'Infinite gameplay - difficulty increases over time',
      'Missing hearts is penalized heavily',
      'More bad hearts spawn over time'
    ]
  },
  chaos: {
    id: 'chaos',
    name: 'CHAOS MODE',
    description: 'Expect the unexpected!',
    timeLimit: 45,
    lives: 3,
    spawnRate: 250,
    speedMultiplier: 2,
    badHeartChance: 0.35,
    specialHeartChance: 0.4,
    background: '/images/backgrounds/bg_chaos.png',
    goals: [
      'Survive 45 seconds of pure chaos',
      'Random events occur every 10 seconds',
      'Adapt to rapidly changing conditions'
    ],
    challenges: [
      'Hearts spawn at insane rates',
      'Random screen flips and shakes',
      'All heart types appear frequently',
      'Speed changes randomly'
    ]
  }
};

export const EFFECT_BACKGROUNDS: Record<EffectType, string> = {
  freeze: '/images/backgrounds/bg_freeze.png',
  speed: '/images/backgrounds/bg_speed.png',
  slow: '/images/backgrounds/bg_slow.png',
  magnet: '/images/backgrounds/bg_classic.png',
  shield: '/images/backgrounds/bg_classic.png',
  double: '/images/backgrounds/bg_classic.png'
};
