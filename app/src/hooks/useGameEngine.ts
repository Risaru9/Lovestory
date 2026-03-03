import { useRef, useCallback, useState, useEffect } from 'react';
import type { 
  GameMode, 
  Heart, 
  Particle, 
  FloatingText, 
  ActiveEffect, 
  EffectType,
  HeartType
} from '@/types/game';
import { MODE_CONFIGS, HEART_CONFIGS, EFFECT_BACKGROUNDS } from '@/types/game';
import { useSoundSystem, type SoundEffect } from './useSoundSystem';

interface GameState {
  score: number;
  lives: number;
  timeLeft: number;
  level: number;
  combo: number;
  maxCombo: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  activeEffects: ActiveEffect[];
  hearts: Heart[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  playerX: number;
  heartsCaught: number;
  heartsMissed: number;
}

interface UIState {
  score: number;
  lives: number;
  timeLeft: number;
  level: number;
  combo: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  activeEffects: ActiveEffect[];
  playerX: number;
  screenShake: number;
  screenFlip: boolean;
  hearts: Heart[];
  particles: Particle[];
  floatingTexts: FloatingText[];
}

interface GameEngineOptions {
  mode: GameMode;
  soundEnabled: boolean;
  onGameOver: (stats: { score: number; heartsCaught: number; maxCombo: number; timePlayed: number }) => void;
}

export function useGameEngine(options: GameEngineOptions) {
  const { mode, soundEnabled, onGameOver } = options;
  const { playSound } = useSoundSystem({ enabled: soundEnabled });
  
  const config = MODE_CONFIGS[mode];
  
  // Game state refs (for engine)
  const stateRef = useRef<GameState>({
    score: 0,
    lives: config.lives,
    timeLeft: config.timeLimit,
    level: 1,
    combo: 0,
    maxCombo: 0,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    activeEffects: [],
    hearts: [],
    particles: [],
    floatingTexts: [],
    playerX: 50,
    heartsCaught: 0,
    heartsMissed: 0
  });

  // Physics refs
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const lastCatchTimeRef = useRef<number>(0);
  const chaosEventTimerRef = useRef<number>(0);
  
  // Effect multipliers
  const speedMultiplierRef = useRef<number>(1);
  const isTimeFrozenRef = useRef<boolean>(false);
  const magnetRadiusRef = useRef<number>(0);
  const hasShieldRef = useRef<boolean>(false);
  const scoreMultiplierRef = useRef<number>(1);
  const screenShakeRef = useRef<number>(0);
  const screenFlipRef = useRef<boolean>(false);

  // Keyboard Controller Ref
  const keysPressedRef = useRef<Set<string>>(new Set());

  // React state (for UI)
  const [uiState, setUiState] = useState<UIState>({
    score: 0,
    lives: config.lives,
    timeLeft: config.timeLimit,
    level: 1,
    combo: 0,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    activeEffects: [],
    playerX: 50,
    screenShake: 0,
    screenFlip: false,
    hearts: [],
    particles: [],
    floatingTexts: []
  });

  // Setup Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update UI from refs
  const syncUI = useCallback(() => {
    const state = stateRef.current;
    setUiState({
      score: state.score,
      lives: state.lives,
      timeLeft: Math.ceil(state.timeLeft),
      level: state.level,
      combo: state.combo,
      isPlaying: state.isPlaying,
      isPaused: state.isPaused,
      isGameOver: state.isGameOver,
      activeEffects: [...state.activeEffects],
      playerX: state.playerX,
      screenShake: screenShakeRef.current,
      screenFlip: screenFlipRef.current,
      hearts: [...state.hearts],
      particles: [...state.particles],
      floatingTexts: [...state.floatingTexts]
    });
  }, []);

  // Initialize game
  const initGame = useCallback(() => {
    stateRef.current = {
      score: 0,
      lives: config.lives,
      timeLeft: config.timeLimit,
      level: 1,
      combo: 0,
      maxCombo: 0,
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      activeEffects: [],
      hearts: [],
      particles: [],
      floatingTexts: [],
      playerX: 50,
      heartsCaught: 0,
      heartsMissed: 0
    };
    
    speedMultiplierRef.current = 1;
    isTimeFrozenRef.current = false;
    magnetRadiusRef.current = 0;
    hasShieldRef.current = false;
    scoreMultiplierRef.current = 1;
    screenShakeRef.current = 0;
    screenFlipRef.current = false;
    
    lastTimeRef.current = 0;
    spawnTimerRef.current = 0;
    lastCatchTimeRef.current = 0;
    chaosEventTimerRef.current = 0;
    keysPressedRef.current.clear(); // Reset tombol saat mulai
    
    playSound('game_start');
    syncUI();
  }, [config, playSound, syncUI]);

  // Spawn particle effect
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 10, shape: Particle['shape'] = 'circle') => {
    const state = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      state.particles.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 5,
        shape
      });
    }
  }, []);

  // Spawn floating text
  const spawnFloatingText = useCallback((x: number, y: number, text: string, color: string) => {
    stateRef.current.floatingTexts.push({
      id: Math.random(),
      x,
      y,
      text,
      color,
      life: 1,
      maxLife: 1,
      vy: -1.5,
      scale: 1
    });
  }, []);

  // Get effect configuration
  const getEffectConfig = useCallback((type: EffectType) => {
    const configs: Record<EffectType, { name: string; category: ActiveEffect['category']; icon: string; onStart: () => void; onEnd: () => void }> = {
      freeze: {
        name: 'FREEZE',
        category: 'TIME',
        icon: '🧊',
        onStart: () => { isTimeFrozenRef.current = true; },
        onEnd: () => { isTimeFrozenRef.current = false; }
      },
      speed: {
        name: 'SPEED UP',
        category: 'SPEED',
        icon: '⚡',
        onStart: () => { speedMultiplierRef.current = 2.5; },
        onEnd: () => { speedMultiplierRef.current = 1; }
      },
      slow: {
        name: 'SLOW DOWN',
        category: 'SPEED',
        icon: '🐌',
        onStart: () => { speedMultiplierRef.current = 0.4; },
        onEnd: () => { speedMultiplierRef.current = 1; }
      },
      magnet: {
        name: 'MAGNET',
        category: 'MAGNET',
        icon: '🧲',
        onStart: () => { magnetRadiusRef.current = 150; },
        onEnd: () => { magnetRadiusRef.current = 0; }
      },
      shield: {
        name: 'SHIELD',
        category: 'SHIELD',
        icon: '🛡️',
        onStart: () => { hasShieldRef.current = true; },
        onEnd: () => { hasShieldRef.current = false; }
      },
      double: {
        name: '2X SCORE',
        category: 'SCORE',
        icon: '💎',
        onStart: () => { scoreMultiplierRef.current = 2; },
        onEnd: () => { scoreMultiplierRef.current = 1; }
      }
    };
    return configs[type];
  }, []);

  // Apply effect
  const applyEffect = useCallback((effectType: EffectType, duration: number) => {
    const state = stateRef.current;
    const effectConfig = getEffectConfig(effectType);
    
    // Remove conflicting effects
    state.activeEffects = state.activeEffects.filter(effect => {
      if (effectConfig.category === effect.category && effectConfig.category !== 'TIME') {
        effect.onEnd();
        return false;
      }
      return true;
    });

    // Create new effect
    const newEffect: ActiveEffect = {
      id: effectType,
      name: effectConfig.name,
      duration,
      maxDuration: duration,
      category: effectConfig.category,
      onStart: effectConfig.onStart,
      onEnd: effectConfig.onEnd,
      icon: effectConfig.icon
    };

    newEffect.onStart();
    state.activeEffects.push(newEffect);
    
    // Play sound
    playSound(`effect_${effectType}` as SoundEffect);
    
    syncUI();
  }, [getEffectConfig, playSound, syncUI]);

  // Handle heart collision
  const handleHeartCollision = useCallback((heart: Heart) => {
    const state = stateRef.current;
    const heartConfig = HEART_CONFIGS[heart.type];
    const now = Date.now();

    // Check combo
    if (now - lastCatchTimeRef.current < 1500 && heartConfig.points > 0) {
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      if (state.combo > 1 && state.combo % 5 === 0) {
        playSound('combo');
        spawnFloatingText(heart.x, heart.y - 10, `${state.combo}x COMBO!`, '#FFD700');
      }
    } else {
      state.combo = 1;
    }
    lastCatchTimeRef.current = now;

    // Calculate points with multipliers
    let points = heartConfig.points;
    if (points > 0) {
      const comboMultiplier = 1 + Math.floor(state.combo / 5) * 0.5;
      points = Math.floor(points * comboMultiplier * scoreMultiplierRef.current);
    }

    // Apply score
    state.score = Math.max(0, state.score + points);
    state.heartsCaught++;

    // Spawn particles and text
    const particleColors: Record<HeartType, string> = {
      good: '#FF69B4',
      bad: '#4B0082',
      golden: '#FFD700',
      freeze: '#00FFFF',
      speed: '#00FF00',
      slow: '#8B4513',
      bomb: '#FF0000',
      rainbow: '#FF00FF',
      magnet: '#C0C0C0',
      shield: '#00BFFF'
    };

    spawnParticles(heart.x, heart.y, particleColors[heart.type], 15, heart.type === 'golden' ? 'star' : 'circle');
    
    if (points !== 0) {
      spawnFloatingText(heart.x, heart.y - 20, points > 0 ? `+${points}` : `${points}`, points > 0 ? '#00FF00' : '#FF0000');
    }

    // Play sound
    const soundMap: Record<HeartType, SoundEffect> = {
      good: 'catch_good',
      bad: 'catch_bad',
      golden: 'catch_golden',
      freeze: 'catch_special',
      speed: 'catch_special',
      slow: 'catch_special',
      bomb: 'explosion',
      rainbow: 'catch_rainbow',
      magnet: 'catch_special',
      shield: 'catch_special'
    };
    playSound(soundMap[heart.type]);

    // Apply effect if any
    if (heartConfig.effect) {
      applyEffect(heartConfig.effect, heartConfig.effectDuration);
    }

    // Handle bad hearts
    if (heartConfig.points < 0) {
      if (hasShieldRef.current) {
        spawnFloatingText(heart.x, heart.y - 30, 'BLOCKED!', '#00BFFF');
      } else {
        state.lives--;
        screenShakeRef.current = 10;
        state.combo = 0;
        if (state.lives <= 0) {
          endGame();
          return;
        }
      }
    }

    // Level up check
    const newLevel = Math.floor(state.score / 300) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      playSound('level_up');
      spawnFloatingText(50, 30, 'LEVEL UP!', '#FFD700');
    }

    syncUI();
  }, [applyEffect, playSound, spawnFloatingText, spawnParticles, syncUI]);

  // End game
  const endGame = useCallback(() => {
    const state = stateRef.current;
    state.isPlaying = false;
    state.isGameOver = true;
    playSound('game_over');
    
    onGameOver({
      score: state.score,
      heartsCaught: state.heartsCaught,
      maxCombo: state.maxCombo,
      timePlayed: config.timeLimit - state.timeLeft
    });
    
    syncUI();
  }, [config.timeLimit, onGameOver, playSound, syncUI]);

  // Spawn heart
  const spawnHeart = useCallback(() => {
    const state = stateRef.current;
    const rand = Math.random();
    
    // Determine heart type based on weights
    const weights = Object.entries(HEART_CONFIGS).map(([type, config]) => ({
      type: type as HeartType,
      weight: config.spawnWeight,
      cumulative: 0
    }));
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let currentCumulative = 0;
    weights.forEach(w => {
      currentCumulative += w.weight;
      w.cumulative = currentCumulative / totalWeight;
    });

    const selectedType = weights.find(w => rand <= w.cumulative)?.type || 'good';
    
    // Adjust for mode
    const modeMultiplier = mode === 'chaos' ? 1.5 : mode === 'timeAttack' ? 1.3 : 1;
    
    state.hearts.push({
      id: Math.random(),
      x: 10 + Math.random() * 80,
      y: -10,
      type: selectedType,
      speed: (0.3 + Math.random() * 0.4 + state.level * 0.05) * config.speedMultiplier * modeMultiplier,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
      scale: 1,
      rotation: 0
    });
  }, [config.speedMultiplier, mode]);

  // Update game loop
  const update = useCallback((deltaTime: number) => {
    const state = stateRef.current;
    if (!state.isPlaying || state.isPaused) return;

    const dt = deltaTime / 16.67; // Normalize to 60fps

    // --- LOGIKA PERGERAKAN KEYBOARD ---
    const baseMoveSpeed = 1.8;
    const moveSpeed = baseMoveSpeed * speedMultiplierRef.current * dt;

    if (keysPressedRef.current.has('arrowleft') || keysPressedRef.current.has('a')) {
      state.playerX = Math.max(5, state.playerX - moveSpeed);
    }
    if (keysPressedRef.current.has('arrowright') || keysPressedRef.current.has('d')) {
      state.playerX = Math.min(95, state.playerX + moveSpeed);
    }
    // ----------------------------------

    // Update timer
    if (config.timeLimit < 9999 && !isTimeFrozenRef.current) {
      state.timeLeft -= deltaTime / 1000;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        endGame();
        return;
      }
    }

    // Chaos mode events
    if (mode === 'chaos') {
      chaosEventTimerRef.current += deltaTime;
      if (chaosEventTimerRef.current > 10000) {
        chaosEventTimerRef.current = 0;
        // Random chaos event
        const events = ['shake', 'flip', 'speed_boost'] as const;
        const event = events[Math.floor(Math.random() * events.length)];
        
        switch (event) {
          case 'shake':
            screenShakeRef.current = 20;
            spawnFloatingText(50, 50, 'EARTHQUAKE!', '#FF0000');
            break;
          case 'flip':
            screenFlipRef.current = !screenFlipRef.current;
            setTimeout(() => { screenFlipRef.current = false; syncUI(); }, 3000);
            spawnFloatingText(50, 50, 'SCREEN FLIP!', '#FF00FF');
            break;
          case 'speed_boost':
            state.hearts.forEach(h => h.speed *= 2);
            spawnFloatingText(50, 50, 'SPEED SURGE!', '#FFFF00');
            break;
        }
      }
    }

    // Decay screen shake
    if (screenShakeRef.current > 0) {
      screenShakeRef.current *= 0.9;
      if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
    }

    // Spawn hearts
    spawnTimerRef.current += deltaTime;
    const currentSpawnRate = Math.max(200, config.spawnRate - state.level * 30);
    if (spawnTimerRef.current > currentSpawnRate) {
      spawnTimerRef.current = 0;
      spawnHeart();
    }

    // Update active effects
    state.activeEffects = state.activeEffects.filter(effect => {
      effect.duration -= deltaTime;
      if (effect.duration <= 0) {
        effect.onEnd();
        return false;
      }
      return true;
    });

    // Update hearts
    for (let i = state.hearts.length - 1; i >= 0; i--) {
      const heart = state.hearts[i];
      
      // Apply magnet effect
      if (magnetRadiusRef.current > 0) {
        const dx = state.playerX - heart.x;
        const dy = 90 - heart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < magnetRadiusRef.current / 5 && heart.type !== 'bad' && heart.type !== 'bomb') {
          heart.x += (dx / dist) * 2 * dt;
        }
      }

      // Update position
      heart.y += heart.speed * dt;
      heart.wobble += heart.wobbleSpeed * dt;
      heart.x += Math.sin(heart.wobble) * 0.3 * dt;
      heart.rotation = Math.sin(heart.wobble) * 15;

      // Check collision with player
      const playerY = 90;
      const dx = heart.x - state.playerX;
      const dy = heart.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 12) {
        handleHeartCollision(heart);
        state.hearts.splice(i, 1);
        continue;
      }

      // Check if missed
      if (heart.y > 105) {
        if (mode === 'survival' && HEART_CONFIGS[heart.type].points > 0) {
          state.lives--;
          spawnFloatingText(heart.x, 95, 'MISSED!', '#FF0000');
          if (state.lives <= 0) {
            endGame();
            return;
          }
        }
        state.heartsMissed++;
        state.hearts.splice(i, 1);
      }
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.1 * dt; // Gravity
      p.life -= 0.02 * dt;
      
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const t = state.floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= 0.015 * dt;
      
      if (t.life <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }

    syncUI();
  }, [config.spawnRate, config.timeLimit, endGame, handleHeartCollision, mode, spawnHeart, syncUI]);

  // Set player position
  const setPlayerX = useCallback((x: number) => {
    stateRef.current.playerX = Math.max(5, Math.min(95, x));
    syncUI();
  }, [syncUI]);

  // Pause/Resume
  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (state.isPlaying && !state.isGameOver) {
      state.isPaused = !state.isPaused;
      if (!state.isPaused) {
        lastTimeRef.current = performance.now();
      }
      playSound('pause');
      syncUI();
    }
  }, [playSound, syncUI]);

  // Quit game
  const quitGame = useCallback(() => {
    stateRef.current.isPlaying = false;
    syncUI();
  }, [syncUI]);

  // Get background
  const getBackground = useCallback(() => {
    const activeEffect = stateRef.current.activeEffects[0];
    if (activeEffect) {
      return EFFECT_BACKGROUNDS[activeEffect.id];
    }
    return config.background;
  }, [config.background]);

  return {
    state: uiState,
    initGame,
    update,
    setPlayerX,
    togglePause,
    quitGame,
    getBackground
  };
}