import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

// --- Types ---
interface Bottle {
  id: string;
  message: string;
  sentAt: number;
  revealedAt?: number;
  revealed: boolean;
}

interface BottleData {
  bottles: Bottle[];
  sentCount: number;
  receivedCount: number;
}

const STORAGE_KEY = 'lovestory-message-bottles';

const defaultData: BottleData = {
  bottles: [],
  sentCount: 0,
  receivedCount: 0,
};

const loadData = (): BottleData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : defaultData;
};

const saveData = (data: BottleData) => {
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

// --- CSS Keyframes injected once ---
const styleId = 'message-bottle-styles';
const injectStyles = () => {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes mb-wave {
      0% { background-position-x: 0; }
      100% { background-position-x: 200px; }
    }
    @keyframes mb-float {
      0%, 100% { transform: translateY(0px) rotate(-5deg); }
      50% { transform: translateY(-12px) rotate(5deg); }
    }
    @keyframes mb-slide-out {
      0% { opacity: 1; transform: translateX(0) scale(1); }
      100% { opacity: 0; transform: translateX(200px) scale(0.5); }
    }
    @keyframes mb-slide-in {
      0% { opacity: 0; transform: translateX(-100px) scale(0.5); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
};

const MessageBottle: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BottleData>(loadData);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingBottles, setPendingBottles] = useState<Bottle[]>([]);
  const timerRefs = useRef<number[]>([]);

  useEffect(() => {
    injectStyles();
  }, []);

  // On page load, simulate "receiving" unrevealed bottles after random delay
  useEffect(() => {
    const current = loadData();
    const undelivered = current.bottles.filter(b => !b.revealed && !b.revealedAt);
    undelivered.forEach((bottle) => {
      const delay = (Math.floor(Math.random() * 5) + 1) * 1000;
      const timer = window.setTimeout(() => {
        setPendingBottles(prev => {
          if (prev.find(p => p.id === bottle.id)) return prev;
          return [...prev, bottle];
        });
        playSound(523, 0.15);
      }, delay);
      timerRefs.current.push(timer);
    });

    return () => {
      timerRefs.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    playSound(660, 0.12);

    const newBottle: Bottle = {
      id: `bottle-${Date.now()}`,
      message: message.trim(),
      sentAt: Date.now(),
      revealed: false,
    };

    const updated = {
      ...data,
      bottles: [newBottle, ...data.bottles],
      sentCount: data.sentCount + 1,
    };
    setData(updated);
    saveData(updated);
    setMessage('');

    try {
      await addRelationshipXP(5, 'trust');
    } catch (e) {}

    // Simulate the bottle arriving after random delay
    const delay = (Math.floor(Math.random() * 5) + 1) * 1000;
    const timer = window.setTimeout(() => {
      setPendingBottles(prev => {
        if (prev.find(p => p.id === newBottle.id)) return prev;
        return [...prev, newBottle];
      });
      playSound(523, 0.15);
    }, delay);
    timerRefs.current.push(timer);

    setTimeout(() => setSending(false), 800);
  };

  const handleReveal = (bottleId: string) => {
    playSound(880, 0.15);
    const updated = {
      ...data,
      bottles: data.bottles.map(b =>
        b.id === bottleId ? { ...b, revealed: true, revealedAt: Date.now() } : b
      ),
      receivedCount: data.receivedCount + 1,
    };
    setData(updated);
    saveData(updated);
    setPendingBottles(prev => prev.filter(p => p.id !== bottleId));
  };

  const receivedBottles = data.bottles.filter(b => b.revealed);
  const arrivedPending = pendingBottles.filter(p => !data.bottles.find(b => b.id === p.id && b.revealed));

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
              MESSAGE BOTTLE
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">
        {/* Stats */}
        <div className="flex gap-4 justify-center">
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] px-4 py-2 text-center">
            <p className="font-['VT323'] text-[#a0a0b0] text-sm">Sent</p>
            <p className="font-['Press_Start_2P'] text-[10px] text-[#ff69b4]">{data.sentCount}</p>
          </div>
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] px-4 py-2 text-center">
            <p className="font-['VT323'] text-[#a0a0b0] text-sm">Received</p>
            <p className="font-['Press_Start_2P'] text-[10px] text-[#ffb300]">{data.receivedCount}</p>
          </div>
        </div>

        {/* Ocean scene with floating bottle */}
        <div className="relative bg-[#1a1a2a] border-4 border-[#000000] shadow-[4px_4px_0_#000000] h-32 flex items-center justify-center overflow-hidden">
          <div
            className="text-5xl select-none"
            style={{
              animation: sending ? 'mb-slide-out 0.8s ease-in forwards' : 'mb-float 3s ease-in-out infinite',
            }}
          >
            🍾
          </div>
          {/* Wave overlay at bottom */}
          <div
            className="absolute bottom-0 left-0 w-full h-8"
            style={{
              background: 'repeating-linear-gradient(90deg, transparent 0px, rgba(255,105,180,0.15) 25px, transparent 50px, rgba(255,179,0,0.1) 75px, transparent 100px)',
              backgroundSize: '200px 100%',
              animation: 'mb-wave 4s linear infinite',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-4"
            style={{
              background: 'repeating-linear-gradient(90deg, transparent 0px, rgba(255,105,180,0.25) 30px, transparent 60px)',
              backgroundSize: '200px 100%',
              animation: 'mb-wave 2.5s linear infinite',
            }}
          />
        </div>

        {/* Compose form */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-3">
          <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">WRITE A SECRET MESSAGE</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="Type your secret message..."
            maxLength={200}
            rows={3}
            className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg p-3 resize-none focus:outline-none placeholder-[#a0a0b0]"
          />
          <div className="flex justify-between items-center">
            <span className="font-['VT323'] text-sm text-[#a0a0b0]">{message.length}/200</span>
            <PixelButton
              onClick={handleSend}
              disabled={!message.trim() || sending}
              size="sm"
              className="text-[9px]"
            >
              {sending ? 'SENDING...' : 'SEND BOTTLE 🍾'}
            </PixelButton>
          </div>
          <p className="font-['VT323'] text-xs text-[#a0a0b0]">+5 Trust XP per bottle sent</p>
        </div>

        {/* Pending bottles (arrived, not yet opened) */}
        {arrivedPending.length > 0 && (
          <div className="space-y-3">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ffb300]">🍾 BOTTLES ARRIVED!</p>
            {arrivedPending.map((bottle) => (
              <div
                key={bottle.id}
                onClick={() => handleReveal(bottle.id)}
                className="bg-[#1a1a2a] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 cursor-pointer hover:bg-[#121224] transition-colors"
                style={{ animation: 'mb-slide-in 0.5s ease-out' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl" style={{ animation: 'mb-float 2s ease-in-out infinite' }}>🍾</span>
                  <div>
                    <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">SEALED BOTTLE</p>
                    <p className="font-['VT323'] text-sm text-[#a0a0b0]">Tap to open...</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Received (opened) bottles */}
        {receivedBottles.length > 0 && (
          <div className="space-y-3">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ffffff]">📜 OPENED BOTTLES</p>
            {receivedBottles.map((bottle) => (
              <div
                key={bottle.id}
                className="bg-[#1a1a2a] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4"
              >
                <p className="font-['VT323'] text-lg text-[#ffffff]">{bottle.message}</p>
                <p className="font-['VT323'] text-xs text-[#a0a0b0] mt-2">
                  {new Date(bottle.sentAt).toLocaleDateString()} · {new Date(bottle.sentAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wave animation at the very bottom */}
      <div className="shrink-0 w-full h-6 relative z-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'repeating-linear-gradient(90deg, #1a1a2a 0px, #121224 25px, #1a1a2a 50px, #0c0a18 75px, #1a1a2a 100px)',
            backgroundSize: '200px 100%',
            animation: 'mb-wave 3s linear infinite',
          }}
        />
      </div>
    </div>
  );
};

export default MessageBottle;
