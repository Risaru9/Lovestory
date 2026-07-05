import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { saveMoodLogForDate, getMoodLogs, getRPGStats, type MoodLog, type RPGStats } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

const MOOD_OPTIONS = [
  { id: 'happy', label: 'Senang', emoji: '😊', color: '#4caf50' },
  { id: 'sad', label: 'Sedih', emoji: '😢', color: '#2196f3' },
  { id: 'angry', label: 'Marah', emoji: '😡', color: '#f44336' },
  { id: 'anxious', label: 'Cemas', emoji: '😰', color: '#9c27b0' },
  { id: 'tired', label: 'Lelah', emoji: '😴', color: '#ffb300' },
  { id: 'in_love', label: 'Bahagia', emoji: '😍', color: '#ff69b4' },
  { id: 'calm', label: 'Tenang', emoji: '😌', color: '#00bcd4' },
  { id: 'other', label: 'Mood Lainnya', emoji: '❤️', color: '#e91e63' },
];

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const DAY_NAMES = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

const playSFX = (freq: number = 440, type: OscillatorType = 'square', duration: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

const CheckIn: React.FC = () => {
  const navigate = useNavigate();
  const { profile, partner } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [rpgStats, setRpgStats] = useState<RPGStats | null>(null);

  // Selected Date state for modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'mine' | 'partner'>('mine'); // toggle view

  // Form State
  const [selectedMood, setSelectedMood] = useState('happy');
  const [intensity, setIntensity] = useState(3);
  const [reason, setReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const loadData = async () => {
    try {
      const logs = await getMoodLogs();
      setMoodLogs(logs);
      const stats = await getRPGStats();
      setRpgStats(stats);
    } catch (err) {
      console.error('Failed to load check-in data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrevMonth = () => {
    playSFX(300, 'triangle', 0.08);
    setCurrentDate(prev => {
      const d = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    playSFX(350, 'triangle', 0.08);
    setCurrentDate(prev => {
      const d = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return d;
    });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper values for rendering calendar grid
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Mock offline logs for partner so it displays beautifully in local mode
  const getLogsByDateMap = () => {
    const map = new Map<string, MoodLog>();
    moodLogs.forEach(log => {
      const d = new Date(log.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (viewMode === 'mine') {
        if (!log.user_id || log.user_id === profile?.id) {
          map.set(key, log);
        }
      } else {
        if (log.user_id && log.user_id === partner?.id) {
          map.set(key, log);
        }
      }
    });

    // If local offline fallback, mock some partner logs so it's cute and testable
    if (viewMode === 'partner' && (!isSupabaseConfigured() || moodLogs.length === 0)) {
      const mockDates = [5, 12, 18, 25];
      mockDates.forEach(dayNum => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const moods = ['happy', 'in_love', 'calm', 'tired'];
        map.set(key, {
          id: `mock-partner-${dayNum}`,
          mood: moods[dayNum % moods.length],
          intensity: 4,
          reason: `Lagi mikirin kamu nih dari pagi! ❤️`,
          created_at: new Date(year, month, dayNum, 12, 0).toISOString()
        });
      });
    }

    return map;
  };

  const activeLogsMap = getLogsByDateMap();

  const handleDateClick = (dayNum: number) => {
    const selectedDate = new Date(year, month, dayNum);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      playSFX(150, 'sawtooth', 0.25);
      alert('Belum bisa check-in untuk tanggal di masa depan! 🔒');
      return;
    }

    playSFX(400, 'square', 0.08);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);

    const existingLog = activeLogsMap.get(dateStr);
    if (existingLog) {
      setSelectedMood(existingLog.mood);
      setIntensity(existingLog.intensity);
      setReason(existingLog.reason);
      setIsEditing(false); // view details mode first
    } else {
      setSelectedMood('happy');
      setIntensity(3);
      setReason('');
      setIsEditing(true); // create mode directly
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr) return;

    setIsSubmitting(true);
    try {
      const isNew = !activeLogsMap.has(selectedDateStr);
      await saveMoodLogForDate(selectedDateStr, selectedMood, intensity, reason);
      
      // Success SFX
      playSFX(523, 'square', 0.1);
      setTimeout(() => playSFX(659, 'square', 0.1), 100);
      setTimeout(() => playSFX(783, 'square', 0.15), 200);

      if (isNew) {
        setShowReward(true);
        setTimeout(() => setShowReward(false), 3500);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCells = () => {
    const cells = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Blank cells before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div key={`empty-${i}`} className="bg-[#121224]/30 border border-black/20 min-h-[70px] md:min-h-[85px] rounded-lg" />
      );
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasLog = activeLogsMap.has(dateKey);
      const log = activeLogsMap.get(dateKey);
      const isToday = dateKey === todayKey;

      const matchedMood = MOOD_OPTIONS.find(m => m.id === log?.mood);

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDateClick(day)}
          className={`relative flex flex-col justify-between p-1.5 md:p-2 min-h-[70px] md:min-h-[85px] border-4 rounded-xl transition-all cursor-pointer text-left ${
            isToday
              ? 'border-[#ff69b4] bg-[#1a1a35]'
              : 'border-[#000000] bg-[#121224] hover:bg-[#1c1c38]'
          } shadow-[2px_2px_0_#000000] hover:translate-y-[-2px]`}
        >
          <span className={`font-['Press_Start_2P'] text-[8px] md:text-[9px] ${isToday ? 'text-[#ff69b4] font-bold' : 'text-[#a0a0b0]'}`}>
            {day}
          </span>

          {hasLog && matchedMood && (
            <div className="flex flex-col items-center justify-center flex-grow select-none mt-1 animate-pulse">
              <span className="text-2xl md:text-3xl">{matchedMood.emoji}</span>
              <span className="font-['VT323'] text-[9px] md:text-xs text-[#ffb300] tracking-wider leading-none mt-0.5 truncate max-w-full font-bold">
                {matchedMood.label}
              </span>
            </div>
          )}
        </button>
      );
    }

    return cells;
  };

  const getReadableSelectedDate = () => {
    if (!selectedDateStr) return '';
    const [y, m, d] = selectedDateStr.split('-');
    return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
  };

  const currentLog = selectedDateStr ? activeLogsMap.get(selectedDateStr) : null;
  const currentMoodObj = MOOD_OPTIONS.find(m => m.id === selectedMood);

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000000 1px, transparent 1px),
              linear-gradient(to bottom, #000000 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>
          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              DAILY CHECK-IN
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* XP Reward Notification */}
      {showReward && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121224] border-4 border-[#000000] p-4 text-center shadow-[6px_6px_0_#000000] animate-bounce w-[90%] max-w-sm rounded-xl">
          <div className="font-['Press_Start_2P'] text-[#ffb300] text-[9px] mb-2 font-bold">
            🌟 QUEST COMPLETED!
          </div>
          <p className="font-['VT323'] text-white text-lg font-bold">
            Check-In harian berhasil! +15 Intimacy XP 💖
          </p>
          {rpgStats && (
            <div className="mt-2 font-['Press_Start_2P'] text-[7px] text-[#ff69b4]">
              LEVEL UP PROGRESS: {rpgStats.xp}%
            </div>
          )}
        </div>
      )}

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 overflow-y-auto z-10 space-y-4 flex flex-col justify-between">
        
        {/* Toggle Mode & Stats */}
        <div className="space-y-4 shrink-0">
          {rpgStats && (
            <div className="bg-[#121224] border-4 border-[#000000] p-3 shadow-[4px_4px_0_#000000] rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 shrink-0 select-none">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold uppercase">
                    Relationship Stats
                  </h3>
                  <p className="font-['VT323'] text-base text-[#a0a0b0] font-semibold leading-none mt-1">
                    Intimacy Level
                  </p>
                </div>
              </div>
              <div className="flex-1 max-w-xs flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-[#ffffff]">
                  <span>LVL {rpgStats.level}</span>
                  <span className="text-[#ffb300]">{rpgStats.xp}/100 XP</span>
                </div>
                <div className="h-3 w-full bg-black/40 border-2 border-[#000000] p-[1px]">
                  <div className="h-full bg-[#ffb300]" style={{ width: `${rpgStats.xp}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Calender Month Selection Panel */}
          <div className="bg-[#121224] border-4 border-[#000000] p-3 rounded-xl shadow-[4px_4px_0_#000000] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="px-2.5 py-1.5 bg-[#1a1a2a] border-2 border-[#000000] text-[#ff69b4] hover:bg-[#ff69b4] hover:text-[#000000] active:translate-y-0.5 rounded font-['Press_Start_2P'] text-[10px] cursor-pointer"
              >
                ◀
              </button>
              <h2 className="font-['Press_Start_2P'] text-[9px] md:text-[10px] text-[#ffffff] min-w-[140px] text-center select-none font-bold tracking-wider">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={handleNextMonth}
                className="px-2.5 py-1.5 bg-[#1a1a2a] border-2 border-[#000000] text-[#ff69b4] hover:bg-[#ff69b4] hover:text-[#000000] active:translate-y-0.5 rounded font-['Press_Start_2P'] text-[10px] cursor-pointer"
              >
                ▶
              </button>
            </div>

            {/* Toggle Mode Button */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  playSFX(450, 'triangle', 0.08);
                  setViewMode('mine');
                }}
                className={`px-3 py-1.5 font-['Press_Start_2P'] text-[8px] border-2 rounded cursor-pointer ${
                  viewMode === 'mine'
                    ? 'bg-[#ff69b4] text-[#000000] border-[#000000] font-bold'
                    : 'bg-[#1a1a2a] text-[#a0a0b0] border-[#000000]/60 hover:bg-[#222230]'
                }`}
              >
                MOOD SAYA
              </button>
              <button
                onClick={() => {
                  playSFX(480, 'triangle', 0.08);
                  setViewMode('partner');
                }}
                className={`px-3 py-1.5 font-['Press_Start_2P'] text-[8px] border-2 rounded cursor-pointer ${
                  viewMode === 'partner'
                    ? 'bg-[#ff69b4] text-[#000000] border-[#000000] font-bold'
                    : 'bg-[#1a1a2a] text-[#a0a0b0] border-[#000000]/60 hover:bg-[#222230]'
                }`}
              >
                MOOD {partner?.name ? partner.name.toUpperCase() : 'PASANGAN'}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="flex-1 min-h-[350px] bg-[#121224] border-4 border-[#000000] p-3 rounded-xl shadow-[4px_4px_0_#000000] flex flex-col justify-between overflow-hidden">
          {/* Day Names Row */}
          <div className="grid grid-cols-7 gap-1 border-b-2 border-[#000000]/30 pb-2 mb-2 select-none">
            {DAY_NAMES.map((name, idx) => (
              <div
                key={name}
                className={`text-center font-['Press_Start_2P'] text-[7px] md:text-[8px] font-bold ${
                  idx === 0 ? 'text-[#f44336]' : idx === 6 ? 'text-[#2196f3]' : 'text-[#a0a0b0]'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
            {renderCells()}
          </div>
        </div>

      </div>

      {/* Dialog Box RPG Modal for Mood Check-In & Details */}
      {isModalOpen && selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 flex items-center justify-center p-4">
          <div className="bg-[#121224] border-4 border-[#000000] rounded-xl p-5 w-full max-w-md shadow-[6px_6px_0_#000000] relative animate-fade-in text-[#ffffff]">
            
            <div className="flex justify-between items-center border-b-2 border-[#000000] pb-2 mb-4 select-none">
              <span className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold tracking-wider">
                CHECK-IN: {getReadableSelectedDate()}
              </span>
              <button
                onClick={() => {
                  playSFX(200, 'square', 0.08);
                  setIsModalOpen(false);
                }}
                className="font-['Press_Start_2P'] text-xs text-[#a0a0b0] hover:text-[#ff69b4] cursor-pointer"
              >
                [X]
              </button>
            </div>

            {/* View Details Mode (When log exists and not editing) */}
            {!isEditing && currentLog ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-[#1a1a2a] p-3 rounded-lg border-2 border-black/40">
                  <span className="text-4xl select-none">{currentMoodObj?.emoji}</span>
                  <div>
                    <h4 className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] font-bold uppercase">
                      Mood: {currentMoodObj?.label}
                    </h4>
                    <p className="font-['VT323'] text-base text-[#a0a0b0]">
                      Intensitas: {intensity}/5 ({
                        intensity === 1 ? 'Sedikit' :
                        intensity === 2 ? 'Ringan' :
                        intensity === 3 ? 'Sedang' :
                        intensity === 4 ? 'Kuat' : 'Sangat Kuat'
                      })
                    </p>
                  </div>
                </div>

                <div className="bg-[#1a1a2a] border-2 border-[#000000] p-3 rounded-lg">
                  <h5 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-2 font-bold uppercase select-none">
                    Catatan:
                  </h5>
                  <p className="font-['VT323'] text-lg text-white leading-snug break-words whitespace-pre-wrap">
                    {reason || 'Tidak ada catatan singkat.'}
                  </p>
                </div>

                {viewMode === 'mine' && (
                  <div className="flex gap-2 pt-2">
                    <PixelButton
                      onClick={() => {
                        playSFX(350, 'square', 0.08);
                        setIsEditing(true);
                      }}
                      className="flex-1 text-[8px]"
                    >
                      ✏️ EDIT CHECK-IN
                    </PixelButton>
                    <PixelButton
                      variant="secondary"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 text-[8px]"
                    >
                      TUTUP
                    </PixelButton>
                  </div>
                )}
              </div>
            ) : (
              /* Create / Edit Form Mode */
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <h2 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2.5 uppercase tracking-wider font-bold select-none">
                    1. Bagaimana perasaanmu?
                  </h2>
                  <div className="grid grid-cols-4 gap-2">
                    {MOOD_OPTIONS.map((mood) => {
                      const isActive = selectedMood === mood.id;
                      return (
                        <button
                          key={mood.id}
                          type="button"
                          onClick={() => {
                            playSFX(420, 'square', 0.05);
                            setSelectedMood(mood.id);
                          }}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#ff69b4] border-[#000000] text-black shadow-[2px_2px_0_#000000] font-bold scale-105'
                              : 'bg-[#1a1a2a] border-[#000000]/40 text-[#a0a0b0] hover:bg-[#222235]'
                          }`}
                        >
                          <span className="text-xl mb-1 select-none">{mood.emoji}</span>
                          <span className="font-['VT323'] text-xs tracking-wide text-center leading-none">
                            {mood.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 select-none">
                    <h2 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] uppercase tracking-wider font-bold">
                      2. Intensitas
                    </h2>
                    <span className="font-['VT323'] text-sm text-[#ffb300] font-bold uppercase">
                      {intensity === 1 ? 'Sedikit' :
                       intensity === 2 ? 'Ringan' :
                       intensity === 3 ? 'Sedang' :
                       intensity === 4 ? 'Kuat' : 'Sangat Kuat'}
                    </span>
                  </div>
                  <div className="relative pt-1">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={intensity}
                      onChange={(e) => {
                        playSFX(300 + parseInt(e.target.value) * 30, 'triangle', 0.05);
                        setIntensity(parseInt(e.target.value));
                      }}
                      className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#ff69b4] border-2 border-black"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-1.5 uppercase tracking-wider font-bold select-none">
                    3. Catatan (Opsional)
                  </h2>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tuliskan sedikit alasan di balik perasaanmu hari ini..."
                    rows={3}
                    className="w-full px-2.5 py-1.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-base placeholder-[#a0a0b0]/40 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <PixelButton
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-grow text-[8px]"
                  >
                    {isSubmitting ? 'MENYIMPAN...' : '💾 SIMPAN CHECK-IN'}
                  </PixelButton>
                  {currentLog && (
                    <PixelButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        playSFX(250, 'square', 0.08);
                        setIsEditing(false);
                      }}
                      className="text-[8px]"
                    >
                      BATAL
                    </PixelButton>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CheckIn;
