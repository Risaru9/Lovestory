import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameMode } from '@/types/game';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useGameStorage } from '@/hooks/useGameStorage';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameHUD } from '@/components/game/GameHUD';
import { MainMenu } from '@/components/game/MainMenu';
import { GameOver } from '@/components/game/GameOver';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';

interface GameProps {
  initialMode?: GameMode;
}

const Game: React.FC<GameProps> = ({ initialMode }) => {
  const navigate = useNavigate();
  const { 
    gameState, 
    updateHighScore, 
    getHighScore, 
    incrementGamesPlayed,
    toggleSetting 
  } = useGameStorage();
  
  const [currentMode, setCurrentMode] = useState<GameMode>(initialMode || 'classic');
  const [gameStatus, setGameStatus] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameStats, setGameStats] = useState({
    score: 0,
    heartsCaught: 0,
    maxCombo: 0,
    timePlayed: 0
  });
  
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const handleGameOver = useCallback((stats: { score: number; heartsCaught: number; maxCombo: number; timePlayed: number }) => {
    setGameStats(stats);
    setGameStatus('gameover');
    
    // Update high score
    const currentHigh = getHighScore(currentMode);
    if (stats.score > currentHigh) {
      updateHighScore(currentMode, stats.score);
    }
    
    incrementGamesPlayed();
  }, [currentMode, getHighScore, updateHighScore, incrementGamesPlayed]);

  const { 
    state, 
    initGame, 
    update, 
    setPlayerX, 
    togglePause, 
    quitGame,
    getBackground 
  } = useGameEngine({
    mode: currentMode,
    soundEnabled: gameState.soundEnabled,
    onGameOver: handleGameOver
  });

  // SISTEM AUDIO DUAL TRACK
  const gameBgmRef = useRef<HTMLAudioElement | null>(null);
  const menuBgmRef = useRef<HTMLAudioElement | null>(null);

  // 1. Inisialisasi Kedua Audio
  useEffect(() => {
    // Audio untuk saat bermain game
    gameBgmRef.current = new Audio('/audio/game_audio/Pixel_Paradise_Odyssey.mp3'); 
    gameBgmRef.current.loop = true;
    gameBgmRef.current.volume = 0.3;

    // Audio untuk menu utama
    menuBgmRef.current = new Audio('/audio/game_audio/Victory_Fanfare.mp3'); 
    menuBgmRef.current.loop = true;
    menuBgmRef.current.volume = 0.3;

    return () => {
      if (gameBgmRef.current) {
        gameBgmRef.current.pause();
        gameBgmRef.current = null;
      }
      if (menuBgmRef.current) {
        menuBgmRef.current.pause();
        menuBgmRef.current = null;
      }
    };
  }, []);

  // 2. Kontrol Pergantian Audio
  useEffect(() => {
    if (!gameBgmRef.current || !menuBgmRef.current) return;

    if (!gameState.musicEnabled) {
      gameBgmRef.current.pause();
      menuBgmRef.current.pause();
      return;
    }

    if (gameStatus === 'playing') {
      menuBgmRef.current.pause();
      
      if (!state.isPaused) {
        gameBgmRef.current.play().catch(err => console.log("Autoplay dicegah:", err));
      } else {
        gameBgmRef.current.pause();
      }
    } else {
      gameBgmRef.current.pause();

      gameBgmRef.current.currentTime = 0; 

      menuBgmRef.current.play().catch(err => console.log("Autoplay dicegah:", err));
    }
  }, [gameStatus, gameState.musicEnabled, state.isPaused]);

  // Game loop
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      
      update(deltaTime);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameStatus, update]);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setCurrentMode(mode);
    setGameStatus('playing');
    initGame();
  }, [initGame]);

  const handleRetry = useCallback(() => {
    setGameStatus('playing');
    initGame();
  }, [initGame]);

  const handleMenu = useCallback(() => {
    setGameStatus('menu');
    quitGame();
  }, [quitGame]);

  const highScores = {
    classic: gameState.highScoreClassic,
    timeAttack: gameState.highScoreTimeAttack,
    survival: gameState.highScoreSurvival,
    chaos: gameState.highScoreChaos
  };

  const currentHighScore = getHighScore(currentMode);
  const isNewRecord = gameStats.score > currentHighScore && gameStats.score > 0;

  // Virtual D-pad movement handlers
  const handleLeftStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  };
  const handleLeftEnd = () => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
  };
  const handleRightStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  };
  const handleRightEnd = () => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="bg-[#1A1A2E]/95 border-b-4 border-[#FF69B4] p-4 z-20">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <button
            onClick={() => {
              if (gameStatus === 'playing') {
                quitGame();
                setGameStatus('menu');
              } else {
                navigate('/home'); 
              }
            }}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg font-['Press_Start_2P'] text-xs text-white hover:bg-white/20 transition-colors"
          >
            {gameStatus === 'playing' ? '✕ QUIT' : '← BACK'}
          </button>
          
          <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
            HEART CATCHER
          </h1>
          
          <div className="flex gap-2">
            {gameStatus === 'playing' && (
              <button
                onClick={togglePause}
                className="p-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              >
                {state.isPaused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
              </button>
            )}
            <button
              onClick={() => toggleSetting('soundEnabled')}
              className="p-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
            >
              {gameState.soundEnabled ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Game Container */}
      <div 
        className={`flex-1 relative max-w-4xl mx-auto w-full border-x-2 border-[#FF69B4]/30 ${
          gameStatus === 'playing' ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
        style={{
          backgroundImage: gameStatus === 'playing' ? `url(${getBackground()})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {gameStatus === 'menu' && (
          <MainMenu
            highScores={highScores}
            soundEnabled={gameState.soundEnabled}
            musicEnabled={gameState.musicEnabled}
            onSelectMode={handleSelectMode}
            onToggleSound={() => toggleSetting('soundEnabled')}
            onToggleMusic={() => toggleSetting('musicEnabled')}
          />
        )}

        {gameStatus === 'playing' && (
          <div className="flex flex-col items-center justify-center h-full w-full p-2 sm:p-4 bg-[#0c0a18]/45">
            {/* Game Screen Wrapper (HUD + Canvas) */}
            <div className="w-full max-w-md aspect-square bg-[#0c0a18]/90 relative overflow-hidden border-4 border-black shadow-[4px_4px_0_#000000] rounded-xl flex flex-col">
              <GameHUD
                score={state.score}
                lives={state.lives}
                timeLeft={state.timeLeft}
                level={state.level}
                combo={state.combo}
                mode={currentMode}
                activeEffects={state.activeEffects}
              />
              <div className="flex-1 relative overflow-hidden">
                <GameCanvas
                  hearts={state.hearts}
                  particles={state.particles}
                  floatingTexts={state.floatingTexts}
                  playerX={state.playerX}
                  screenShake={state.screenShake}
                  screenFlip={state.screenFlip}
                  hasShield={state.activeEffects.some(e => e.id === 'shield')}
                  isPaused={state.isPaused}
                  onPlayerMove={setPlayerX}
                />
              </div>
            </div>

            {/* D-Pad Buttons */}
            <div className="mt-4 flex justify-between items-center w-full max-w-md px-6 select-none touch-none">
              <button
                onTouchStart={handleLeftStart}
                onTouchEnd={handleLeftEnd}
                onTouchCancel={handleLeftEnd}
                onMouseDown={handleLeftStart}
                onMouseUp={handleLeftEnd}
                onMouseLeave={handleLeftEnd}
                className="w-16 h-16 min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#FF69B4] border-4 border-black text-white font-['Press_Start_2P'] text-xl rounded-xl active:translate-y-1 active:border-b-2 shadow-[4px_4px_0_#000000] select-none touch-none"
                style={{ touchAction: 'none' }}
                aria-label="Move Left"
              >
                ◀
              </button>
              
              <div className="font-['VT323'] text-sm text-[#FF69B4]/80 text-center animate-pulse">
                TOUCH TO MOVE
              </div>

              <button
                onTouchStart={handleRightStart}
                onTouchEnd={handleRightEnd}
                onTouchCancel={handleRightEnd}
                onMouseDown={handleRightStart}
                onMouseUp={handleRightEnd}
                onMouseLeave={handleRightEnd}
                className="w-16 h-16 min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#FF69B4] border-4 border-black text-white font-['Press_Start_2P'] text-xl rounded-xl active:translate-y-1 active:border-b-2 shadow-[4px_4px_0_#000000] select-none touch-none"
                style={{ touchAction: 'none' }}
                aria-label="Move Right"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {gameStatus === 'gameover' && (
          <GameOver
            score={gameStats.score}
            highScore={currentHighScore}
            isNewRecord={isNewRecord}
            mode={currentMode}
            heartsCaught={gameStats.heartsCaught}
            maxCombo={gameStats.maxCombo}
            timePlayed={gameStats.timePlayed}
            onRetry={handleRetry}
            onMenu={handleMenu}
          />
        )}
      </div>

      {/* Instructions Footer */}
      {gameStatus === 'menu' && (
        <footer className="bg-[#1A1A2E]/95 border-t border-[#FF69B4]/30 p-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-['VT323'] text-white/60 text-lg">
              Use <span className="text-[#FF69B4]">MOUSE/TOUCH</span> or <span className="text-[#FF69B4]">WASD/ARROWS</span> to move • 
              Press <span className="text-[#FF69B4]">ESC</span> to pause
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Game;