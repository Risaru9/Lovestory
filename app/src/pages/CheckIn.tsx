import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { saveMoodLogForDate, getMoodLogs, getRPGStats, deleteMoodLogForDate, type MoodLog, type RPGStats } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

// ─── Mood Options (label + color only, no emoji) ───────────────────────────
const MOOD_OPTIONS = [
  { id: 'happy',   label: 'Senang',       color: '#4caf50' },
  { id: 'sad',     label: 'Sedih',        color: '#2196f3' },
  { id: 'angry',   label: 'Marah',        color: '#f44336' },
  { id: 'anxious', label: 'Cemas',        color: '#9c27b0' },
  { id: 'tired',   label: 'Lelah',        color: '#ffb300' },
  { id: 'in_love', label: 'Bahagia',      color: '#ff69b4' },
  { id: 'calm',    label: 'Tenang',       color: '#00bcd4' },
  { id: 'other',   label: 'Lainnya',      color: '#e91e63' },
];

// ─── Expression image path mapping ─────────────────────────────────────────
const getExpressionPath = (moodId: string, role: 'boy' | 'girl'): string => {
  const map: Record<string, string> = {
    happy:   'smiling.png',
    in_love: 'happy.png',
    calm:    'smiling.png',
    sad:     'sad.png',
    tired:   'sad.png',
    angry:   'angry.png',
    anxious: 'scared.png',
    other:   'embarrassed.png',
  };
  const filename = map[moodId] ?? 'smiling.png';
  return `/images/expressions/${role}/${filename}`;
};

// ─── Pose image path helper ─────────────────────────────────────────────────
const getPosePath = (pose: string, role: 'boy' | 'girl'): string =>
  `/images/poses/${role}/${pose}.png`;

// ─── Calendar helpers ───────────────────────────────────────────────────────
const MONTH_NAMES = [
  'JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
  'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER',
];
const DAY_NAMES = ['MIN','SEN','SEL','RAB','KAM','JUM','SAB'];

// ─── Audio helper ───────────────────────────────────────────────────────────
const playSFX = (freq = 440, type: OscillatorType = 'square', duration = 0.1) => {
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
  } catch (_) {}
};

// ═══════════════════════════════════════════════════════════════════════════
const CheckIn: React.FC = () => {
  const navigate = useNavigate();
  const { profile, partner, coupleInfo } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [moodLogs,    setMoodLogs]    = useState<MoodLog[]>([]);
  const [rpgStats,    setRpgStats]    = useState<RPGStats | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  // Modal state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isModalOpen,     setIsModalOpen]     = useState(false);

  // Form state
  const [selectedMood, setSelectedMood] = useState('happy');
  const [intensity,    setIntensity]    = useState(3);
  const [reason,       setReason]       = useState('');
  const [isEditing,    setIsEditing]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reward toast state
  const [showReward, setShowReward] = useState(false);

  // ── Load data from DB ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [logs, stats] = await Promise.all([getMoodLogs(), getRPGStats()]);
      setMoodLogs(logs);
      setRpgStats(stats);
    } catch (err) {
      console.error('Failed to load check-in data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // FIX #2: Reload when window regains focus (handles back-navigation data loss)
  useEffect(() => {
    const handleFocus = () => { loadData(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') loadData();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  // Real-time Supabase subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !coupleInfo?.id) {
      const iv = setInterval(loadData, 15000);
      return () => clearInterval(iv);
    }
    const channel = supabase
      .channel('realtime:mood_logs_sync')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'mood_logs',
        filter: `couple_id=eq.${coupleInfo.id}`,
      }, () => loadData())
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [coupleInfo?.id, loadData]);

  // ── Calendar navigation ────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    playSFX(300, 'triangle', 0.08);
    setCurrentDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    playSFX(350, 'triangle', 0.08);
    setCurrentDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1));
  };

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays     = new Date(year, month + 1, 0).getDate();

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getLogsForDate = (dateStr: string) => {
    let myLog: MoodLog | undefined;
    let partnerLog: MoodLog | undefined;
    moodLogs.forEach(log => {
      const d = new Date(log.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

  const getReadableDate = () => {
    if (!selectedDateStr) return '';
    const [y, m, d] = selectedDateStr.split('-');
    return `${parseInt(d)} ${MONTH_NAMES[parseInt(m)-1]} ${y}`;
  };

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleDateClick = (dayNum: number) => {
    const selected = new Date(year, month, dayNum);
    const today    = new Date(); today.setHours(23,59,59,999);
    if (selected > today) {
      playSFX(150, 'sawtooth', 0.25);
      alert('Belum bisa check-in untuk tanggal di masa depan!');
      return;
    }
    playSFX(400, 'square', 0.08);
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    setSelectedDateStr(dateStr);
    const { myLog } = getLogsForDate(dateStr);
    if (myLog) {
      setSelectedMood(myLog.mood);
      setIntensity(myLog.intensity);
      setReason(myLog.reason);
      setIsEditing(false);
    } else {
      setSelectedMood('happy');
      setIntensity(3);
      setReason('');
      setIsEditing(true);
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
      playSFX(523,'square',0.1);
      setTimeout(() => playSFX(659,'square',0.1), 100);
      setTimeout(() => playSFX(783,'square',0.15), 200);
      if (isNew) {
        setShowReward(true);
        setTimeout(() => setShowReward(false), 4000);
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
    if (!window.confirm('Hapus check-in pada tanggal ini?')) return;
    try {
      await deleteMoodLogForDate(selectedDateStr);
      playSFX(200,'square',0.15);
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Gagal menghapus mood log:', err);
    }
  };

  // ── Calendar cell renderer ────────────────────────────────────────────────
  const renderCells = () => {
    const cells = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // Empty cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`e-${i}`} className="bg-[#121224]/30 border border-black/10 h-14 rounded-lg" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const { myLog, partnerLog } = getLogsForDate(dateKey);
      const isToday  = dateKey === todayKey;
      const hasMood  = !!myLog || !!partnerLog;

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDateClick(day)}
          className={`relative flex flex-col items-center justify-start pt-1 h-14 border-2 rounded-lg transition-all cursor-pointer overflow-hidden ${
            isToday
              ? 'border-[#ff69b4] bg-[#1a1a35] shadow-[0_0_8px_#ff69b430]'
              : 'border-[#000000] bg-[#121224] hover:bg-[#1c1c38]'
          } shadow-[2px_2px_0_#000000] active:translate-y-[1px]`}
        >
          {/* Day number */}
          <span className={`font-['Press_Start_2P'] text-[6px] leading-none ${isToday ? 'text-[#ff69b4] font-bold' : 'text-[#a0a0b0]'}`}>
            {day}
          </span>

          {/* Mood portraits – small character expressions */}
          {hasMood && (
            <div className="flex justify-center items-center gap-0.5 mt-0.5 w-full px-0.5">
              {myLog && (
                <img
                  src={getExpressionPath(myLog.mood, 'boy')}
                  alt="Saya"
                  className="h-5 w-5 object-contain"
                />
              )}
              {partnerLog && (
                <img
                  src={getExpressionPath(partnerLog.mood, 'girl')}
                  alt="Pasangan"
                  className="h-5 w-5 object-contain"
                />
              )}
            </div>
          )}

          {/* Indicator dots at bottom */}
          {hasMood && (
            <div className="absolute bottom-0.5 left-0 right-0 flex gap-0.5 justify-center">
              {myLog      && <div className="h-[3px] w-3 bg-[#00bcd4] rounded-full" />}
              {partnerLog && <div className="h-[3px] w-3 bg-[#ff69b4] rounded-full" />}
            </div>
          )}
        </button>
      );
    }
    return cells;
  };

  // ── Derived state for modal ───────────────────────────────────────────────
  const { myLog, partnerLog } = selectedDateStr
    ? getLogsForDate(selectedDateStr)
    : { myLog: undefined, partnerLog: undefined };
  const myMoodLabel      = MOOD_OPTIONS.find(m => m.id === myLog?.mood)?.label ?? '';
  const partnerMoodObj   = partnerLog ? MOOD_OPTIONS.find(m => m.id === partnerLog.mood) : null;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-[100dvh] bg-[#0c0a18] flex flex-col overflow-hidden text-white relative">

      {/* Pixel grid background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)', backgroundSize: '32px 32px' }}
      />

      {/* ── HEADER (sticky) ──────────────────────────────────────────────── */}
      <header className="shrink-0 z-30 border-b-4 border-black bg-[#121224] px-4 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>
          <h1 className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] text-white leading-none select-none">
            DAILY CHECK-IN
          </h1>
          <div className="w-16" />
        </div>
      </header>

      {/* ── SCROLLABLE CONTENT ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto z-10">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 space-y-3">

          {/* RPG Stats panel */}
          {rpgStats && (
            <div className="bg-[#121224] border-4 border-black p-3 rounded-xl shadow-[4px_4px_0_#000] flex items-center gap-3">
              {/* Standing character instead of 👑 */}
              <img
                src={getPosePath('standing', 'boy')}
                alt="Character"
                className="h-12 w-12 object-contain shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] font-bold uppercase select-none">
                    Relationship Stats
                  </h3>
                  <span className="font-['Press_Start_2P'] text-[7px] text-[#ffb300]">
                    LVL {rpgStats.level}
                  </span>
                </div>
                <div className="h-3 w-full bg-black/40 border-2 border-black p-[1px] rounded-sm">
                  <div className="h-full bg-[#ffb300] rounded-sm transition-all duration-500" style={{ width: `${rpgStats.xp}%` }} />
                </div>
                <p className="font-['VT323'] text-xs text-[#a0a0b0] mt-0.5 select-none">{rpgStats.xp}/100 XP</p>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="text-center py-4 font-['Press_Start_2P'] text-[8px] text-[#ff69b4] animate-pulse select-none">
              MEMUAT DATA...
            </div>
          )}

          {/* Month selector */}
          <div className="bg-[#121224] border-4 border-black p-2.5 rounded-xl shadow-[4px_4px_0_#000] flex items-center justify-center gap-3 select-none">
            <button
              onClick={handlePrevMonth}
              className="px-2.5 py-1.5 bg-[#1a1a2a] border-2 border-black text-[#ff69b4] hover:bg-[#ff69b4] hover:text-black active:scale-95 rounded font-['Press_Start_2P'] text-[9px] cursor-pointer shrink-0 transition-all"
            >
              ◀
            </button>
            <h2 className="font-['Press_Start_2P'] text-[9px] text-white min-w-[140px] text-center font-bold tracking-wider">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              onClick={handleNextMonth}
              className="px-2.5 py-1.5 bg-[#1a1a2a] border-2 border-black text-[#ff69b4] hover:bg-[#ff69b4] hover:text-black active:scale-95 rounded font-['Press_Start_2P'] text-[9px] cursor-pointer shrink-0 transition-all"
            >
              ▶
            </button>
          </div>

          {/* Calendar grid */}
          <div className="bg-[#121224] border-4 border-black p-2.5 rounded-xl shadow-[4px_4px_0_#000]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 border-b-2 border-black/30 pb-2 mb-2 select-none">
              {DAY_NAMES.map((name, idx) => (
                <div
                  key={name}
                  className={`text-center font-['Press_Start_2P'] text-[5px] sm:text-[7px] font-bold ${
                    idx === 0 ? 'text-[#f44336]' : idx === 6 ? 'text-[#2196f3]' : 'text-[#a0a0b0]'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {renderCells()}
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 pb-3 select-none">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-4 bg-[#00bcd4] rounded-full" />
              <span className="font-['VT323'] text-xs text-[#a0a0b0]">Saya</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-4 bg-[#ff69b4] rounded-full" />
              <span className="font-['VT323'] text-xs text-[#a0a0b0]">Pasangan</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── REWARD TOAST (FIX #3: from bottom, mobile-first) ─────────────── */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-[92%] max-w-sm ${
          showReward ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-[#121224] border-4 border-[#ffb300] rounded-xl p-3 shadow-[6px_6px_0_#000] flex items-center gap-3">
          <img
            src={getPosePath('cheering', 'boy')}
            alt="Yeay!"
            className="h-14 w-14 object-contain shrink-0"
          />
          <div>
            <div className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] font-bold mb-1">
              QUEST COMPLETED!
            </div>
            <p className="font-['VT323'] text-base text-white leading-tight">
              Check-In berhasil! +15 Intimacy XP
            </p>
            {rpgStats && (
              <div className="font-['Press_Start_2P'] text-[6px] text-[#ff69b4] mt-1">
                PROGRESS: {rpgStats.xp}/100 XP
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CO-OP MODAL ───────────────────────────────────────────────────── */}
      {isModalOpen && selectedDateStr && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { playSFX(200,'square',0.08); setIsModalOpen(false); } }}
        >
          <div className="bg-[#121224] border-t-4 sm:border-4 border-black rounded-t-2xl sm:rounded-xl p-4 sm:p-5 w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto shadow-[0_-6px_0_#000] sm:shadow-[6px_6px_0_#000] relative custom-scrollbar">

            {/* Modal header */}
            <div className="flex justify-between items-center border-b-2 border-black/40 pb-3 mb-4">
              <span className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold">
                DATE QUEST: {getReadableDate()}
              </span>
              <button
                onClick={() => { playSFX(200,'square',0.08); setIsModalOpen(false); }}
                className="font-['Press_Start_2P'] text-xs text-[#a0a0b0] hover:text-[#ff69b4] cursor-pointer px-2 py-1 rounded hover:bg-white/5 transition-colors"
              >
                [X]
              </button>
            </div>

            {/* Co-op panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ─── LEFT: Player 1 (Me) ─────────────────────────── */}
              <div className="border-2 border-black p-3 rounded-xl bg-[#1a1a2a] flex flex-col gap-3">
                <div className="border-b border-white/10 pb-2 select-none">
                  <h3 className="font-['Press_Start_2P'] text-[8px] text-[#00bcd4] font-bold">
                    PLAYER 1 — SAYA
                  </h3>
                </div>

                {!isEditing && myLog ? (
                  /* ─ View mode ─ */
                  <div className="flex flex-col gap-3 flex-1">
                    {/* Big expression portrait */}
                    <div className="flex justify-center">
                      <img
                        src={getExpressionPath(myLog.mood, 'boy')}
                        alt="Ekspresi Saya"
                        className="h-28 w-28 object-contain drop-shadow-lg"
                      />
                    </div>
                    {/* Mood + intensity */}
                    <div className="bg-black/20 border border-black/40 p-2 rounded-lg">
                      <p className="font-['Press_Start_2P'] text-[7px] text-[#ffb300] font-bold">
                        MOOD: {myMoodLabel.toUpperCase()}
                      </p>
                      <div className="flex gap-1 mt-1.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`h-2 flex-1 rounded-sm border border-black/30 ${n <= myLog.intensity ? 'bg-[#ff69b4]' : 'bg-black/20'}`} />
                        ))}
                      </div>
                      <p className="font-['VT323'] text-xs text-[#a0a0b0] mt-0.5">
                        Intensitas: {myLog.intensity}/5
                      </p>
                    </div>
                    {/* Notes */}
                    {myLog.reason && (
                      <div className="bg-black/20 border border-black/40 p-2 rounded-lg">
                        <span className="font-['Press_Start_2P'] text-[6px] text-[#ff69b4] block mb-1 font-bold">CATATAN:</span>
                        <p className="font-['VT323'] text-sm text-white leading-normal break-words whitespace-pre-wrap">
                          {myLog.reason}
                        </p>
                      </div>
                    )}
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-auto select-none">
                      <PixelButton
                        onClick={() => { playSFX(350,'square',0.08); setIsEditing(true); }}
                        className="flex-1 text-[8px] py-2"
                      >
                        EDIT
                      </PixelButton>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex-1 text-[8px] py-2 font-['Press_Start_2P'] border-4 border-black bg-red-700 hover:bg-red-800 text-white shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 rounded cursor-pointer transition-all duration-100"
                      >
                        HAPUS
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ─ Edit / New mode ─ */
                  <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 flex-1">
                    {/* Live expression preview */}
                    <div className="flex justify-center">
                      <img
                        src={getExpressionPath(selectedMood, 'boy')}
                        alt="Pratinjau"
                        className="h-24 w-24 object-contain drop-shadow-lg transition-all duration-200"
                      />
                    </div>

                    {/* Mood picker — uses character expression thumbnails */}
                    <div>
                      <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-2 font-bold uppercase select-none">
                        PILIH EMOSI:
                      </h4>
                      <div className="grid grid-cols-4 gap-1.5">
                        {MOOD_OPTIONS.map((mood) => {
                          const isActive = selectedMood === mood.id;
                          return (
                            <button
                              key={mood.id}
                              type="button"
                              onClick={() => { playSFX(420,'square',0.05); setSelectedMood(mood.id); }}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border-2 transition-all cursor-pointer gap-0.5 ${
                                isActive
                                  ? 'border-[#ff69b4] bg-[#ff69b4]/20 scale-105 shadow-[0_0_8px_#ff69b440]'
                                  : 'border-black/40 bg-black/20 hover:border-[#ff69b4]/50 hover:bg-[#1c1c38]'
                              }`}
                            >
                              {/* Character expression thumbnail instead of emoji */}
                              <img
                                src={getExpressionPath(mood.id, 'boy')}
                                alt={mood.label}
                                className="h-8 w-8 object-contain"
                              />
                              <span className={`font-['VT323'] text-[9px] leading-none text-center ${isActive ? 'text-white font-bold' : 'text-[#a0a0b0]'}`}>
                                {mood.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Intensity slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5 select-none">
                        <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] font-bold uppercase">INTENSITAS:</h4>
                        <span className="font-['VT323'] text-sm text-[#ffb300] font-bold">
                          {['','Sedikit','Ringan','Sedang','Kuat','Sangat Kuat'][intensity]}
                        </span>
                      </div>
                      {/* Visual intensity blocks */}
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => { playSFX(300+n*30,'triangle',0.05); setIntensity(n); }}
                            className={`h-4 flex-1 rounded-sm border-2 transition-all cursor-pointer ${
                              n <= intensity ? 'bg-[#ff69b4] border-[#ff69b4]' : 'bg-black/20 border-black/40'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Notes textarea */}
                    <div>
                      <h4 className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-1 font-bold uppercase select-none">CATATAN:</h4>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Ceritakan alasan perasaanmu..."
                        rows={2}
                        className="w-full px-2 py-1.5 bg-black/30 border-2 border-black rounded-lg text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-sm placeholder-white/20 resize-none transition-colors"
                      />
                    </div>

                    {/* Submit buttons */}
                    <div className="flex gap-2 mt-auto">
                      <PixelButton type="submit" disabled={isSubmitting} className="flex-1 text-[8px] py-2.5">
                        {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN'}
                      </PixelButton>
                      {myLog && (
                        <PixelButton
                          type="button"
                          variant="secondary"
                          onClick={() => { playSFX(250,'square',0.08); setIsEditing(false); }}
                          className="text-[8px] py-2.5"
                        >
                          BATAL
                        </PixelButton>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* ─── RIGHT: Player 2 (Partner) ───────────────────── */}
              <div className="border-2 border-black p-3 rounded-xl bg-[#1a1a2a] flex flex-col gap-3">
                <div className="border-b border-white/10 pb-2 select-none">
                  <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold">
                    PLAYER 2 — {partner?.name?.toUpperCase() ?? 'PASANGAN'}
                  </h3>
                </div>

                {partnerLog && partnerMoodObj ? (
                  <div className="flex flex-col gap-3 flex-1">
                    {/* Big girl expression portrait */}
                    <div className="flex justify-center">
                      <img
                        src={getExpressionPath(partnerLog.mood, 'girl')}
                        alt="Ekspresi Pasangan"
                        className="h-28 w-28 object-contain drop-shadow-lg"
                      />
                    </div>
                    {/* Mood + intensity */}
                    <div className="bg-black/20 border border-black/40 p-2 rounded-lg">
                      <p className="font-['Press_Start_2P'] text-[7px] text-[#ffb300] font-bold">
                        MOOD: {partnerMoodObj.label.toUpperCase()}
                      </p>
                      <div className="flex gap-1 mt-1.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`h-2 flex-1 rounded-sm border border-black/30 ${n <= partnerLog.intensity ? 'bg-[#ff69b4]' : 'bg-black/20'}`} />
                        ))}
                      </div>
                      <p className="font-['VT323'] text-xs text-[#a0a0b0] mt-0.5">
                        Intensitas: {partnerLog.intensity}/5
                      </p>
                    </div>
                    {/* Notes */}
                    {partnerLog.reason && (
                      <div className="bg-black/20 border border-black/40 p-2 rounded-lg">
                        <span className="font-['Press_Start_2P'] text-[6px] text-[#ff69b4] block mb-1 font-bold">CATATAN:</span>
                        <p className="font-['VT323'] text-sm text-white leading-normal break-words whitespace-pre-wrap">
                          {partnerLog.reason}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Partner hasn't checked in */
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4 select-none">
                    <img
                      src={getPosePath('sitting', 'girl')}
                      alt="Menunggu"
                      className="h-24 w-24 object-contain opacity-70"
                    />
                    <p className="font-['VT323'] text-base text-[#a0a0b0] text-center leading-snug max-w-[180px]">
                      Menunggu {partner?.name ?? 'pasangan'} mengisi check-in hari ini...
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
