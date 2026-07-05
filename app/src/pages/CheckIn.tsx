import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { saveMoodLogForDate, getMoodLogs, getRPGStats, deleteMoodLogForDate, type MoodLog, type RPGStats } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

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
  const { profile, partner, coupleInfo } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [rpgStats, setRpgStats] = useState<RPGStats | null>(null);

  // Selected Date state for modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Real-time synchronization
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !coupleInfo?.id) {
      // Mock offline partner checks in every few days for visual testing
      const interval = setInterval(() => {
        loadData();
      }, 10000);
      return () => clearInterval(interval);
    }

    const moodLogsChannel = supabase
      .channel('realtime:mood_logs_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mood_logs',
          filter: `couple_id=eq.${coupleInfo.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(moodLogsChannel);
      }
    };
  }, [coupleInfo?.id]);

  const handlePrevMonth = () => {
    playSFX(300, 'triangle', 0.08);
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    playSFX(350, 'triangle', 0.08);
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Helper to retrieve both logs for a specific date
  const getLogsForDate = (dateStr: string) => {
    let myLog: MoodLog | undefined;
    let partnerLog: MoodLog | undefined;

    moodLogs.forEach(log => {
      const d = new Date(log.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (key === dateStr) {
        if (log.user_id === profile?.id || log.user_id === 'me' || (!log.user_id && !myLog)) {
          myLog = log;
        } else if (log.user_id === partner?.id || log.user_id === 'partner') {
          partnerLog = log;
        }
      }
    });



    return { myLog, partnerLog };
  };

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

    const { myLog } = getLogsForDate(dateStr);
    if (myLog) {
      setSelectedMood(myLog.mood);
      setIntensity(myLog.intensity);
      setReason(myLog.reason);
      setIsEditing(false); // view details
    } else {
      setSelectedMood('happy');
      setIntensity(3);
      setReason('');
      setIsEditing(true); // check-in directly
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr) return;

    setIsSubmitting(true);
    try {
      const { myLog } = getLogsForDate(selectedDateStr);
      const isNew = !myLog;
      await saveMoodLogForDate(selectedDateStr, selectedMood, intensity, reason);
      
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

  const handleDelete = async () => {
    if (!selectedDateStr) return;
    if (!window.confirm('Apakah kamu yakin ingin menghapus check-in pada tanggal ini? 😢')) {
      return;
    }

    try {
      await deleteMoodLogForDate(selectedDateStr);
      playSFX(200, 'square', 0.15); // Delete sound effect
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Gagal menghapus mood log:', err);
    }
  };

  const renderCells = () => {
    const cells = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div key={`empty-${i}`} className="bg-[#121224]/30 border border-black/20 min-h-[85px] rounded-lg" />
      );
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { myLog, partnerLog } = getLogsForDate(dateKey);
      const isToday = dateKey === todayKey;

      const myMoodObj = MOOD_OPTIONS.find(m => m.id === myLog?.mood);
      const partnerMoodObj = MOOD_OPTIONS.find(m => m.id === partnerLog?.mood);

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDateClick(day)}
          className={`relative flex flex-col justify-between p-2 min-h-[85px] border-4 rounded-xl transition-all cursor-pointer text-left ${
            isToday
              ? 'border-[#ff69b4] bg-[#1a1a35]'
              : 'border-[#000000] bg-[#121224] hover:bg-[#1c1c38]'
          } shadow-[2px_2px_0_#000000] hover:translate-y-[-2px]`}
        >
          <span className={`font-['Press_Start_2P'] text-[8px] md:text-[9px] ${isToday ? 'text-[#ff69b4] font-bold' : 'text-[#a0a0b0]'}`}>
            {day}
          </span>

          {/* Co-op Mood Slots */}
          <div className="flex justify-around items-center w-full flex-grow mt-1 select-none gap-1">
            
            {/* Left Slot: Mine */}
            <div className="flex flex-col items-center justify-center flex-1 min-w-0">
              {myLog && myMoodObj ? (
                <span className="text-xl md:text-2xl animate-pulse" title="Mood Saya">
                  {myMoodObj.emoji}
                </span>
              ) : (
                <div className="w-6 h-6 border-2 border-dashed border-[#a0a0b0]/40 rounded flex items-center justify-center text-[#a0a0b0]/40 text-[9px] font-['Press_Start_2P']">
                  +
                </div>
              )}
              <span className="text-[6px] font-['Press_Start_2P'] text-[#a0a0b0]/60 mt-0.5 truncate leading-none">
                SAYA
              </span>
            </div>

            {/* Middle Divider */}
            <div className="w-[1px] h-6 bg-black/30 shrink-0" />

            {/* Right Slot: Partner */}
            <div className="flex flex-col items-center justify-center flex-1 min-w-0">
              {partnerLog && partnerMoodObj ? (
                <span className="text-xl md:text-2xl animate-pulse" title="Mood Pasangan">
                  {partnerMoodObj.emoji}
                </span>
              ) : (
                <div className="w-6 h-6 border-2 border-dashed border-[#a0a0b0]/20 rounded flex items-center justify-center text-[#a0a0b0]/30 text-[9px] font-['Press_Start_2P']">
                  ?
                </div>
              )}
              <span className="text-[6px] font-['Press_Start_2P'] text-[#a0a0b0]/60 mt-0.5 truncate leading-none">
                DIA
              </span>
            </div>

          </div>
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

  const { myLog, partnerLog } = selectedDateStr ? getLogsForDate(selectedDateStr) : { myLog: undefined, partnerLog: undefined };
  const partnerMoodObj = partnerLog ? MOOD_OPTIONS.find(m => m.id === partnerLog.mood) : null;

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
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

      {/* Reward Pop-up */}
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
        
        {/* RPG Panel */}
        <div className="space-y-4 shrink-0">
          {rpgStats && (
            <div className="bg-[#121224] border-4 border-[#000000] p-3 shadow-[4px_4px_0_#000000] rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 shrink-0 select-none">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold uppercase">
                    Relationship Stats
                  </h3>
                  <p className="font-['VT323'] text-base text-[#a0a0b0] font-semibold mt-1 leading-none">
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

          {/* Month Selector Panel */}
          <div className="bg-[#121224] border-4 border-[#000000] p-3 rounded-xl shadow-[4px_4px_0_#000000] flex items-center justify-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="px-2.5 py-1.5 bg-[#1a1a2a] border-2 border-[#000000] text-[#ff69b4] hover:bg-[#ff69b4] hover:text-[#000000] active:translate-y-0.5 rounded font-['Press_Start_2P'] text-[10px] cursor-pointer"
            >
              ◀
            </button>
            <h2 className="font-['Press_Start_2P'] text-[9px] md:text-[10px] text-[#ffffff] min-w-[150px] text-center select-none font-bold tracking-wider">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              onClick={handleNextMonth}
              className="px-2.5 py-1.5 bg-[#1a1a2a] border-2 border-[#000000] text-[#ff69b4] hover:bg-[#ff69b4] hover:text-[#000000] active:translate-y-0.5 rounded font-['Press_Start_2P'] text-[10px] cursor-pointer"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 min-h-[380px] bg-[#121224] border-4 border-[#000000] p-3 rounded-xl shadow-[4px_4px_0_#000000] flex flex-col justify-between overflow-hidden">
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

          <div className="grid grid-cols-7 gap-1.5 flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
            {renderCells()}
          </div>
        </div>

      </div>

      {/* Unified Co-op Dialogue Box Modal */}
      {isModalOpen && selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 flex items-center justify-center p-4">
          <div className="bg-[#121224] border-4 border-[#000000] rounded-xl p-5 w-full max-w-2xl shadow-[6px_6px_0_#000000] relative animate-fade-in text-[#ffffff]">
            
            <div className="flex justify-between items-center border-b-2 border-[#000000] pb-2 mb-4 select-none">
              <span className="font-['Press_Start_2P'] text-[8px] md:text-[9px] text-[#ff69b4] font-bold tracking-wider">
                DATE QUEST: {getReadableSelectedDate()}
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

            {/* Split Screen Layout for Co-op Check-in */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left Panel: My Status / Form */}
              <div className="border-2 border-[#000000] p-3 rounded-lg bg-[#1a1a2a] flex flex-col justify-between min-h-[300px]">
                <div className="border-b border-[#a0a0b0]/20 pb-1.5 mb-3 select-none">
                  <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold">
                    PLAYER 1 (SAYA)
                  </h3>
                </div>

                {!isEditing && myLog ? (
                  <div className="space-y-3 flex-grow flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-black/20 p-2 rounded border border-black/30">
                        <span className="text-3xl select-none">{MOOD_OPTIONS.find(m => m.id === myLog.mood)?.emoji}</span>
                        <div>
                          <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ffb300] font-bold">
                            MOOD: {MOOD_OPTIONS.find(m => m.id === myLog.mood)?.label}
                          </h4>
                          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
                            Intensitas: {myLog.intensity}/5
                          </p>
                        </div>
                      </div>

                      <div className="bg-black/20 border border-black/30 p-2 rounded">
                        <span className="font-['Press_Start_2P'] text-[6px] text-[#ff69b4] block mb-1 font-bold">CATATAN:</span>
                        <p className="font-['VT323'] text-base text-white leading-normal break-words whitespace-pre-wrap">
                          {myLog.reason || 'Tidak ada catatan singkat.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2 select-none">
                      <PixelButton
                        onClick={() => {
                          playSFX(350, 'square', 0.08);
                          setIsEditing(true);
                        }}
                        className="flex-1 text-[8px] py-2"
                      >
                        ✏️ EDIT
                      </PixelButton>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex-1 text-[8px] py-2 font-['Press_Start_2P'] border-4 border-[#000000] bg-red-700 hover:bg-red-800 text-white shadow-[2px_2px_0_#000000] active:translate-x-0.5 active:translate-y-0.5 rounded cursor-pointer transition-all duration-100"
                      >
                        ❌ HAPUS
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-3 flex-grow flex flex-col justify-between">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-1.5 font-bold uppercase select-none">
                          PILIH EMOSI:
                        </h4>
                        <div className="grid grid-cols-4 gap-1">
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
                                className={`flex flex-col items-center justify-center p-1 rounded border transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-[#ff69b4] border-[#000000] text-black shadow-[1px_1px_0_#000000] font-bold scale-105'
                                    : 'bg-[#121224] border-[#000000]/40 text-[#a0a0b0] hover:bg-[#222235]'
                                }`}
                              >
                                <span className="text-lg select-none">{mood.emoji}</span>
                                <span className="font-['VT323'] text-[10px] leading-none mt-0.5">{mood.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1 select-none">
                          <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] font-bold uppercase">
                            INTENSITAS:
                          </h4>
                          <span className="font-['VT323'] text-xs text-[#ffb300] font-bold">
                            {intensity === 1 ? 'Sedikit' :
                             intensity === 2 ? 'Ringan' :
                             intensity === 3 ? 'Sedang' :
                             intensity === 4 ? 'Kuat' : 'Sangat Kuat'}
                          </span>
                        </div>
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
                          className="w-full h-1 bg-black/40 rounded appearance-none cursor-pointer accent-[#ff69b4] border border-black"
                        />
                      </div>

                      <div>
                        <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-1 font-bold uppercase select-none">
                          CATATAN:
                        </h4>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Ceritakan alasan perasaanmu..."
                          rows={2}
                          className="w-full px-2 py-1 bg-[#121224] border border-[#000000] rounded text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-sm placeholder-[#a0a0b0]/30 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-1.5 mt-2">
                      <PixelButton
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 text-[8px] py-2"
                      >
                        {isSubmitting ? 'MENYIMPAN...' : '💾 SIMPAN'}
                      </PixelButton>
                      {myLog && (
                        <PixelButton
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            playSFX(250, 'square', 0.08);
                            setIsEditing(false);
                          }}
                          className="text-[8px] py-2"
                        >
                          BATAL
                        </PixelButton>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* Right Panel: Partner Status */}
              <div className="border-2 border-[#000000] p-3 rounded-lg bg-[#1a1a2a] flex flex-col justify-between min-h-[300px]">
                <div className="border-b border-[#a0a0b0]/20 pb-1.5 mb-3 select-none">
                  <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold">
                    PLAYER 2 ({partner?.name ? partner.name.toUpperCase() : 'PASANGAN'})
                  </h3>
                </div>

                {partnerLog && partnerMoodObj ? (
                  <div className="space-y-3 flex-grow flex flex-col justify-start">
                    <div className="flex items-center gap-3 bg-black/20 p-2 rounded border border-black/30">
                      <span className="text-3xl select-none">{partnerMoodObj.emoji}</span>
                      <div>
                        <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ffb300] font-bold">
                          MOOD: {partnerMoodObj.label}
                        </h4>
                        <p className="font-['VT323'] text-sm text-[#a0a0b0]">
                          Intensitas: {partnerLog.intensity}/5
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/20 border border-black/30 p-2 rounded mt-2">
                      <span className="font-['Press_Start_2P'] text-[6px] text-[#ff69b4] block mb-1 font-bold">CATATAN:</span>
                      <p className="font-['VT323'] text-base text-white leading-normal break-words whitespace-pre-wrap">
                        {partnerLog.reason || 'Tidak ada catatan singkat.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-[#a0a0b0]/10 rounded-lg p-5 select-none bg-black/5">
                    <span className="text-4xl mb-2 animate-bounce">💤</span>
                    <p className="font-['VT323'] text-base text-[#a0a0b0] text-center max-w-[200px]">
                      Menunggu {partner?.name || 'pasangan'} mengisi check-in hari ini...
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CheckIn;
