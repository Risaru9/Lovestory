import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-heartbeat-sync';

interface HeartbeatData {
  totalHeartbeats: number;
  lastReceivedTimestamp: string | null;
  sessions: number;
}

const DEFAULT_DATA: HeartbeatData = {
  totalHeartbeats: 0,
  lastReceivedTimestamp: null,
  sessions: 0,
};

const loadData = (): HeartbeatData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_DATA;
};

const saveData = (data: HeartbeatData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const playHeartbeatSound = (fast: boolean = false) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    const baseFreq = fast ? 520 : 440;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.setValueAtTime(baseFreq * 0.8, ctx.currentTime + 0.05);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (_e) { /* ignored */ }
};

const playSessionCompleteSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (_e) { /* ignored */ }
};

// CSS for floating hearts and ripple animations injected via style tag
const HEARTBEAT_STYLES = `
@keyframes floatHeart {
  0% { transform: translateY(0) scale(1); opacity: 0.6; }
  50% { opacity: 0.3; }
  100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
}
@keyframes heartPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
@keyframes heartPulseFast {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}
@keyframes rippleExpand {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(3); opacity: 0; }
}
`;

const HeartbeatSync: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HeartbeatData>(loadData);
  const [isHolding, setIsHolding] = useState(false);
  const [sessionBeats, setSessionBeats] = useState(0);
  const [ripples, setRipples] = useState<number[]>([]);
  const [showReward, setShowReward] = useState(false);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleIdRef = useRef(0);

  // Inject keyframe styles
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = HEARTBEAT_STYLES;
    document.head.appendChild(styleEl);
    return () => { document.head.removeChild(styleEl); };
  }, []);

  // Generate floating hearts positions
  const floatingHearts = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 6,
      size: 10 + Math.random() * 14,
    }))
  ).current;

  const addRipple = useCallback(() => {
    const id = rippleIdRef.current++;
    setRipples(prev => [...prev, id]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r !== id));
    }, 800);
  }, []);

  const startHolding = useCallback(() => {
    setIsHolding(true);
    setSessionBeats(0);

    // Start rapid heartbeat
    beatIntervalRef.current = setInterval(() => {
      setSessionBeats(prev => prev + 1);
      setData(prev => {
        const updated = { ...prev, totalHeartbeats: prev.totalHeartbeats + 1 };
        saveData(updated);
        return updated;
      });
      playHeartbeatSound(true);
      addRipple();

      // Haptic vibration
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 400);
  }, [addRipple]);

  const stopHolding = useCallback(async () => {
    setIsHolding(false);
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }

    if (sessionBeats > 0) {
      // Award XP
      await addRelationshipXP(3, 'intimacy');
      playSessionCompleteSound();

      setData(prev => {
        const updated = {
          ...prev,
          sessions: prev.sessions + 1,
          lastReceivedTimestamp: new Date().toISOString(),
        };
        saveData(updated);
        return updated;
      });

      setShowReward(true);
      setTimeout(() => setShowReward(false), 3000);
    }
    setSessionBeats(0);
  }, [sessionBeats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    };
  }, []);

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Belum ada';
    return new Date(ts).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
      {/* Floating pixel hearts background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {floatingHearts.map(h => (
          <div
            key={h.id}
            className="absolute select-none"
            style={{
              left: `${h.left}%`,
              bottom: '-20px',
              fontSize: `${h.size}px`,
              animation: `floatHeart ${h.duration}s linear ${h.delay}s infinite`,
              opacity: 0.15,
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>
          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              HEARTBEAT SYNC
            </h1>
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider hidden sm:block font-bold">
              Rasakan kehadiran pasanganmu
            </p>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Reward Notification */}
      {showReward && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121224] border-4 border-[#000000] p-4 text-center shadow-[4px_4px_0_#000000] animate-bounce w-[90%] max-w-sm">
          <div className="font-['Press_Start_2P'] text-[#ffb300] text-[9px] mb-2 font-bold">
            💗 HEARTBEAT SENT!
          </div>
          <p className="font-['VT323'] text-white text-lg font-bold">
            Sesi detak jantung selesai! +3 Intimacy XP 💖
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">

        {/* Stats Bar */}
        <div className="bg-[#121224] border-4 border-[#000000] p-3 shadow-[4px_4px_0_#000000] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">💗</span>
            <div>
              <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold">
                TOTAL HEARTBEATS
              </h3>
              <p className="font-['VT323'] text-xl text-[#ffb300] font-bold">
                {data.totalHeartbeats.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] font-bold">
              SESSIONS
            </h3>
            <p className="font-['VT323'] text-lg text-[#ffffff] font-bold">
              {data.sessions}
            </p>
          </div>
        </div>

        {/* Heart Area */}
        <div className="bg-[#121224] border-4 border-[#000000] p-6 shadow-[4px_4px_0_#000000] flex flex-col items-center justify-center min-h-[280px] relative">
          {/* Ripple effects */}
          {ripples.map(id => (
            <div
              key={id}
              className="absolute rounded-full border-2 border-[#ff69b4] pointer-events-none"
              style={{
                width: '80px',
                height: '80px',
                top: '50%',
                left: '50%',
                marginTop: '-40px',
                marginLeft: '-40px',
                animation: 'rippleExpand 0.8s ease-out forwards',
              }}
            />
          ))}

          {/* Main heart */}
          <div
            className="select-none relative z-10"
            style={{
              fontSize: '80px',
              animation: isHolding
                ? 'heartPulseFast 0.3s ease-in-out infinite'
                : 'heartPulse 1.5s ease-in-out infinite',
              filter: isHolding ? 'brightness(1.3)' : 'brightness(1)',
              transition: 'filter 0.2s',
            }}
          >
            ❤️
          </div>

          {/* Session beat counter */}
          {isHolding && (
            <div className="mt-4 font-['Press_Start_2P'] text-[10px] text-[#ffb300] animate-pulse">
              💓 {sessionBeats} BEATS
            </div>
          )}

          {!isHolding && (
            <p className="mt-4 font-['VT323'] text-base text-[#a0a0b0] text-center select-none">
              Tekan dan tahan tombol di bawah untuk mengirim detak jantungmu
            </p>
          )}
        </div>

        {/* Press & Hold Button */}
        <div className="flex justify-center">
          <button
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            onMouseLeave={() => { if (isHolding) stopHolding(); }}
            onTouchStart={(e) => { e.preventDefault(); startHolding(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopHolding(); }}
            className={`
              font-['Press_Start_2P'] text-[10px] px-8 py-4
              border-4 border-[#000000] shadow-[4px_4px_0_#000000]
              transition-all duration-100 select-none
              ${isHolding
                ? 'bg-[#ff1493] text-white translate-x-1 translate-y-1 shadow-[2px_2px_0_#000000]'
                : 'bg-[#ff69b4] text-white hover:bg-[#ff1493] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000000]'
              }
              active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_#000000]
            `}
          >
            {isHolding ? '💓 SENDING...' : '💗 PRESS & HOLD'}
          </button>
        </div>

        {/* Last Received */}
        <div className="bg-[#121224] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000]">
          <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 font-bold">
            📨 LAST HEARTBEAT SESSION
          </h3>
          <div className="bg-[#1a1a2a] border-2 border-[#000000] p-3 flex items-center gap-3">
            <span className="text-xl select-none">🕐</span>
            <p className="font-['VT323'] text-lg text-[#ffffff]">
              {formatTimestamp(data.lastReceivedTimestamp)}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-[#1a1a2a] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000]">
          <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] mb-3 font-bold">
            💡 CARA BERMAIN
          </h3>
          <ul className="space-y-2 font-['VT323'] text-base text-[#a0a0b0]">
            <li>• Tekan dan tahan tombol untuk mengirim detak jantung</li>
            <li>• Semakin lama menekan, semakin banyak detak yang terkirim</li>
            <li>• Setiap sesi selesai memberikan +3 Intimacy XP</li>
            <li>• Perangkat akan bergetar setiap detak (jika didukung)</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default HeartbeatSync;
