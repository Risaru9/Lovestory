import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

// --- Types ---
interface SpinRecord {
  id: string;
  result: string;
  timestamp: number;
}

interface WheelData {
  options: string[];
  history: SpinRecord[];
}

const STORAGE_KEY = 'lovestory-fortune-wheel';

const DEFAULT_OPTIONS = [
  'Makan Ramen 🍜',
  'Nonton Bioskop 🎬',
  'Jalan Kaki 🚶',
  'Masak Bersama 👨‍🍳',
  'Main Game 🎮',
  'Piknik 🧺',
  'Karaoke 🎤',
  'Coffee Date ☕',
];

const SEGMENT_COLORS = [
  '#ff69b4',
  '#1a1a2a',
  '#ffb300',
  '#121224',
  '#ff69b4',
  '#1a1a2a',
  '#ffb300',
  '#121224',
];

const loadData = (): WheelData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    return {
      options: parsed.options || DEFAULT_OPTIONS,
      history: parsed.history || [],
    };
  }
  return { options: [...DEFAULT_OPTIONS], history: [] };
};

const saveData = (data: WheelData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
const styleId = 'fortune-wheel-styles';
const injectStyles = () => {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes fw-result-pop {
      0% { transform: scale(0.5); opacity: 0; }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
};

const FortuneWheel: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<WheelData>(loadData);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOption, setNewOption] = useState('');
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  const segmentAngle = 360 / data.options.length;

  const buildConicGradient = () => {
    const segments = data.options.map((_, i) => {
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      const start = (i * segmentAngle).toFixed(2);
      const end = ((i + 1) * segmentAngle).toFixed(2);
      return `${color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  };

  const handleSpin = async () => {
    if (spinning || data.options.length === 0) return;
    setSpinning(true);
    setResult(null);
    playSound(440, 0.08);

    // Random 3-5 full turns plus a random offset
    const fullTurns = (Math.floor(Math.random() * 3) + 3) * 360;
    const randomOffset = Math.random() * 360;
    const totalRotation = currentRotation + fullTurns + randomOffset;

    setCurrentRotation(totalRotation);

    if (wheelRef.current) {
      wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    // Determine which segment the pointer (at top) lands on
    setTimeout(async () => {
      // The pointer is at the top (0deg). We need to figure out which segment is at the top.
      // After rotation, the effective angle at the top is (360 - (totalRotation % 360)) % 360
      const effectiveAngle = (360 - (totalRotation % 360)) % 360;
      const segIndex = Math.floor(effectiveAngle / segmentAngle) % data.options.length;
      const chosenOption = data.options[segIndex];

      setResult(chosenOption);
      playSound(880, 0.2);

      const newRecord: SpinRecord = {
        id: `spin-${Date.now()}`,
        result: chosenOption,
        timestamp: Date.now(),
      };

      const updated = {
        ...data,
        history: [newRecord, ...data.history].slice(0, 50),
      };
      setData(updated);
      saveData(updated);

      try {
        await addRelationshipXP(3, 'intimacy');
      } catch (e) {}

      setSpinning(false);
    }, 4200);
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    playSound(660, 0.1);
    const updated = {
      ...data,
      options: [...data.options, newOption.trim()],
    };
    setData(updated);
    saveData(updated);
    setNewOption('');
    setShowAddForm(false);
  };

  const removeOption = (idx: number) => {
    if (data.options.length <= 2) return; // need at least 2 options
    playSound(330, 0.08);
    const updated = {
      ...data,
      options: data.options.filter((_, i) => i !== idx),
    };
    setData(updated);
    saveData(updated);
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
              FORTUNE WHEEL
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">
        {/* Wheel Container */}
        <div className="flex flex-col items-center space-y-4">
          {/* Pointer */}
          <div className="text-2xl select-none">▼</div>

          {/* Wheel */}
          <div className="relative w-full max-w-[280px] max-h-[280px] aspect-square sm:max-w-[320px] sm:max-h-[320px]">
            <div
              ref={wheelRef}
              className="w-full h-full rounded-full border-4 border-[#000000] shadow-[4px_4px_0_#000000] overflow-hidden"
              style={{
                background: buildConicGradient(),
                transform: `rotate(${currentRotation}deg)`,
              }}
            >
              {/* Segment labels */}
              {data.options.map((option, i) => {
                const angle = i * segmentAngle + segmentAngle / 2;
                // Extract just the emoji or truncate for the wheel
                const label = option.length > 12 ? option.slice(0, 10) + '..' : option;
                return (
                  <div
                    key={i}
                    className="absolute top-0 left-1/2 h-1/2 origin-bottom"
                    style={{
                      transform: `translateX(-50%) rotate(${angle}deg)`,
                      width: '2px',
                    }}
                  >
                    <span
                      className="absolute font-['VT323'] text-xs text-[#ffffff] whitespace-nowrap"
                      style={{
                        top: '8px',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(180deg)',
                        textShadow: '1px 1px 0 #000000, -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#121224] border-4 border-[#000000] rounded-full -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* Spin button */}
          <PixelButton
            onClick={handleSpin}
            disabled={spinning || data.options.length < 2}
            size="lg"
            className="text-[10px]"
          >
            {spinning ? '🎰 SPINNING...' : '🎰 SPIN!'}
          </PixelButton>
          <p className="font-['VT323'] text-xs text-[#a0a0b0]">+3 Intimacy XP per spin</p>
        </div>

        {/* Result */}
        {result && (
          <div
            className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 text-center"
            style={{ animation: 'fw-result-pop 0.4s ease-out' }}
          >
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-2">YOUR DATE IS:</p>
            <p className="font-['VT323'] text-2xl text-[#ffb300]">{result}</p>
          </div>
        )}

        {/* Options management */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-3">
          <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">WHEEL OPTIONS</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.options.map((opt, i) => (
              <div key={i} className="flex items-center justify-between bg-[#1a1a2a] border-2 border-[#000000] px-3 py-1">
                <span className="font-['VT323'] text-base text-[#ffffff] truncate flex-1">{opt}</span>
                <button
                  onClick={() => removeOption(i)}
                  className="font-['VT323'] text-sm text-[#a0a0b0] hover:text-[#ff69b4] ml-2"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {!showAddForm ? (
            <PixelButton onClick={() => { setShowAddForm(true); playSound(440, 0.08); }} variant="secondary" size="sm" className="text-[9px] w-full">
              + ADD OPTION
            </PixelButton>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="New date idea..."
                maxLength={30}
                className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg p-2 focus:outline-none placeholder-[#a0a0b0]"
              />
              <div className="flex gap-2">
                <PixelButton onClick={addOption} disabled={!newOption.trim()} size="sm" className="text-[9px]">
                  ADD
                </PixelButton>
                <PixelButton onClick={() => { setShowAddForm(false); setNewOption(''); }} variant="secondary" size="sm" className="text-[9px]">
                  CANCEL
                </PixelButton>
              </div>
            </div>
          )}
        </div>

        {/* Spin History */}
        {data.history.length > 0 && (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-3">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ffffff]">SPIN HISTORY</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.history.slice(0, 20).map((record) => (
                <div key={record.id} className="flex items-center justify-between bg-[#1a1a2a] border-2 border-[#000000] px-3 py-1">
                  <span className="font-['VT323'] text-base text-[#ffb300]">{record.result}</span>
                  <span className="font-['VT323'] text-xs text-[#a0a0b0]">
                    {new Date(record.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FortuneWheel;
