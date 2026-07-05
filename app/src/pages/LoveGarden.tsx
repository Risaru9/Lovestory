import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-love-garden';

interface FlowerPot {
  stage: number; // 0-4
  lastWateredBy: string;
  lastWateredAt: string | null;
}

interface GardenState {
  pots: FlowerPot[];
  waterCountA: number;
  waterCountB: number;
  lastWateredAt: string | null;
}

const STAGE_EMOJIS = ['🌱', '🌿', '🌷', '🌸', '🌺'];
const STAGE_LABELS = ['Seed', 'Sprout', 'Bud', 'Bloom', 'Full Bloom'];

const defaultGarden: GardenState = {
  pots: Array.from({ length: 6 }, () => ({
    stage: 0,
    lastWateredBy: '',
    lastWateredAt: null,
  })),
  waterCountA: 0,
  waterCountB: 0,
  lastWateredAt: null,
};

const loadGarden = (): GardenState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultGarden;
  } catch {
    return defaultGarden;
  }
};

const saveGarden = (data: GardenState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const playSound = (freq: number = 440, duration: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
  } catch (_e) { /* silent */ }
};

const LoveGarden: React.FC = () => {
  const navigate = useNavigate();
  const [garden, setGarden] = useState<GardenState>(loadGarden);
  const [waterAnim, setWaterAnim] = useState<number | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    const allFullBloom = garden.pots.every((p) => p.stage >= 4);
    setShowCongrats(allFullBloom);
  }, [garden]);

  const handleWater = useCallback(async (partner: 'A' | 'B') => {
    const growable = garden.pots
      .map((p, i) => ({ ...p, index: i }))
      .filter((p) => p.stage < 4);

    if (growable.length === 0) return;

    const target = growable[Math.floor(Math.random() * growable.length)];
    const now = new Date().toISOString();

    const newPots = garden.pots.map((p, i) =>
      i === target.index
        ? { ...p, stage: p.stage + 1, lastWateredBy: partner, lastWateredAt: now }
        : p
    );

    const updated: GardenState = {
      pots: newPots,
      waterCountA: partner === 'A' ? garden.waterCountA + 1 : garden.waterCountA,
      waterCountB: partner === 'B' ? garden.waterCountB + 1 : garden.waterCountB,
      lastWateredAt: now,
    };

    setGarden(updated);
    saveGarden(updated);
    setWaterAnim(target.index);

    playSound(523, 0.12);
    setTimeout(() => playSound(659, 0.12), 120);
    setTimeout(() => playSound(784, 0.15), 240);

    setTimeout(() => setWaterAnim(null), 600);

    try {
      await addRelationshipXP(5, 'intimacy');
    } catch (_e) { /* silent */ }
  }, [garden]);

  const handleReset = () => {
    setGarden(defaultGarden);
    saveGarden(defaultGarden);
    playSound(330, 0.2);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

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
              LOVE GARDEN 🌺
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">

        {/* Congrats banner */}
        {showCongrats && (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 text-center">
            <p className="text-2xl mb-2">💖🌺💖</p>
            <p className="font-['Press_Start_2P'] text-[10px] text-[#ff69b4] leading-relaxed">
              TAMAN CINTA KALIAN
            </p>
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] leading-relaxed mt-1">
              BERMEKARAN SEMPURNA!
            </p>
            <p className="font-['VT323'] text-lg text-[#ffb300] mt-2">
              Semua bunga telah mekar penuh! Kalian pasangan yang luar biasa! 🎉
            </p>
            <PixelButton onClick={handleReset} variant="accent" size="sm" className="mt-3 text-[9px]">
              🔄 TANAM ULANG
            </PixelButton>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 text-center">
            <p className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-1">PARTNER A</p>
            <p className="font-['VT323'] text-2xl text-[#ffb300]">💧 {garden.waterCountA}</p>
          </div>
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 text-center">
            <p className="font-['Press_Start_2P'] text-[8px] text-[#a0a0b0] mb-1">TERAKHIR</p>
            <p className="font-['VT323'] text-base text-[#a0a0b0]">{formatTime(garden.lastWateredAt)}</p>
          </div>
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 text-center">
            <p className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-1">PARTNER B</p>
            <p className="font-['VT323'] text-2xl text-[#ffb300]">💧 {garden.waterCountB}</p>
          </div>
        </div>

        {/* Flower grid */}
        <div className="grid grid-cols-3 gap-4">
          {garden.pots.map((pot, i) => (
            <div
              key={i}
              className={[
                'bg-[#1a1a2a] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 text-center transition-transform duration-300',
                waterAnim === i ? 'scale-110' : '',
              ].join(' ')}
            >
              <div className="text-4xl mb-2 select-none" style={{ transition: 'transform 0.3s' }}>
                {STAGE_EMOJIS[pot.stage]}
              </div>
              <p className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mb-1">
                POT {i + 1}
              </p>
              <p className="font-['VT323'] text-sm text-[#ffb300]">
                {STAGE_LABELS[pot.stage]}
              </p>
              {/* Stage progress bar */}
              <div className="mt-2 w-full h-2 bg-[#0c0a18] border border-[#000000]">
                <div
                  className="h-full bg-[#ff69b4] transition-all duration-300"
                  style={{ width: `${(pot.stage / 4) * 100}%` }}
                />
              </div>
              {pot.lastWateredBy && (
                <p className="font-['VT323'] text-xs text-[#a0a0b0] mt-1">
                  By {pot.lastWateredBy}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Water buttons */}
        <div className="flex gap-4 justify-center">
          <PixelButton
            onClick={() => handleWater('A')}
            variant="primary"
            size="md"
            disabled={garden.pots.every((p) => p.stage >= 4)}
            className="text-[9px]"
          >
            💧 SIRAM (A)
          </PixelButton>
          <PixelButton
            onClick={() => handleWater('B')}
            variant="accent"
            size="md"
            disabled={garden.pots.every((p) => p.stage >= 4)}
            className="text-[9px]"
          >
            💧 SIRAM (B)
          </PixelButton>
        </div>

        <div className="text-center">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
            Setiap siraman memberikan +5 Intimacy XP 💕
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoveGarden;
