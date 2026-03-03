import React from 'react';
import type { GameMode } from '@/types/game';
import { MODE_CONFIGS } from '@/types/game';
import { Trophy, Target, Clock, TrendingUp, RotateCcw, Home } from 'lucide-react';

interface GameOverProps {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  mode: GameMode;
  heartsCaught: number;
  maxCombo: number;
  timePlayed: number;
  onRetry: () => void;
  onMenu: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  score,
  highScore,
  isNewRecord,
  mode,
  heartsCaught,
  maxCombo,
  timePlayed,
  onRetry,
  onMenu
}) => {
  const config = MODE_CONFIGS[mode];
  
  // Calculate grade
  const getGrade = () => {
    const ratio = score / (highScore || 1);
    if (isNewRecord) return { letter: 'S', color: '#FFD700', text: 'LEGENDARY!' };
    if (ratio >= 0.9) return { letter: 'A', color: '#00FF00', text: 'EXCELLENT!' };
    if (ratio >= 0.7) return { letter: 'B', color: '#00FFFF', text: 'GREAT JOB!' };
    if (ratio >= 0.5) return { letter: 'C', color: '#FFFF00', text: 'GOOD!' };
    if (ratio >= 0.3) return { letter: 'D', color: '#FF8800', text: 'KEEP TRYING!' };
    return { letter: 'F', color: '#FF0000', text: 'PRACTICE MORE!' };
  };
  
  const grade = getGrade();

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="bg-black/90 border-4 border-[#FF69B4] rounded-2xl p-6 max-w-lg w-full animate-in zoom-in duration-300">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-['Press_Start_2P'] text-2xl text-white mb-2">GAME OVER</h2>
          <p className="font-['VT323'] text-lg text-white/60">{config.name} Mode</p>
        </div>

        {/* Grade Display */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center border-4 animate-pulse"
            style={{ 
              borderColor: grade.color,
              boxShadow: `0 0 30px ${grade.color}50`,
              background: `linear-gradient(135deg, ${grade.color}30, transparent)`
            }}
          >
            <span className="font-['Press_Start_2P'] text-4xl" style={{ color: grade.color }}>
              {grade.letter}
            </span>
          </div>
        </div>

        <p className="text-center font-['VT323'] text-xl mb-6" style={{ color: grade.color }}>
          {grade.text}
        </p>

        {/* Score Display */}
        <div className="bg-gradient-to-r from-[#FF69B4]/20 to-[#FFD700]/20 rounded-xl p-4 mb-6">
          <div className="text-center">
            <p className="font-['VT323'] text-white/60 text-lg">FINAL SCORE</p>
            <p className="font-['Press_Start_2P'] text-4xl text-white mt-2">
              {score.toLocaleString()}
            </p>
            {isNewRecord && (
              <div className="mt-2 inline-flex items-center gap-2 bg-[#FFD700] text-black px-3 py-1 rounded-full animate-bounce">
                <Trophy className="w-4 h-4" />
                <span className="font-bold text-sm">NEW RECORD!</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs">High Score</span>
            </div>
            <p className="font-['Press_Start_2P'] text-sm text-white">{highScore.toLocaleString()}</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs">Hearts Caught</span>
            </div>
            <p className="font-['Press_Start_2P'] text-sm text-white">{heartsCaught}</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Max Combo</span>
            </div>
            <p className="font-['Press_Start_2P'] text-sm text-[#FFD700]">{maxCombo}x</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Time Played</span>
            </div>
            <p className="font-['Press_Start_2P'] text-sm text-white">{Math.floor(timePlayed)}s</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-4 bg-gradient-to-r from-[#FF69B4] to-[#FF1493] rounded-xl font-['Press_Start_2P'] text-sm text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            RETRY
          </button>
          <button
            onClick={onMenu}
            className="flex-1 py-4 bg-white/10 border border-white/30 rounded-xl font-['Press_Start_2P'] text-sm text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            MENU
          </button>
        </div>
      </div>
    </div>
  );
};
