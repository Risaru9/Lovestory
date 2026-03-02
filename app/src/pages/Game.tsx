import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// --- TYPES ---
type GameMode = 'classic' | 'timeAttack' | 'survival' | 'chaos';
type HeartType = 'good' | 'bad' | 'golden' | 'freeze' | 'slow' | 'fast';

interface Heart {
  id: number;
  x: number;
  y: number;
  type: HeartType;
  speed: number;
  wobble: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface StoredGameState {
  highScore: number;
  highScoreTimeAttack: number;
  highScoreSurvival: number;
  highScoreChaos: number;
}

// --- CONSTANTS ---
const SPAWN_RATE_BASE = 1000;
const PLAYER_SIZE_PERCENT = 7; 

// --- BACKGROUND THEMES ---
const THEMES = {
  default: 'bg-gradient-to-b from-[#4B0082] to-[#1A1A2E]', // Ungu Gelap (Normal)
  freeze: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00F260] via-[#0575E6] to-[#021B79]', // Biru Es (Freeze)
  fast: 'bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-[#FZT700] via-[#11998e] to-[#38ef7d]', // Hijau Listrik (Cepat)
  slow: 'bg-gradient-to-b from-[#3E5151] to-[#DECBA4]', // Lumpur/Pasir (Lambat)
  chaos: 'bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]' // Merah/Oranye (Chaos/Damage)
};

const Game: React.FC = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useLocalStorage<StoredGameState>('gameState', { 
    highScore: 0, highScoreTimeAttack: 0, highScoreSurvival: 0, highScoreChaos: 0
  });

  // --- REACT STATE (UI) ---
  const [mode, setMode] = useState<GameMode>('classic');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // State UI
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [lives, setLives] = useState(3);
  const [activeEffectsDisplay, setActiveEffectsDisplay] = useState<string[]>([]); 
  const [gameOverStats, setGameOverStats] = useState({ score: 0, newRecord: false });
  const [showSecret, setShowSecret] = useState(false);
  
  // STATE BARU: Background Style
  const [bgStyle, setBgStyle] = useState<string>(THEMES.default);

  // --- REFS (Engine Data) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0); // FIX TS2554: Ditambahkan nilai awal 0
  const isPausedRef = useRef(false);

  // Physics
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const timeLeftRef = useRef(60);
  const levelRef = useRef(1);
  const playerXRef = useRef(50);
  
  // Objects
  const heartsRef = useRef<Heart[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Timers
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef(0);
  const comboRef = useRef(0);
  const lastCatchTimeRef = useRef(0);
  
  // Logic Buffs (Sistem Baru)
  const activeBuffsRef = useRef<Map<string, { duration: number, onEnd: () => void, category: string }>>(new Map());
  const speedMultiplierRef = useRef(1);
  const isTimeFrozenRef = useRef(false);

  const keysPressed = useRef<Set<string>>(new Set());

  // --- SYNC PAUSE STATE KE REF ---
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!isPaused && isPlaying) {
      lastTimeRef.current = performance.now();
    }
  }, [isPaused, isPlaying]);

  // --- HELPERS ---
  const spawnParticle = (x: number, y: number, color: string, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        color,
        size: Math.random() * 5 + 2
      });
    }
  };

  const clearEffects = () => {
    activeBuffsRef.current.clear();
    speedMultiplierRef.current = 1;
    isTimeFrozenRef.current = false;
    setActiveEffectsDisplay([]);
    setBgStyle(THEMES.default); // Reset background
  };

  // --- NEW: ADVANCED BUFF SYSTEM WITH CONFLICT RESOLUTION ---
  const applyEffect = (
    id: string, 
    category: 'SPEED' | 'TIME', 
    duration: number, 
    theme: string, // Background theme yang diinginkan
    onStart: () => void, 
    onEnd: () => void
  ) => {
    
    // 1. Conflict Resolution (Aturan "Ganti Efek")
    // Jika kategori efeknya sama (misal Speed vs Slow), hapus efek lama!
    activeBuffsRef.current.forEach((buff, key) => {
      if (buff.category === category) {
        // Stop efek lama secara paksa
        buff.onEnd();
        activeBuffsRef.current.delete(key);
      }
    });

    // 2. Jalankan Efek Baru
    onStart();
    setBgStyle(theme); // Ubah Background Langsung!

    // 3. Simpan ke Map (menggantikan array/timeout)
    activeBuffsRef.current.set(id, {
      duration,
      onEnd: () => {
        onEnd(); // Jalankan logika akhir (reset speed dll)
        // Cek apakah masih ada buff lain? Jika tidak, kembalikan background default
        if (activeBuffsRef.current.size === 0) {
          setBgStyle(THEMES.default);
        }
      },
      category
    });

    // 4. Update UI List
    updateEffectsUI();
  };

  const updateEffectsUI = () => {
    const names = Array.from(activeBuffsRef.current.keys());
    setActiveEffectsDisplay(names);
  };

  // --- CONTROLS ---
  const startGame = (selectedMode: GameMode) => {
    scoreRef.current = 0;
    levelRef.current = 1;
    playerXRef.current = 50;
    heartsRef.current = [];
    particlesRef.current = [];
    spawnTimerRef.current = 0;
    comboRef.current = 0;
    
    if (selectedMode === 'classic') {
      livesRef.current = 3; timeLeftRef.current = 60;
    } else if (selectedMode === 'timeAttack') {
      livesRef.current = 1; timeLeftRef.current = 30;
    } else if (selectedMode === 'survival') {
      livesRef.current = 3; timeLeftRef.current = 9999;
    } else if (selectedMode === 'chaos') {
      livesRef.current = 3; timeLeftRef.current = 45;
    }

    setMode(selectedMode);
    setScore(0);
    setLives(livesRef.current);
    setTimeLeft(timeLeftRef.current);
    setShowSecret(false);
    clearEffects();
    
    setIsPlaying(true);
    setIsPaused(false);
  };

  const stopGame = useCallback(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setIsPaused(false); 
    isPausedRef.current = false;
    setIsPlaying(false);
    clearEffects();

    const finalScore = scoreRef.current;
    const currentModeKey = {
      classic: 'highScore',
      timeAttack: 'highScoreTimeAttack',
      survival: 'highScoreSurvival',
      chaos: 'highScoreChaos'
    }[mode] as keyof StoredGameState;

    const isNewRecord = finalScore > gameState[currentModeKey];
    if (isNewRecord) {
      setGameState(prev => ({ ...prev, [currentModeKey]: finalScore }));
    }

    if (finalScore >= 100) setShowSecret(true); 
    setGameOverStats({ score: finalScore, newRecord: isNewRecord });
  }, [gameState, mode, setGameState]);

  // --- GAME LOOP ---
  const gameLoop = (time: number) => {
    if (!isPlaying || isPausedRef.current) {
      if (isPlaying) requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    let delta = time - lastTimeRef.current;
    if (delta > 100) delta = 16.67; 
    const deltaTime = delta / 16.67;
    lastTimeRef.current = time;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || canvas.width === 0) {
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- UPDATE BUFFS (Game Time Based) ---
    // Kita iterasi Map dan kurangi durasi
    activeBuffsRef.current.forEach((buff, key) => {
      buff.duration -= delta;
      if (buff.duration <= 0) {
        buff.onEnd(); // Reset variable physics
        activeBuffsRef.current.delete(key); // Hapus dari map
        
        // Logic Background Reset (Jika habis, balik default)
        if (activeBuffsRef.current.size === 0) {
          setBgStyle(THEMES.default);
        }
        updateEffectsUI();
      }
    });

    // --- TIMER LOGIC ---
    if (mode !== 'survival' && !isTimeFrozenRef.current) {
      timeLeftRef.current -= delta / 1000;
      if (timeLeftRef.current <= 0) {
        timeLeftRef.current = 0;
        stopGame();
        return;
      }
      if (Math.ceil(timeLeftRef.current) !== timeLeft) {
        setTimeLeft(Math.ceil(timeLeftRef.current));
      }
    }

    // --- MOVEMENT ---
    const moveSpeed = 1.8 * speedMultiplierRef.current * deltaTime; 
    if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
      playerXRef.current = Math.max(5, playerXRef.current - moveSpeed);
    }
    if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
      playerXRef.current = Math.min(95, playerXRef.current + moveSpeed);
    }

    // --- SPAWNING ---
    spawnTimerRef.current += delta;
    let currentSpawnRate = SPAWN_RATE_BASE;
    if (mode === 'chaos') currentSpawnRate = 300;
    else if (mode === 'timeAttack') currentSpawnRate = 500;
    else currentSpawnRate = Math.max(400, 1000 - (levelRef.current * 50));

    if (spawnTimerRef.current > currentSpawnRate) {
      spawnTimerRef.current = 0;
      
      const rand = Math.random();
      let type: HeartType = 'good';
      
      if (mode === 'chaos') {
         if (rand > 0.95) type = 'golden';
         else if (rand > 0.90) type = 'freeze';
         else if (rand > 0.85) type = 'fast';
         else if (rand > 0.80) type = 'slow';
         else if (rand > 0.40) type = 'bad';
      } else {
         if (rand > 0.96) type = 'golden';
         else if (rand > 0.92) type = 'freeze';
         else if (rand > 0.88) type = 'fast';
         else if (rand > 0.84) type = 'slow';
         else if (rand > 0.75) type = 'bad';
      }

      heartsRef.current.push({
        id: Math.random(),
        x: Math.random() * 90 + 5,
        y: -10,
        type,
        speed: (Math.random() * 0.5 + 0.5 + (levelRef.current * 0.05)) * (mode === 'chaos' ? 1.5 : 1),
        wobble: Math.random() * Math.PI * 2
      });
    }

    // --- HEARTS UPDATE ---
    const playerPixelX = (playerXRef.current / 100) * canvas.width;
    const playerPixelY = canvas.height - 60;
    const playerRadius = (canvas.width * PLAYER_SIZE_PERCENT / 100) / 2;

    for (let i = heartsRef.current.length - 1; i >= 0; i--) {
      const heart = heartsRef.current[i];
      
      heart.y += heart.speed * deltaTime; 
      heart.wobble += 0.1;

      const heartPixelX = (heart.x / 100) * canvas.width + Math.sin(heart.wobble) * 2;
      const heartPixelY = (heart.y / 100) * canvas.height;

      ctx.font = "30px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let emoji = '💕';
      if (heart.type === 'golden') emoji = '💖';
      else if (heart.type === 'bad') emoji = '🖤';
      else if (heart.type === 'freeze') emoji = '🧊';
      else if (heart.type === 'fast') emoji = '⚡';
      else if (heart.type === 'slow') emoji = '🐌';
      
      // Shadow Effect per type
      if (heart.type === 'golden') {
        ctx.shadowColor = "gold";
        ctx.shadowBlur = 15;
      } else if (heart.type === 'freeze') {
        ctx.shadowColor = "#00FFFF";
        ctx.shadowBlur = 10;
      } else if (heart.type === 'fast') {
        ctx.shadowColor = "#00FF00";
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.fillText(emoji, heartPixelX, heartPixelY);
      ctx.shadowBlur = 0;

      // Collision
      const dx = heartPixelX - playerPixelX;
      const dy = heartPixelY - playerPixelY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + 5) {
        handleCollision(heart);
        // Particle colors based on type
        let pColor = '#FF69B4'; // Default Pink
        if (heart.type === 'freeze') pColor = '#00FFFF';
        if (heart.type === 'fast') pColor = '#00FF00';
        if (heart.type === 'slow') pColor = '#8B4513';
        if (heart.type === 'bad') pColor = '#000000';
        if (heart.type === 'golden') pColor = '#FFD700';
        
        spawnParticle(heartPixelX, heartPixelY, pColor);
        heartsRef.current.splice(i, 1);
      } else if (heart.y > 110) {
        if (mode === 'survival' && heart.type === 'good') {
           livesRef.current -= 1;
           setLives(livesRef.current);
           if (livesRef.current <= 0) {
             stopGame();
             return;
           }
        }
        heartsRef.current.splice(i, 1);
      }
    }

    // --- DRAW PLAYER ---
    ctx.font = `${playerRadius * 2.5}px Arial`; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#FF69B4";
    ctx.shadowBlur = 20;
    ctx.fillText('🧺', playerPixelX, playerPixelY);
    ctx.shadowBlur = 0;

    // --- PARTICLES ---
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= 0.03 * deltaTime;
      
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
      } else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleCollision = (heart: Heart) => {
    const now = Date.now();
    let points = 0;

    if (now - lastCatchTimeRef.current < 1500 && heart.type !== 'bad') {
      comboRef.current += 1;
    } else {
      comboRef.current = 1;
    }
    lastCatchTimeRef.current = now;

    switch (heart.type) {
      case 'good': points = 10; break;
      case 'golden': points = 50; comboRef.current += 2; break;
      case 'bad': 
        comboRef.current = 0;
        if (mode === 'survival' || mode === 'chaos') {
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
             stopGame();
             return;
          }
        } else {
          scoreRef.current = Math.max(0, scoreRef.current - 50);
        }
        break;
      
      // --- LOGIC BUFF DENGAN VISUAL ---
      case 'freeze':
        points = 5;
        applyEffect(
          'FREEZE 🧊', 
          'TIME', // Category Time
          3000, 
          THEMES.freeze, // Background Style
          () => isTimeFrozenRef.current = true, 
          () => isTimeFrozenRef.current = false
        );
        break;
      case 'fast':
        points = 5;
        applyEffect(
          'SPEED ⚡', 
          'SPEED', // Category Speed (Konflik dengan Slow)
          4000, 
          'bg-gradient-to-b from-[#11998e] to-[#38ef7d]', // Green Theme
          () => speedMultiplierRef.current = 2.0, 
          () => speedMultiplierRef.current = 1.0
        );
        break;
      case 'slow':
        points = 5;
        applyEffect(
          'SLOW 🐌', 
          'SPEED', // Category Speed (Konflik dengan Fast)
          3000, 
          THEMES.slow, 
          () => speedMultiplierRef.current = 0.5, 
          () => speedMultiplierRef.current = 1.0
        );
        break;
    }

    if (points > 0) {
      const multiplier = 1 + (Math.floor(comboRef.current / 5) * 0.5);
      scoreRef.current += Math.floor(points * multiplier);
      
      const newLevel = Math.floor(scoreRef.current / 200) + 1;
      if (newLevel !== levelRef.current) levelRef.current = newLevel;
      
      setScore(scoreRef.current);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
      if (e.key === 'Escape' && isPlaying) setIsPaused(p => !p);
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const rect = canvasRef.current.parentElement.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    
    if (isPlaying) {
      handleResize();
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isPlaying || isPausedRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = clientX - rect.left;
    const percentX = (relativeX / rect.width) * 100;
    playerXRef.current = Math.max(5, Math.min(95, percentX));
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col font-sans select-none overflow-hidden touch-none">
      
      {/* HEADER */}
      <div className="bg-[#1A1A2E]/95 border-b-4 border-[#FF69B4] p-4 z-20">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <PixelButton onClick={() => isPlaying ? stopGame() : navigate('/home')} variant="secondary" size="sm">
            {isPlaying ? '✕ QUIT' : '← BACK'}
          </PixelButton>
          <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
            HEART CATCHER
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* GAME CONTAINER - Background berubah disini menggunakan bgStyle */}
      <div 
        className={`flex-1 relative max-w-4xl mx-auto w-full h-full border-x-2 border-[#FF69B4]/30 transition-all duration-700 ease-in-out ${bgStyle}`}
      >
        
        {/* HUD */}
        {isPlaying && (
          <div className="absolute top-4 left-0 right-0 px-4 flex justify-between z-10 pointer-events-none">
            <div className="flex gap-2">
               <div className="bg-white/10 backdrop-blur px-3 py-1 rounded border border-white/20">
                  <span className="font-['Press_Start_2P'] text-xs text-[#FFD700]">SCORE: {score}</span>
               </div>
               {activeEffectsDisplay.map(eff => (
                 <span key={eff} className="bg-white/20 px-2 py-1 rounded text-[10px] text-white animate-pulse border border-white/40 shadow-sm">{eff}</span>
               ))}
            </div>
            
            <div className="flex gap-2">
               {mode !== 'survival' && (
                 <div className={`px-3 py-1 rounded border border-white/20 ${timeLeft < 10 ? 'bg-red-500 animate-bounce' : 'bg-white/10'}`}>
                    <span className="font-['Press_Start_2P'] text-xs text-white">TIME: {timeLeft}</span>
                 </div>
               )}
               {(mode === 'survival' || mode === 'chaos') && (
                 <div className="bg-red-500/20 px-3 py-1 rounded border border-red-500/50">
                    <span className="text-xs text-white">{'❤️'.repeat(lives)}</span>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* CANVAS LAYER */}
        <canvas 
          ref={canvasRef}
          className="w-full h-full block touch-none cursor-none"
          onMouseMove={handleTouchMove}
          onTouchMove={handleTouchMove}
        />

        {/* MENUS OVERLAY */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
            {gameOverStats.score > 0 ? (
               // GAME OVER SCREEN
               <div className="bg-[#16213E] p-8 rounded-xl border-4 border-[#FF69B4] text-center max-w-md w-full animate-gameShake">
                  <h2 className="font-['Press_Start_2P'] text-2xl text-white mb-4">GAME OVER</h2>
                  <div className="bg-[#1A1A2E] p-4 rounded mb-6">
                    <p className="font-['VT323'] text-xl text-white/70">Final Score</p>
                    <p className="font-['Press_Start_2P'] text-3xl text-[#FF69B4] mt-2">{gameOverStats.score}</p>
                    {gameOverStats.newRecord && (
                      <span className="inline-block bg-[#FFD700] text-black text-xs px-2 py-1 rounded mt-2 animate-bounce">
                        NEW HIGH SCORE! 🏆
                      </span>
                    )}
                  </div>
                  {showSecret && (
                    <div className="mb-4 bg-pink-500/20 p-2 rounded border border-pink-500 text-sm text-pink-200">
                      💖 Secret Unlocked: "Kamu hebat banget!" 
                    </div>
                  )}
                  <div className="flex gap-4 justify-center">
                    <PixelButton onClick={() => startGame(mode)}>RETRY</PixelButton>
                    <PixelButton variant="secondary" onClick={() => setGameOverStats({score: 0, newRecord: false})}>MENU</PixelButton>
                  </div>
               </div>
            ) : (
               // MAIN MENU
               <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'classic', label: 'CLASSIC', color: 'blue', desc: '60s • 3 Lives • Normal' },
                    { id: 'timeAttack', label: 'TIME ATTACK', color: 'red', desc: '30s • 1 Life • Fast' },
                    { id: 'survival', label: 'SURVIVAL', color: 'purple', desc: 'No Limit • Don\'t Miss!' },
                    { id: 'chaos', label: 'CHAOS 🔥', color: 'orange', desc: '45s • Super Fast • Random' },
                  ].map((m) => (
                    <button 
                      key={m.id}
                      onClick={() => startGame(m.id as GameMode)}
                      className={`group relative overflow-hidden p-6 rounded-xl border-4 transition-all hover:scale-[1.02] active:scale-[0.98]
                        ${m.id === 'classic' ? 'bg-blue-600 border-blue-800' : 
                          m.id === 'timeAttack' ? 'bg-red-600 border-red-800' :
                          m.id === 'survival' ? 'bg-purple-600 border-purple-800' :
                          'bg-orange-600 border-orange-800'
                        }`}
                    >
                      <div className="relative z-10 text-center">
                        <h3 className="font-['Press_Start_2P'] text-white text-lg mb-2">{m.label}</h3>
                        <p className="font-['VT323'] text-white/90 text-xl">{m.desc}</p>
                        <p className="text-xs text-white/60 mt-2 font-mono">
                          HIGH: {gameState[('highScore' + (m.id === 'classic' ? '' : m.id.charAt(0).toUpperCase() + m.id.slice(1))) as keyof StoredGameState]}
                        </p>
                      </div>
                    </button>
                  ))}
               </div>
            )}
          </div>
        )}

        {/* PAUSE SCREEN */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur flex flex-col items-center justify-center z-40">
            <h2 className="font-['Press_Start_2P'] text-4xl text-white mb-8">PAUSED</h2>
            <div className="flex gap-4">
              <PixelButton onClick={() => setIsPaused(false)}>RESUME</PixelButton>
              <PixelButton variant="secondary" onClick={stopGame}>QUIT</PixelButton>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gameShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-5px, 5px); }
          50% { transform: translate(5px, -5px); }
          75% { transform: translate(-5px, -5px); }
        }
        .animate-gameShake { animation: gameShake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
};

export default Game;