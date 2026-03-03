import React from 'react';
import type { ActiveEffect, GameMode } from '@/types/game';
import { MODE_CONFIGS } from '@/types/game';

interface GameHUDProps {
  score: number;
  lives: number;
  timeLeft: number;
  level: number;
  combo: number;
  mode: GameMode;
  activeEffects: ActiveEffect[];
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  lives,
  timeLeft,
  level,
  combo,
  mode,
  activeEffects
}) => {
  const config = MODE_CONFIGS[mode];
  const isTimeLow = timeLeft <= 10 && config.timeLimit < 9999;

  return (
    <div className="absolute top-0 left-0 right-0 p-4 z-10 pointer-events-none">
      {/* Top Bar */}
      <div className="flex justify-between items-start max-w-4xl mx-auto">
        {/* Left: Score & Level */}
        <div className="flex flex-col gap-2">
          <div className="bg-black/60 backdrop-blur-sm border-2 border-[#FF69B4] rounded-lg px-4 py-2">
            <div className="text-[10px] text-[#FF69B4] font-['Press_Start_2P'] mb-1">SCORE</div>
            <div className="text-xl text-white font-['Press_Start_2P']">{score.toLocaleString()}</div>
          </div>
          
          <div className="flex gap-2">
            <div className="bg-black/60 backdrop-blur-sm border border-[#FFD700] rounded-lg px-3 py-1">
              <span className="text-[8px] text-[#FFD700] font-['Press_Start_2P']">LVL </span>
              <span className="text-sm text-white font-['Press_Start_2P']">{level}</span>
            </div>
            
            {combo > 1 && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg px-3 py-1 animate-pulse">
                <span className="text-[8px] text-white font-['Press_Start_2P']">COMBO </span>
                <span className="text-sm text-white font-['Press_Start_2P']">{combo}x</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Active Effects */}
        {activeEffects.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            {activeEffects.map((effect, index) => (
              <div 
                key={effect.id}
                className="bg-black/70 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 flex items-center gap-2 animate-pulse"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-lg">{effect.icon}</span>
                <div className="flex flex-col">
                  <span className="text-[8px] text-white font-bold">{effect.name}</span>
                  <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF69B4] to-[#FFD700]"
                      style={{ width: `${(effect.duration / effect.maxDuration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Right: Time & Lives */}
        <div className="flex flex-col gap-2 items-end">
          {config.timeLimit < 9999 && (
            <div className={`border-2 rounded-lg px-4 py-2 ${isTimeLow ? 'bg-red-600/80 border-red-400 animate-pulse' : 'bg-black/60 border-[#00FFFF]'}`}>
              <div className={`text-[10px] font-['Press_Start_2P'] mb-1 ${isTimeLow ? 'text-white' : 'text-[#00FFFF]'}`}>TIME</div>
              <div className={`text-xl font-['Press_Start_2P'] ${isTimeLow ? 'text-white' : 'text-white'}`}>
                {Math.floor(timeLeft / 60)}:{String(Math.floor(timeLeft % 60)).padStart(2, '0')}
              </div>
            </div>
          )}
          
          {config.lives > 1 && (
            <div className="bg-black/60 backdrop-blur-sm border border-red-500 rounded-lg px-3 py-1">
              <div className="flex items-center gap-1">
                {Array.from({ length: lives }).map((_, i) => (
                  <span key={i} className="text-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>❤️</span>
                ))}
                {Array.from({ length: config.lives - lives }).map((_, i) => (
                  <span key={i} className="text-xl opacity-30">🖤</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combo Bar */}
      {combo > 1 && (
        <div className="mt-2 max-w-xs mx-auto">
          <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/20">
            <div 
              className="h-full bg-gradient-to-r from-[#FF69B4] via-[#FFD700] to-[#00FF00]"
              style={{ width: `${Math.min(100, (combo / 20) * 100)}%` }}
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-[8px] text-[#FFD700] font-['Press_Start_2P']">
              {combo >= 20 ? 'MAX COMBO!' : combo >= 10 ? 'AMAZING!' : combo >= 5 ? 'GREAT!' : 'COMBO!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
