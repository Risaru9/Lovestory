import React, { useState } from 'react';
import type { GameMode } from '@/types/game';
import { MODE_CONFIGS } from '@/types/game';
import { Trophy, Clock, Heart, Zap, Info, Settings, Volume2, VolumeX, Music, Sparkles } from 'lucide-react';

interface MainMenuProps {
  highScores: Record<GameMode, number>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onSelectMode: (mode: GameMode) => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}

const MODE_ICONS: Record<GameMode, React.ReactNode> = {
  classic: <Heart className="w-8 h-8" />,
  timeAttack: <Clock className="w-8 h-8" />,
  survival: <Zap className="w-8 h-8" />,
  chaos: <Sparkles className="w-8 h-8" />
};

const MODE_COLORS: Record<GameMode, { bg: string; border: string; glow: string }> = {
  classic: { 
    bg: 'from-blue-600 to-blue-800', 
    border: 'border-blue-400',
    glow: 'shadow-blue-500/50'
  },
  timeAttack: { 
    bg: 'from-red-600 to-red-800', 
    border: 'border-red-400',
    glow: 'shadow-red-500/50'
  },
  survival: { 
    bg: 'from-purple-600 to-purple-800', 
    border: 'border-purple-400',
    glow: 'shadow-purple-500/50'
  },
  chaos: { 
    bg: 'from-orange-600 via-pink-600 to-purple-600', 
    border: 'border-pink-400',
    glow: 'shadow-pink-500/50'
  }
};

export const MainMenu: React.FC<MainMenuProps> = ({
  highScores,
  soundEnabled,
  musicEnabled,
  onSelectMode,
  onToggleSound,
  onToggleMusic
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const modes: GameMode[] = ['classic', 'timeAttack', 'survival', 'chaos'];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-['Press_Start_2P'] text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#FF69B4] via-[#FFD700] to-[#FF69B4] animate-pulse mb-2">
          HEART CATCHER
        </h1>
        <p className="font-['VT323'] text-xl text-white/70">Pixel Adventure</p>
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 p-3 bg-black/50 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-black/90 border border-white/20 rounded-lg p-4 z-50">
          <h3 className="font-['Press_Start_2P'] text-xs text-white mb-4">SETTINGS</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={onToggleSound}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-green-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
              <span className="text-sm text-white">{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
            </button>
            <button
              onClick={onToggleMusic}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {musicEnabled ? <Music className="w-5 h-5 text-green-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
              <span className="text-sm text-white">{musicEnabled ? 'Music ON' : 'Music OFF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
        {modes.map((mode) => {
          const config = MODE_CONFIGS[mode];
          const colors = MODE_COLORS[mode];
          const isSelected = selectedMode === mode;
          
          return (
            <div key={mode} className="relative">
              <button
                onClick={() => setSelectedMode(isSelected ? null : mode)}
                className={`w-full group relative overflow-hidden p-5 rounded-xl border-4 transition-all duration-300 ${isSelected ? 'scale-105' : 'hover:scale-[1.02]'}`}
                style={{
                  background: `linear-gradient(135deg, ${colors.bg.includes('blue') ? '#2563eb, #1e40af' : colors.bg.includes('red') ? '#dc2626, #991b1b' : colors.bg.includes('purple') ? '#9333ea, #6b21a8' : '#ea580c, #db2777, #9333ea'})`,
                  borderColor: isSelected ? '#FFD700' : colors.border.replace('border-', ''),
                  boxShadow: isSelected ? `0 0 30px currentColor` : 'none'
                }}
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-r ${colors.bg}`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      {MODE_ICONS[mode]}
                    </div>
                    <div className="flex items-center gap-1 text-[#FFD700]">
                      <Trophy className="w-4 h-4" />
                      <span className="font-['Press_Start_2P'] text-xs">{highScores[mode].toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-['Press_Start_2P'] text-white text-lg mb-2">{config.name}</h3>
                  <p className="font-['VT323'] text-white/80 text-lg">{config.description}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-black/30 rounded text-[10px] text-white/80">
                      {config.timeLimit < 9999 ? `${config.timeLimit}s` : '∞'}
                    </span>
                    <span className="px-2 py-1 bg-black/30 rounded text-[10px] text-white/80">
                      {config.lives} ❤️
                    </span>
                  </div>
                </div>
              </button>

              {/* Mode Details Panel */}
              {isSelected && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 border-2 border-[#FFD700] rounded-xl p-4 z-20 animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-['Press_Start_2P'] text-xs text-[#FFD700] mb-3">GOALS</h4>
                  <ul className="space-y-2 mb-4">
                    {config.goals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="text-[#FFD700]">★</span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                  
                  <h4 className="font-['Press_Start_2P'] text-xs text-red-400 mb-3">CHALLENGES</h4>
                  <ul className="space-y-2 mb-4">
                    {config.challenges.map((challenge, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="text-red-400">!</span>
                        {challenge}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => onSelectMode(mode)}
                    className="w-full py-3 bg-gradient-to-r from-[#FF69B4] to-[#FFD700] rounded-lg font-['Press_Start_2P'] text-sm text-white hover:opacity-90 transition-opacity"
                  >
                    START GAME
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Heart Types Legend */}
      <div className="mt-8 max-w-2xl w-full">
        <button className="flex items-center gap-2 mx-auto text-white/60 hover:text-white transition-colors">
          <Info className="w-4 h-4" />
          <span className="font-['VT323'] text-lg">Heart Types</span>
        </button>
        
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[
            { type: 'good', name: 'Love', points: '+10', color: '#FF69B4' },
            { type: 'bad', name: 'Dark', points: '-50', color: '#4B0082' },
            { type: 'golden', name: 'Golden', points: '+100', color: '#FFD700' },
            { type: 'freeze', name: 'Freeze', points: '+5', color: '#00FFFF' },
            { type: 'speed', name: 'Speed', points: '+5', color: '#00FF00' },
            { type: 'slow', name: 'Slow', points: '+5', color: '#8B4513' },
            { type: 'bomb', name: 'Bomb', points: '-100', color: '#FF0000' },
            { type: 'rainbow', name: 'Rainbow', points: '+200', color: '#FF00FF' },
            { type: 'magnet', name: 'Magnet', points: '+15', color: '#C0C0C0' },
            { type: 'shield', name: 'Shield', points: '+15', color: '#00BFFF' },
          ].map((heart) => (
            <div key={heart.type} className="bg-black/40 border border-white/10 rounded-lg p-2 text-center">
              <img 
                src={`/images/sprites/heart_${heart.type}.png`} 
                alt={heart.name}
                className="w-8 h-8 mx-auto mb-1"
              />
              <div className="text-[8px] text-white/70 font-bold">{heart.name}</div>
              <div className="text-[8px]" style={{ color: heart.color }}>{heart.points}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
