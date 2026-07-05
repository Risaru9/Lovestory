import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

// --- Types ---
interface PetData {
  name: string;
  petType: string;
  happiness: number;
  hunger: number;
  energy: number;
  level: number;
  interactions: number;
  lastUpdated: number;
}

const STORAGE_KEY = 'lovestory-love-pet';

const PET_OPTIONS: { type: string; emoji: string }[] = [
  { type: 'cat', emoji: '🐱' },
  { type: 'dog', emoji: '🐶' },
  { type: 'dragon', emoji: '🐉' },
];

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const createDefaultPet = (): PetData => ({
  name: 'Pixel',
  petType: 'cat',
  happiness: 80,
  hunger: 80,
  energy: 80,
  level: 1,
  interactions: 0,
  lastUpdated: Date.now(),
});

const loadData = (): PetData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    // Apply time-based decay
    const now = Date.now();
    const elapsed = (now - (parsed.lastUpdated || now)) / 1000; // seconds
    const hoursElapsed = elapsed / 3600;
    // Stats decrease by ~5 per hour elapsed
    const decay = Math.floor(hoursElapsed * 5);
    return {
      ...parsed,
      happiness: clamp((parsed.happiness || 80) - decay, 0, 100),
      hunger: clamp((parsed.hunger || 80) - decay, 0, 100),
      energy: clamp((parsed.energy || 80) - decay, 0, 100),
      lastUpdated: now,
    };
  }
  return createDefaultPet();
};

const saveData = (data: PetData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastUpdated: Date.now() }));
};

// --- Sound ---
const playSound = (freq: number = 440, duration: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

// --- CSS Keyframes ---
const styleId = 'love-pet-styles';
const injectStyles = () => {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes lp-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes lp-action {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    @keyframes lp-sleep {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
};

// --- Stat Bar Component ---
const StatBar: React.FC<{ label: string; value: number; color: string; icon: string }> = ({ label, value, color, icon }) => {
  const barColor = value > 50 ? color : value > 25 ? '#ffb300' : '#ff4444';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-['VT323'] text-sm text-[#a0a0b0]">{icon} {label}</span>
        <span className="font-['Press_Start_2P'] text-[8px] text-[#ffffff]">{value}/100</span>
      </div>
      <div className="w-full h-5 bg-[#0c0a18] border-2 border-[#000000] relative overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${value}%`,
            backgroundColor: barColor,
            boxShadow: `inset 0 -2px 0 rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.15)`,
          }}
        />
        {/* Pixel segments */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-[#000000] opacity-30" />
          ))}
        </div>
      </div>
    </div>
  );
};

const LovePet: React.FC = () => {
  const navigate = useNavigate();
  const [pet, setPet] = useState<PetData>(loadData);
  const [actionAnim, setActionAnim] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(pet.name);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    saveData(pet);
  }, [pet]);

  const getPetEmoji = () => {
    const found = PET_OPTIONS.find(p => p.type === pet.petType);
    return found ? found.emoji : '🐱';
  };

  const getMood = (): { text: string; emoji: string } => {
    if (pet.energy < 20) return { text: 'Sleeping...', emoji: '😴' };
    if (pet.happiness < 30 || pet.hunger < 30 || pet.energy < 30) return { text: 'Sad...', emoji: '😢' };
    if (pet.happiness > 80 && pet.hunger > 80 && pet.energy > 80) return { text: 'Amazing!', emoji: '🤩' };
    if (pet.happiness > 50 && pet.hunger > 50 && pet.energy > 50) return { text: 'Happy!', emoji: '😊' };
    return { text: 'Okay', emoji: '😐' };
  };

  const triggerAction = (anim: string) => {
    setActionAnim(anim);
    setTimeout(() => setActionAnim(null), 600);
  };

  const doInteraction = async (updater: (p: PetData) => PetData, freq: number) => {
    playSound(freq, 0.12);
    const updated = updater(pet);
    const newInteractions = updated.interactions + 1;
    const newLevel = Math.floor(newInteractions / 10) + 1;
    setPet({
      ...updated,
      interactions: newInteractions,
      level: newLevel,
    });
    try {
      await addRelationshipXP(3, 'intimacy');
    } catch (e) {}
  };

  const handleFeed = () => {
    triggerAction('feed');
    doInteraction(p => ({
      ...p,
      hunger: clamp(p.hunger + 20, 0, 100),
    }), 523);
  };

  const handlePlay = () => {
    triggerAction('play');
    doInteraction(p => ({
      ...p,
      happiness: clamp(p.happiness + 15, 0, 100),
      energy: clamp(p.energy - 10, 0, 100),
    }), 660);
  };

  const handleSleep = () => {
    triggerAction('sleep');
    doInteraction(p => ({
      ...p,
      energy: clamp(p.energy + 25, 0, 100),
    }), 330);
  };

  const handleNameSave = () => {
    if (nameInput.trim()) {
      setPet(prev => ({ ...prev, name: nameInput.trim() }));
      playSound(880, 0.1);
    }
    setEditingName(false);
  };

  const handlePetTypeChange = (type: string) => {
    playSound(660, 0.08);
    setPet(prev => ({ ...prev, petType: type }));
  };

  const mood = getMood();
  const xpToNextLevel = 10 - (pet.interactions % 10);

  // Pet animation
  let petAnimation = 'lp-bounce 2s ease-in-out infinite';
  if (actionAnim) petAnimation = 'lp-action 0.6s ease-out';
  if (pet.energy < 20 && !actionAnim) petAnimation = 'lp-sleep 2s ease-in-out infinite';

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>
          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              LOVE PET
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">
        {/* Pet Name & Level */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
          <div className="flex items-center justify-between">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
                  className="bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-2 py-1 focus:outline-none flex-1"
                />
                <PixelButton onClick={handleNameSave} size="sm" className="text-[9px]">OK</PixelButton>
              </div>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setEditingName(true); setNameInput(pet.name); }}>
                <p className="font-['Press_Start_2P'] text-[10px] text-[#ff69b4]">{pet.name}</p>
                <span className="font-['VT323'] text-xs text-[#a0a0b0]">✏️</span>
              </div>
            )}
            <div className="text-right">
              <p className="font-['Press_Start_2P'] text-[8px] text-[#ffb300]">LV.{pet.level}</p>
              <p className="font-['VT323'] text-xs text-[#a0a0b0]">{xpToNextLevel} acts to next</p>
            </div>
          </div>
        </div>

        {/* Pet Display */}
        <div className="bg-[#1a1a2a] border-4 border-[#000000] shadow-[4px_4px_0_#000000] relative flex flex-col items-center justify-center py-8">
          {/* Mood */}
          <p className="font-['VT323'] text-lg text-[#a0a0b0] mb-2">{mood.emoji} {mood.text}</p>

          {/* Pet */}
          <div
            className="text-7xl sm:text-8xl select-none"
            style={{ animation: petAnimation }}
          >
            {getPetEmoji()}
          </div>

          {/* Action feedback */}
          {actionAnim && (
            <div className="absolute top-4 right-4 text-2xl" style={{ animation: 'lp-action 0.6s ease-out' }}>
              {actionAnim === 'feed' && '🍖'}
              {actionAnim === 'play' && '🎾'}
              {actionAnim === 'sleep' && '😴'}
            </div>
          )}

          {/* Pet type selector */}
          <div className="flex gap-3 mt-4">
            {PET_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => handlePetTypeChange(opt.type)}
                className={`w-10 h-10 text-2xl flex items-center justify-center border-2 transition-colors ${
                  pet.petType === opt.type ? 'border-[#ff69b4] bg-[#121224]' : 'border-[#000000] bg-[#0c0a18]'
                }`}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Stat Bars */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-3">
          <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-2">PET STATS</p>
          <StatBar label="Happiness" value={pet.happiness} color="#ff69b4" icon="😊" />
          <StatBar label="Hunger" value={pet.hunger} color="#ffb300" icon="🍖" />
          <StatBar label="Energy" value={pet.energy} color="#44cc44" icon="⚡" />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 flex flex-col items-center space-y-2">
            <span className="text-3xl select-none">🍖</span>
            <PixelButton onClick={handleFeed} size="sm" className="text-[8px] w-full">
              FEED
            </PixelButton>
            <p className="font-['VT323'] text-xs text-[#a0a0b0] text-center">Hunger +20</p>
          </div>
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 flex flex-col items-center space-y-2">
            <span className="text-3xl select-none">🎾</span>
            <PixelButton onClick={handlePlay} variant="accent" size="sm" className="text-[8px] w-full">
              PLAY
            </PixelButton>
            <p className="font-['VT323'] text-xs text-[#a0a0b0] text-center">Happy +15 Energy -10</p>
          </div>
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 flex flex-col items-center space-y-2">
            <span className="text-3xl select-none">😴</span>
            <PixelButton onClick={handleSleep} variant="secondary" size="sm" className="text-[8px] w-full">
              SLEEP
            </PixelButton>
            <p className="font-['VT323'] text-xs text-[#a0a0b0] text-center">Energy +25</p>
          </div>
        </div>

        {/* Interaction stats */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 flex items-center justify-between">
          <span className="font-['VT323'] text-sm text-[#a0a0b0]">Total Interactions</span>
          <span className="font-['Press_Start_2P'] text-[9px] text-[#ffb300]">{pet.interactions}</span>
        </div>

        {/* XP info */}
        <div className="text-center">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">+3 Intimacy XP per interaction</p>
        </div>
      </div>
    </div>
  );
};

export default LovePet;
