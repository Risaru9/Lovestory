import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

interface SparkEntry {
  prompt: string;
  completedAt: string;
}

interface SparkStore {
  totalCompleted: number;
  currentStreak: number;
  lastCompletedDate: string;
  history: SparkEntry[];
}

const STORAGE_KEY = 'lovestory-spark-prompts';

const PROMPTS = [
  'Peluk pasanganmu dari belakang sekarang! 🤗',
  "Kirim pesan 'Aku kangen' sekarang! 💕",
  'Buatkan teh/kopi untuk pasanganmu ☕',
  'Ceritakan satu hal yang kamu kagumi dari pasanganmu 💖',
  'Nyanyikan satu bait lagu favorit kalian 🎵',
  'Kirim foto selfie terlucu yang kamu punya 🤳',
  'Tuliskan 3 alasan kamu mencintainya 💝',
  'Genggam tangannya selama 1 menit penuh 🤝',
  'Puji penampilannya hari ini secara spesifik 👀',
  'Kirim voice note bilang "Aku sayang kamu" 🎙️',
  'Siapkan camilan kejutan untuknya 🍪',
  'Tanyakan "Apa yang bisa kubantu hari ini?" 🙋',
  'Bagikan satu memori indah tentang kalian berdua 📸',
  'Tulis surat cinta mini di kertas kecil 💌',
  'Ajak dia jalan-jalan sebentar tanpa tujuan 🚶',
  'Pijat bahunya selama 2 menit 💆',
  'Kirim emoji hati sebanyak yang kamu bisa ❤️',
  'Ceritakan mimpimu tentang masa depan kalian 🌟',
  'Masak sesuatu yang dia suka, sekecil apapun 🍳',
  'Bilang "Terima kasih sudah ada di hidupku" 🙏',
  'Buat playlist lagu yang mengingatkanmu padanya 🎶',
  'Tanyakan apa lagu yang sedang dia dengarkan 🎧',
  'Ambilkan air minum untuknya tanpa diminta 💧',
  'Cium keningnya dengan lembut 😘',
  'Rencanakan satu kencan mini minggu ini 📅',
  'Kirim meme lucu yang bikin dia ketawa 😂',
  'Ucapkan selamat pagi dengan cara yang berbeda 🌅',
  'Tanyakan tentang harinya dan dengarkan sungguh-sungguh 👂',
  'Ajak foto berdua sekarang juga 📷',
  'Bilang satu hal yang membuatmu jatuh cinta pertama kali 💘',
];

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
  } catch (e) { /* silent */ }
};

const loadData = (): SparkStore => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return { totalCompleted: 0, currentStreak: 0, lastCompletedDate: '', history: [] };
};

const saveData = (data: SparkStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const getRandomPrompt = (exclude?: string): string => {
  const available = exclude ? PROMPTS.filter(p => p !== exclude) : PROMPTS;
  return available[Math.floor(Math.random() * available.length)];
};

const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const SparkPrompt: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<SparkStore>(loadData);
  const [currentPrompt, setCurrentPrompt] = useState(() => getRandomPrompt());
  const [isPulsing, setIsPulsing] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Pulse effect on new spark
  useEffect(() => {
    if (isPulsing) {
      const timer = setTimeout(() => setIsPulsing(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isPulsing]);

  const handleNewSpark = useCallback(() => {
    playSound(880, 0.08);
    setTimeout(() => playSound(1100, 0.08), 80);
    const newPrompt = getRandomPrompt(currentPrompt);
    setCurrentPrompt(newPrompt);
    setIsPulsing(true);
  }, [currentPrompt]);

  const handleDone = useCallback(async () => {
    playSound(660, 0.15);
    setTimeout(() => playSound(880, 0.15), 120);

    const today = getDateString(new Date());
    const yesterday = getDateString(new Date(Date.now() - 86400000));

    let newStreak = data.currentStreak;
    if (data.lastCompletedDate === today) {
      // Already completed today, streak stays
    } else if (data.lastCompletedDate === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const entry: SparkEntry = {
      prompt: currentPrompt,
      completedAt: new Date().toISOString(),
    };

    const newData: SparkStore = {
      totalCompleted: data.totalCompleted + 1,
      currentStreak: newStreak,
      lastCompletedDate: today,
      history: [entry, ...data.history].slice(0, 100), // Keep last 100
    };

    setData(newData);

    // Award +5 Intimacy XP
    try { await addRelationshipXP(5, 'intimacy'); } catch { /* silent */ }

    // Get next prompt
    const newPrompt = getRandomPrompt(currentPrompt);
    setCurrentPrompt(newPrompt);
    setIsPulsing(true);
  }, [data, currentPrompt]);

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
              SPARK PROMPT
            </h1>
          </div>
          <PixelButton onClick={() => setShowHistory(!showHistory)} variant="secondary" size="sm" className="text-[9px] shrink-0">
            {showHistory ? '← BACK' : 'LOG'}
          </PixelButton>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">

        {showHistory ? (
          /* History View */
          <div className="space-y-4">
            <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
              <h2 className="font-['Press_Start_2P'] text-[10px] text-[#ffb300] mb-4">SPARK LOG</h2>
              {data.history.length === 0 ? (
                <p className="font-['VT323'] text-lg text-[#a0a0b0] text-center py-6">
                  Belum ada spark yang selesai. Mulai sekarang!
                </p>
              ) : (
                <div className="space-y-2">
                  {data.history.map((entry, i) => (
                    <div key={i} className="bg-[#1a1a2a] border-4 border-[#000000] p-3">
                      <p className="font-['VT323'] text-base text-[#ffffff] mb-1">{entry.prompt}</p>
                      <p className="font-['VT323'] text-xs text-[#a0a0b0]">
                        {new Date(entry.completedAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Main Spark View */
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 text-center">
                <p className="font-['VT323'] text-sm text-[#a0a0b0]">Total Sparks</p>
                <p className="font-['Press_Start_2P'] text-[12px] text-[#ff69b4]">{data.totalCompleted}</p>
              </div>
              <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 text-center">
                <p className="font-['VT323'] text-sm text-[#a0a0b0]">Streak</p>
                <p className="font-['Press_Start_2P'] text-[12px] text-[#ffb300]">{data.currentStreak}🔥</p>
              </div>
              <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 text-center">
                <p className="font-['VT323'] text-sm text-[#a0a0b0]">Total XP</p>
                <p className="font-['Press_Start_2P'] text-[12px] text-[#ffb300]">{data.totalCompleted * 5}</p>
              </div>
            </div>

            {/* RPG Dialog Box */}
            <div
              className={[
                'bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-5 transition-all duration-300',
                isPulsing ? 'spark-pulse' : '',
              ].join(' ')}
            >
              {/* Dialog Header */}
              <div className="flex items-center gap-2 mb-4 border-b-2 border-[#1a1a2a] pb-3">
                <span className="text-xl spark-bolt">⚡</span>
                <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ffb300]">ROMANTIC SPARK!</h2>
              </div>

              {/* Prompt Display */}
              <div className="bg-[#1a1a2a] border-4 border-[#000000] p-5 mb-5 min-h-[100px] flex items-center justify-center">
                <p className="font-['VT323'] text-xl md:text-2xl text-[#ffffff] text-center leading-relaxed">
                  {currentPrompt}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <PixelButton onClick={handleNewSpark} variant="secondary" size="md" className="text-[9px]">
                  ⚡ NEW SPARK!
                </PixelButton>
                <PixelButton onClick={handleDone} variant="accent" size="md" className="text-[9px]">
                  ✓ DONE! +5 XP
                </PixelButton>
              </div>
            </div>

            {/* Fun Stat */}
            <div className="bg-[#1a1a2a] border-4 border-[#000000] p-3 text-center">
              <p className="font-['VT323'] text-base text-[#a0a0b0]">
                Total romantic actions taken: <span className="text-[#ff69b4] font-bold">{data.totalCompleted}</span>
              </p>
              <p className="font-['VT323'] text-sm text-[#a0a0b0]/60 mt-1">
                Setiap spark selesai: +5 Intimacy XP
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spark-pulse-anim {
          0% { box-shadow: 4px 4px 0 #000000; }
          50% { box-shadow: 4px 4px 0 #000000, 0 0 0 3px rgba(255,179,0,0.3); }
          100% { box-shadow: 4px 4px 0 #000000; }
        }
        .spark-pulse {
          animation: spark-pulse-anim 0.75s ease-in-out 2;
        }
        @keyframes bolt-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .spark-bolt {
          animation: bolt-flicker 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SparkPrompt;
