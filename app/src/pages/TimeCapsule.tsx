import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-time-capsules';

interface TimeCapsule {
  id: string;
  message: string;
  emoji: string;
  unlockDate: string; // ISO date string
  createdAt: string;
  opened: boolean;
}

const loadCapsules = (): TimeCapsule[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const saveCapsules = (capsules: TimeCapsule[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
};

const playCreateSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(330, ctx.currentTime);
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(550, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (_e) { /* ignored */ }
};

const playUnlockSound = () => {
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

const EMOJI_OPTIONS = ['💖', '🌟', '🎉', '🔥', '🌹', '💎', '🦋', '🎵'];

const TimeCapsulePage: React.FC = () => {
  const navigate = useNavigate();
  const [capsules, setCapsules] = useState<TimeCapsule[]>(loadCapsules);
  const [message, setMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💖');
  const [unlockDate, setUnlockDate] = useState('');
  const [showReward, setShowReward] = useState<string | null>(null);
  const [readingCapsule, setReadingCapsule] = useState<TimeCapsule | null>(null);
  const [now, setNow] = useState(Date.now());

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isUnlocked = (capsule: TimeCapsule) => {
    return new Date(capsule.unlockDate).getTime() <= now;
  };

  const getCountdown = (unlockDateStr: string) => {
    const diff = new Date(unlockDateStr).getTime() - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !unlockDate) return;

    const newCapsule: TimeCapsule = {
      id: `capsule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message: message.trim(),
      emoji: selectedEmoji,
      unlockDate: new Date(unlockDate).toISOString(),
      createdAt: new Date().toISOString(),
      opened: false,
    };

    const updated = [newCapsule, ...capsules];
    setCapsules(updated);
    saveCapsules(updated);

    // Award XP
    await addRelationshipXP(15, 'intimacy');
    playCreateSound();

    setMessage('');
    setUnlockDate('');
    setSelectedEmoji('💖');

    setShowReward('Kapsul waktu dibuat! +15 Intimacy XP 💖');
    setTimeout(() => setShowReward(null), 3000);
  };

  const handleOpen = async (capsule: TimeCapsule) => {
    if (!isUnlocked(capsule) || capsule.opened) return;

    const updated = capsules.map(c =>
      c.id === capsule.id ? { ...c, opened: true } : c
    );
    setCapsules(updated);
    saveCapsules(updated);

    await addRelationshipXP(10, 'trust');
    playUnlockSound();

    setReadingCapsule({ ...capsule, opened: true });

    setShowReward('Kapsul dibuka! +10 Trust XP 🔓');
    setTimeout(() => setShowReward(null), 3000);
  };

  const handleDelete = (id: string) => {
    const updated = capsules.filter(c => c.id !== id);
    setCapsules(updated);
    saveCapsules(updated);
  };

  // Get minimum date for date picker (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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
              TIME CAPSULE
            </h1>
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider hidden sm:block font-bold">
              Kunci pesan untuk masa depan
            </p>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Reward Notification */}
      {showReward && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121224] border-4 border-[#000000] p-4 text-center shadow-[4px_4px_0_#000000] animate-bounce w-[90%] max-w-sm">
          <div className="font-['Press_Start_2P'] text-[#ffb300] text-[9px] mb-2 font-bold">
            🌟 QUEST COMPLETED!
          </div>
          <p className="font-['VT323'] text-white text-lg font-bold">
            {showReward}
          </p>
        </div>
      )}

      {/* Reading Modal */}
      {readingCapsule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-6 max-w-md w-full space-y-4">
            <div className="text-center">
              <span className="text-4xl select-none">{readingCapsule.emoji}</span>
              <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ffb300] mt-3 font-bold">
                🔓 KAPSUL TERBUKA!
              </h3>
              <p className="font-['VT323'] text-xs text-[#a0a0b0] mt-1">
                Dibuat: {new Date(readingCapsule.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-[#1a1a2a] border-2 border-[#000000] p-4">
              <p className="font-['VT323'] text-lg text-[#ffffff] whitespace-pre-wrap leading-relaxed">
                {readingCapsule.message}
              </p>
            </div>
            <div className="flex justify-center">
              <PixelButton onClick={() => setReadingCapsule(null)} size="sm" className="text-[9px]">
                TUTUP
              </PixelButton>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">

        {/* Treasure Chest Header */}
        <div className="bg-[#121224] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000] text-center">
          <div className="text-4xl select-none mb-2">🗝️📦</div>
          <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold">
            MEMORY VAULT
          </h2>
          <p className="font-['VT323'] text-base text-[#a0a0b0] mt-1">
            {capsules.length} kapsul tersimpan • {capsules.filter(c => isUnlocked(c) && !c.opened).length} siap dibuka
          </p>
        </div>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="bg-[#121224] border-4 border-[#000000] p-4 sm:p-5 shadow-[4px_4px_0_#000000] space-y-4">
          <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold uppercase tracking-wider border-b-2 border-[#000000] pb-2 select-none">
            ✨ BUAT KAPSUL BARU
          </h2>

          {/* Emoji selector */}
          <div>
            <label className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mb-2 block select-none">
              PILIH EMOJI TAG
            </label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setSelectedEmoji(e)}
                  className={`w-10 h-10 flex items-center justify-center border-2 text-xl select-none transition-all ${
                    selectedEmoji === e
                      ? 'bg-[#ff69b4] border-[#000000] shadow-[2px_2px_0_#000000] scale-110'
                      : 'bg-[#1a1a2a] border-[#000000]/40 hover:bg-[#222235]'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mb-2 block select-none">
              PESAN RAHASIA
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan untuk dibuka di masa depan..."
              required
              rows={4}
              className="w-full px-3 py-2 bg-[#1a1a2a] border-2 border-[#000000] text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-lg placeholder-[#a0a0b0]/40 resize-none"
            />
          </div>

          {/* Unlock Date */}
          <div>
            <label className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mb-2 block select-none">
              TANGGAL BUKA
            </label>
            <input
              type="date"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              min={getMinDate()}
              required
              className="w-full px-3 py-2 bg-[#1a1a2a] border-2 border-[#000000] text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-lg"
            />
          </div>

          <PixelButton type="submit" className="w-full py-3 text-[9px]">
            🔒 KUNCI KAPSUL WAKTU
          </PixelButton>
        </form>

        {/* Capsule List */}
        <div className="space-y-4">
          <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold select-none">
            📦 KAPSUL TERSIMPAN
          </h2>

          {capsules.length === 0 && (
            <div className="bg-[#121224] border-4 border-[#000000] p-8 shadow-[4px_4px_0_#000000] text-center">
              <span className="text-3xl select-none">📦</span>
              <p className="font-['VT323'] text-base text-[#a0a0b0] mt-3">
                Belum ada kapsul waktu. Buat yang pertama!
              </p>
            </div>
          )}

          {capsules.map(capsule => {
            const unlocked = isUnlocked(capsule);
            const countdown = getCountdown(capsule.unlockDate);

            return (
              <div
                key={capsule.id}
                className={`bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] overflow-hidden ${
                  unlocked && !capsule.opened ? 'border-[#ffb300]' : ''
                }`}
              >
                {/* Ornate pixel top border */}
                <div className="h-2 w-full" style={{
                  background: unlocked
                    ? 'repeating-linear-gradient(90deg, #ffb300 0px, #ffb300 8px, #0c0a18 8px, #0c0a18 16px)'
                    : 'repeating-linear-gradient(90deg, #ff69b4 0px, #ff69b4 8px, #0c0a18 8px, #0c0a18 16px)',
                }} />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl select-none bg-[#1a1a2a] border-2 border-[#000000] w-12 h-12 flex items-center justify-center shrink-0">
                        {capsule.emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg select-none">
                            {unlocked ? '🔓' : '🔒'}
                          </span>
                          <span className="font-['Press_Start_2P'] text-[7px] text-[#ff69b4] font-bold">
                            {unlocked
                              ? capsule.opened ? 'SUDAH DIBACA' : 'SIAP DIBUKA!'
                              : 'TERKUNCI'
                            }
                          </span>
                        </div>
                        <p className="font-['VT323'] text-xs text-[#a0a0b0]">
                          Dibuat: {new Date(capsule.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="font-['VT323'] text-xs text-[#a0a0b0]">
                          Buka: {new Date(capsule.unlockDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Countdown or message */}
                  {!unlocked && countdown && (
                    <div className="mt-3 bg-[#1a1a2a] border-2 border-[#000000] p-3">
                      <p className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mb-2 text-center select-none">
                        COUNTDOWN
                      </p>
                      <div className="flex justify-center gap-3">
                        {[
                          { val: countdown.days, label: 'HARI' },
                          { val: countdown.hours, label: 'JAM' },
                          { val: countdown.minutes, label: 'MNT' },
                          { val: countdown.seconds, label: 'DTK' },
                        ].map(item => (
                          <div key={item.label} className="text-center">
                            <div className="font-['Press_Start_2P'] text-[12px] text-[#ffb300] bg-[#000000] border-2 border-[#000000] px-2 py-1 min-w-[36px]">
                              {String(item.val).padStart(2, '0')}
                            </div>
                            <div className="font-['Press_Start_2P'] text-[5px] text-[#a0a0b0] mt-1">
                              {item.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {unlocked && capsule.opened && (
                    <div className="mt-3 bg-[#1a1a2a] border-2 border-[#000000] p-3">
                      <p className="font-['VT323'] text-lg text-[#ffffff] whitespace-pre-wrap">
                        {capsule.message}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2">
                    {unlocked && !capsule.opened && (
                      <PixelButton onClick={() => handleOpen(capsule)} size="sm" className="text-[8px] flex-1">
                        🔓 BUKA KAPSUL
                      </PixelButton>
                    )}
                    {unlocked && capsule.opened && (
                      <PixelButton onClick={() => setReadingCapsule(capsule)} variant="secondary" size="sm" className="text-[8px] flex-1">
                        📖 BACA LAGI
                      </PixelButton>
                    )}
                    <PixelButton onClick={() => handleDelete(capsule.id)} variant="secondary" size="sm" className="text-[8px]">
                      🗑️
                    </PixelButton>
                  </div>
                </div>

                {/* Ornate pixel bottom border */}
                <div className="h-2 w-full" style={{
                  background: unlocked
                    ? 'repeating-linear-gradient(90deg, #ffb300 0px, #ffb300 8px, #0c0a18 8px, #0c0a18 16px)'
                    : 'repeating-linear-gradient(90deg, #ff69b4 0px, #ff69b4 8px, #0c0a18 8px, #0c0a18 16px)',
                }} />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default TimeCapsulePage;
