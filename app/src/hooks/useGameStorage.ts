import { useState, useEffect, useCallback } from 'react';
import type { GameMode } from '@/types/game';

export interface StoredGameState {
  // High scores for each mode
  highScoreClassic: number;
  highScoreTimeAttack: number;
  highScoreSurvival: number;
  highScoreChaos: number;
  
  // Statistics
  totalGamesPlayed: number;
  totalHeartsCaught: number;
  totalTimePlayed: number;
  maxComboEver: number;
  
  // Achievements
  achievements: string[];
  
  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  particleIntensity: 'low' | 'medium' | 'high';
}

const DEFAULT_STATE: StoredGameState = {
  highScoreClassic: 0,
  highScoreTimeAttack: 0,
  highScoreSurvival: 0,
  highScoreChaos: 0,
  totalGamesPlayed: 0,
  totalHeartsCaught: 0,
  totalTimePlayed: 0,
  maxComboEver: 0,
  achievements: [],
  soundEnabled: true,
  musicEnabled: true,
  particleIntensity: 'high'
};

const STORAGE_KEY = 'heartCatcherGameState';

export function useGameStorage() {
  const [gameState, setGameState] = useState<StoredGameState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setGameState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      } catch (error) {
        console.error('Failed to save game state:', error);
      }
    }
  }, [gameState, isLoaded]);

  const updateHighScore = useCallback((mode: GameMode, score: number) => {
    const key = `highScore${mode.charAt(0).toUpperCase() + mode.slice(1)}` as keyof StoredGameState;
    setGameState(prev => {
      const currentHigh = prev[key] as number;
      if (score > currentHigh) {
        return { ...prev, [key]: score };
      }
      return prev;
    });
  }, []);

  const getHighScore = useCallback((mode: GameMode): number => {
    const key = `highScore${mode.charAt(0).toUpperCase() + mode.slice(1)}` as keyof StoredGameState;
    return gameState[key] as number;
  }, [gameState]);

  const incrementGamesPlayed = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      totalGamesPlayed: prev.totalGamesPlayed + 1
    }));
  }, []);

  const updateStats = useCallback((stats: Partial<StoredGameState>) => {
    setGameState(prev => ({ ...prev, ...stats }));
  }, []);

  const addAchievement = useCallback((achievement: string) => {
    setGameState(prev => {
      if (prev.achievements.includes(achievement)) return prev;
      return {
        ...prev,
        achievements: [...prev.achievements, achievement]
      };
    });
  }, []);

  const toggleSetting = useCallback((setting: 'soundEnabled' | 'musicEnabled') => {
    setGameState(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  }, []);

  const setParticleIntensity = useCallback((intensity: 'low' | 'medium' | 'high') => {
    setGameState(prev => ({
      ...prev,
      particleIntensity: intensity
    }));
  }, []);

  const resetAllData = useCallback(() => {
    setGameState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    gameState,
    isLoaded,
    updateHighScore,
    getHighScore,
    incrementGamesPlayed,
    updateStats,
    addAchievement,
    toggleSetting,
    setParticleIntensity,
    resetAllData
  };
}
