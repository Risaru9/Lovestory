import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { saveMoodLog, getMoodLogs, getRPGStats, type MoodLog, type RPGStats } from '@/lib/db';

const MOOD_OPTIONS = [
  { id: 'happy', label: 'Senang', emoji: '😊', color: '#4caf50' },
  { id: 'sad', label: 'Sedih', emoji: '😢', color: '#2196f3' },
  { id: 'angry', label: 'Marah', emoji: '😡', color: '#f44336' },
  { id: 'tired', label: 'Lelah', emoji: '😴', color: '#ffb300' },
  { id: 'in_love', label: 'Jatuh Cinta', emoji: '😍', color: '#ff69b4' },
  { id: 'anxious', label: 'Cemas', emoji: '😰', color: '#9c27b0' },
  { id: 'calm', label: 'Tenang', emoji: '😌', color: '#00bcd4' },
  { id: 'other', label: 'Mood Lainnya', emoji: '❤️', color: '#e91e63' },
];

const INTENSITY_LABELS: Record<number, string> = {
  1: 'Sedikit',
  2: 'Ringan',
  3: 'Sedang',
  4: 'Kuat',
  5: 'Sangat Kuat',
};

const playLevelUpSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    
    // Klasik retro level up sound
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.45);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("AudioContext blocked or not supported:", e);
  }
};

const CheckIn: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState('happy');
  const [intensity, setIntensity] = useState(3);
  const [reason, setReason] = useState('');
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [rpgStats, setRpgStats] = useState<RPGStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRewardNotification, setShowRewardNotification] = useState(false);

  const loadData = async () => {
    try {
      const logs = await getMoodLogs();
      setMoodLogs(logs.slice(0, 7)); // Ambil 7 log terakhir
      const stats = await getRPGStats();
      setRpgStats(stats);
    } catch (err) {
      console.error('Gagal memuat data check-in:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveMoodLog(selectedMood, intensity, reason);
      
      const newStats = await getRPGStats();
      setRpgStats(newStats);
      
      // Mainkan efek suara
      playLevelUpSound();
      setShowRewardNotification(true);
      
      // Bersihkan form
      setReason('');
      loadData();
      
      setTimeout(() => {
        setShowRewardNotification(false);
      }, 4000);
    } catch (err) {
      console.error('Gagal menyimpan mood check-in:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider hidden sm:block font-bold">
              Bagikan energimu hari ini dengan pasanganmu
            </p>
          </div>
          <div className="w-16 sm:w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Reward Pop-up Notification */}
      {showRewardNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121224] border-4 border-[#000000] p-4 text-center shadow-[4px_4px_0_#000000] animate-bounce w-[90%] max-w-sm">
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

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">
        
        {/* RPG Level Bar Section */}
        {rpgStats && (
          <div className="bg-[#121224] border-4 border-[#000000] p-3 shadow-[4px_4px_0_#000000] rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-2xl select-none">👑</span>
              <div>
                <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold uppercase">
                  Relationship Stats
                </h3>
                <p className="font-['VT323'] text-base text-[#a0a0b0] font-semibold">
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

        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr] gap-6">
          {/* Check-In Form */}
          <form onSubmit={handleSubmit} className="bg-[#121224] border-4 border-[#000000] p-4 sm:p-5 shadow-[4px_4px_0_#000000] rounded-xl space-y-5">
            <div>
              <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-3 uppercase tracking-wider font-bold select-none">
                1. Pilih Suasana Hatimu
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const isActive = selectedMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => setSelectedMood(mood.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#ff69b4] border-[#000000] text-black shadow-[2px_2px_0_#000000] font-bold scale-105'
                          : 'bg-[#1a1a2a] border-[#000000]/40 text-[#a0a0b0] hover:bg-[#222235]'
                      }`}
                    >
                      <span className="text-2xl mb-1 select-none">{mood.emoji}</span>
                      <span className="font-['VT323'] text-sm tracking-wide text-center leading-none">
                        {mood.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 select-none">
                <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] uppercase tracking-wider font-bold">
                  2. Intensitas Emosional
                </h2>
                <span className="font-['VT323'] text-base text-[#ffb300] font-bold uppercase">
                  {INTENSITY_LABELS[intensity]}
                </span>
              </div>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#ff69b4] border-2 border-black"
                  style={{
                    background: `linear-gradient(to right, #ff69b4 ${(intensity - 1) * 25}%, #1a1a2a ${(intensity - 1) * 25}%)`
                  }}
                />
                <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-[#a0a0b0] mt-2 select-none">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-2 uppercase tracking-wider font-bold select-none">
                3. Alasan / Catatan Singkat
              </h2>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan sedikit cerita atau alasan di balik suasana hatimu..."
                required
                rows={3}
                className="w-full px-3 py-2 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-lg placeholder-[#a0a0b0]/40 resize-none"
              />
            </div>

            <div className="pt-2">
              <PixelButton
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 text-[9px]"
              >
                {isSubmitting ? 'MENYIMPAN...' : '💾 SIMPAN & BERITAHU PASANGAN'}
              </PixelButton>
            </div>
          </form>

          {/* Mood Logs History List */}
          <div className="bg-[#121224] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000] rounded-xl space-y-4">
            <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] border-b-2 border-[#000000] pb-2 uppercase tracking-wider font-bold select-none">
              📅 Riwayat Mood
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {moodLogs.map((log) => {
                const moodObj = MOOD_OPTIONS.find((m) => m.id === log.mood) || MOOD_OPTIONS[0];
                const formattedDate = new Date(log.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={log.id}
                    className="border-2 border-[#000000] bg-[#1a1a2a] rounded-lg p-2.5 shadow-[2px_2px_0_#000000] flex gap-3 items-start"
                  >
                    <div className="text-2xl shrink-0 select-none p-1 bg-black/20 rounded">
                      {moodObj.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2 mb-1 select-none">
                        <span className="font-['Press_Start_2P'] text-[7px] text-[#ffb300] font-bold">
                          {moodObj.label} (Lvl {log.intensity})
                        </span>
                        <span className="font-['VT323'] text-xs text-[#a0a0b0]">
                          {formattedDate}
                        </span>
                      </div>
                      <p className="font-['VT323'] text-base text-[#ffffff]/90 leading-snug break-words">
                        {log.reason}
                      </p>
                    </div>
                  </div>
                );
              })}

              {moodLogs.length === 0 && (
                <div className="text-center py-10 font-['VT323'] text-base text-[#a0a0b0]/65 select-none">
                  Belum ada catatan mood harian. Mulai check-in pertamamu sekarang!
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckIn;
