import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

interface WeekData {
  weekNumber: number;
  year: number;
  challenges: boolean[];
  completedAt?: string;
}

interface ChallengeStore {
  currentWeek: WeekData;
  history: WeekData[];
}

const STORAGE_KEY = 'lovestory-adventure-challenge';

const DAILY_CHALLENGES = [
  { day: 'Senin', text: 'Kirim 1 foto langit hari ini 📸' },
  { day: 'Selasa', text: 'Beri pujian pagi hari 💬' },
  { day: 'Rabu', text: 'Masak makan malam bersama 🍳' },
  { day: 'Kamis', text: 'Tulis surat kecil untuk pasangan 💌' },
  { day: 'Jumat', text: 'Jalan kaki 15 menit bersama 🚶' },
  { day: 'Sabtu', text: 'Bagikan 3 hal yang kamu syukuri hari ini 🙏' },
  { day: 'Minggu', text: 'Peluk pasanganmu 3 kali hari ini 🤗' },
];

const getISOWeek = (date: Date): { week: number; year: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
};

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

const playFanfare = () => {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playSound(freq, 0.2), i * 150);
  });
};

const loadData = (): ChallengeStore => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  const { week, year } = getISOWeek(new Date());
  return {
    currentWeek: { weekNumber: week, year, challenges: Array(7).fill(false) },
    history: [],
  };
};

const saveData = (data: ChallengeStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const AdventureChallenge: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ChallengeStore>(loadData);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Check if we need a new week
  useEffect(() => {
    const { week, year } = getISOWeek(new Date());
    if (data.currentWeek.weekNumber !== week || data.currentWeek.year !== year) {
      const allDone = data.currentWeek.challenges.every(Boolean);
      const newHistory = allDone
        ? [...data.history, { ...data.currentWeek, completedAt: new Date().toISOString() }]
        : data.history;
      const newData: ChallengeStore = {
        currentWeek: { weekNumber: week, year, challenges: Array(7).fill(false) },
        history: newHistory,
      };
      setData(newData);
      saveData(newData);
    }
  }, [data]);

  const completedCount = data.currentWeek.challenges.filter(Boolean).length;
  const allCompleted = completedCount === 7;

  const handleToggle = useCallback(async (index: number) => {
    if (data.currentWeek.challenges[index]) return;

    playSound(660, 0.12);

    const newChallenges = [...data.currentWeek.challenges];
    newChallenges[index] = true;
    const newData: ChallengeStore = {
      ...data,
      currentWeek: { ...data.currentWeek, challenges: newChallenges },
    };

    // Award +15 Trust XP per challenge
    try { await addRelationshipXP(15, 'trust'); } catch { /* silent */ }

    const nowAllDone = newChallenges.every(Boolean);
    if (nowAllDone) {
      // Award +25 Intimacy XP for completing all 7
      try { await addRelationshipXP(25, 'intimacy'); } catch { /* silent */ }
      playFanfare();
      setShowCelebration(true);
    }

    setData(newData);
    saveData(newData);
  }, [data]);

  const handleResetWeek = useCallback(() => {
    const { week, year } = getISOWeek(new Date());
    const newData: ChallengeStore = {
      currentWeek: { weekNumber: week, year, challenges: Array(7).fill(false) },
      history: [...data.history, { ...data.currentWeek, completedAt: new Date().toISOString() }],
    };
    setData(newData);
    saveData(newData);
    setShowCelebration(false);
    playSound(330, 0.15);
  }, [data]);

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
              ADVENTURE QUEST
            </h1>
          </div>
          <PixelButton onClick={() => setShowHistory(!showHistory)} variant="secondary" size="sm" className="text-[9px] shrink-0">
            {showHistory ? '← BACK' : 'LOG'}
          </PixelButton>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">

        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0a18]/90">
            <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-6 text-center space-y-4 max-w-sm mx-4">
              <div className="text-5xl animate-bounce">🏆</div>
              <h2 className="font-['Press_Start_2P'] text-[12px] text-[#ffb300] leading-relaxed">
                QUEST COMPLETE!
              </h2>
              <p className="font-['VT323'] text-lg text-[#ffffff]">
                Semua 7 tantangan minggu ini selesai!
              </p>
              <div className="space-y-1">
                <p className="font-['VT323'] text-base text-[#ff69b4]">+15 Trust XP × 7 = +105 Trust XP</p>
                <p className="font-['VT323'] text-base text-[#ffb300]">+25 Intimacy XP bonus!</p>
              </div>
              <PixelButton onClick={handleResetWeek} variant="accent" size="md">
                NEXT WEEK →
              </PixelButton>
            </div>
          </div>
        )}

        {showHistory ? (
          /* History View */
          <div className="space-y-4">
            <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
              <h2 className="font-['Press_Start_2P'] text-[10px] text-[#ffb300] mb-4">QUEST LOG</h2>
              {data.history.length === 0 ? (
                <p className="font-['VT323'] text-lg text-[#a0a0b0] text-center py-6">
                  Belum ada minggu yang selesai. Ayo mulai!
                </p>
              ) : (
                <div className="space-y-3">
                  {data.history.map((week, i) => {
                    const score = week.challenges.filter(Boolean).length;
                    return (
                      <div key={i} className="bg-[#1a1a2a] border-4 border-[#000000] p-3 flex items-center justify-between">
                        <div>
                          <p className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4]">
                            WEEK {week.weekNumber} · {week.year}
                          </p>
                          {week.completedAt && (
                            <p className="font-['VT323'] text-sm text-[#a0a0b0] mt-1">
                              {new Date(week.completedAt).toLocaleDateString('id-ID')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-['Press_Start_2P'] text-[10px] text-[#ffb300]">{score}/7</span>
                          {score === 7 && <span className="text-lg">🏆</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Main Quest Board */
          <>
            {/* Week Info & Progress */}
            <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">
                  MINGGU {data.currentWeek.weekNumber}
                </span>
                <span className="font-['Press_Start_2P'] text-[9px] text-[#ffb300]">
                  {completedCount}/7
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-5 bg-[#1a1a2a] border-4 border-[#000000] relative">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(completedCount / 7) * 100}%`,
                    backgroundColor: allCompleted ? '#ffb300' : '#ff69b4',
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-['VT323'] text-sm text-[#ffffff]">
                  {Math.round((completedCount / 7) * 100)}%
                </span>
              </div>
            </div>

            {/* Quest Board */}
            <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
              <div className="flex items-center gap-2 mb-4 border-b-2 border-[#1a1a2a] pb-3">
                <span className="text-lg">📋</span>
                <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ffb300]">PAPAN MISI</h2>
              </div>

              <div className="space-y-2">
                {DAILY_CHALLENGES.map((challenge, index) => {
                  const done = data.currentWeek.challenges[index];
                  return (
                    <button
                      key={index}
                      onClick={() => handleToggle(index)}
                      disabled={done}
                      className={[
                        'w-full text-left p-3 border-4 transition-all duration-150 flex items-start gap-3',
                        done
                          ? 'bg-[#1a1a2a] border-[#000000] opacity-70'
                          : 'bg-[#1a1a2a] border-[#000000] hover:border-[#ff69b4] hover:bg-[#222240] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer',
                      ].join(' ')}
                    >
                      {/* Checkbox */}
                      <div className={[
                        'w-5 h-5 border-4 border-[#000000] shrink-0 flex items-center justify-center mt-0.5',
                        done ? 'bg-[#ff69b4]' : 'bg-[#0c0a18]',
                      ].join(' ')}>
                        {done && <span className="text-[10px] text-[#ffffff]">✓</span>}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-['Press_Start_2P'] text-[8px] text-[#a0a0b0] mb-1">
                          {challenge.day}
                        </p>
                        <p className={[
                          'font-[\'VT323\'] text-base leading-tight',
                          done ? 'text-[#a0a0b0] line-through' : 'text-[#ffffff]',
                        ].join(' ')}>
                          {challenge.text}
                        </p>
                      </div>
                      {/* XP Badge */}
                      {!done && (
                        <span className="font-['Press_Start_2P'] text-[7px] text-[#ffb300] shrink-0 mt-1">
                          +15 XP
                        </span>
                      )}
                      {done && (
                        <span className="text-sm shrink-0">✨</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* XP Info */}
            <div className="bg-[#1a1a2a] border-4 border-[#000000] p-3 text-center">
              <p className="font-['VT323'] text-sm text-[#a0a0b0]">
                Setiap misi: +15 Trust XP · Semua selesai: +25 Intimacy XP bonus
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-bounce {
          animation: bounce 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AdventureChallenge;
