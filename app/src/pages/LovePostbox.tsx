import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

type LetterStatus = 'in_transit' | 'delivered' | 'read';

interface PostLetter {
  id: string;
  recipient: string;
  message: string;
  sentAt: string;
  deliverAt: string;
  delayLabel: string;
  status: LetterStatus;
  readAt?: string;
}

const STORAGE_KEY = 'lovestory-love-postbox';

const DELAY_OPTIONS = [
  { label: '1 Jam', hours: 1 },
  { label: '3 Jam', hours: 3 },
  { label: '6 Jam', hours: 6 },
  { label: '12 Jam', hours: 12 },
  { label: '24 Jam', hours: 24 },
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

const loadLetters = (): PostLetter[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return [];
};

const saveLetters = (letters: PostLetter[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
};

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'Sudah sampai!';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
};

const LovePostbox: React.FC = () => {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<PostLetter[]>(loadLetters);
  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [delayHours, setDelayHours] = useState(1);
  const [openLetterId, setOpenLetterId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick timer for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update letter statuses based on time
  useEffect(() => {
    let changed = false;
    const updated = letters.map(letter => {
      if (letter.status === 'in_transit' && now >= new Date(letter.deliverAt).getTime()) {
        changed = true;
        return { ...letter, status: 'delivered' as LetterStatus };
      }
      return letter;
    });
    if (changed) {
      setLetters(updated);
      saveLetters(updated);
    }
  }, [now, letters]);

  // Save on change
  useEffect(() => {
    saveLetters(letters);
  }, [letters]);

  const hasUnread = letters.some(l => l.status === 'delivered');

  const handleSend = useCallback(async () => {
    if (!recipient.trim() || !message.trim()) return;

    playSound(523, 0.12);
    setTimeout(() => playSound(659, 0.12), 100);

    const sentAt = new Date();
    const deliverAt = new Date(sentAt.getTime() + delayHours * 3600000);
    const delayOption = DELAY_OPTIONS.find(d => d.hours === delayHours);

    const newLetter: PostLetter = {
      id: `letter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      recipient: recipient.trim(),
      message: message.trim(),
      sentAt: sentAt.toISOString(),
      deliverAt: deliverAt.toISOString(),
      delayLabel: delayOption?.label || `${delayHours} Jam`,
      status: 'in_transit',
    };

    setLetters(prev => [newLetter, ...prev]);
    setRecipient('');
    setMessage('');
    setShowForm(false);

    // Award +10 Intimacy XP
    try { await addRelationshipXP(10, 'intimacy'); } catch { /* silent */ }
  }, [recipient, message, delayHours]);

  const handleReadLetter = useCallback(async (id: string) => {
    const letter = letters.find(l => l.id === id);
    if (!letter || letter.status === 'read') {
      setOpenLetterId(openLetterId === id ? null : id);
      return;
    }

    playSound(440, 0.15);

    if (letter.status === 'delivered') {
      setLetters(prev => prev.map(l =>
        l.id === id ? { ...l, status: 'read' as LetterStatus, readAt: new Date().toISOString() } : l
      ));
      // Award +5 Trust XP
      try { await addRelationshipXP(5, 'trust'); } catch { /* silent */ }
    }

    setOpenLetterId(openLetterId === id ? null : id);
  }, [letters, openLetterId]);

  const handleDeleteLetter = useCallback((id: string) => {
    playSound(220, 0.15);
    setLetters(prev => prev.filter(l => l.id !== id));
    if (openLetterId === id) setOpenLetterId(null);
  }, [openLetterId]);

  const inTransitLetters = letters.filter(l => l.status === 'in_transit');
  const deliveredLetters = letters.filter(l => l.status === 'delivered' || l.status === 'read');

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
              LOVE POSTBOX
            </h1>
          </div>
          <PixelButton onClick={() => setShowForm(!showForm)} variant="primary" size="sm" className="text-[9px] shrink-0">
            {showForm ? '✕' : '✉ TULIS'}
          </PixelButton>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">

        {/* Mailbox Display */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 text-center">
          <div className="text-5xl mb-2 relative inline-block">
            📮
            {/* Flag indicator */}
            {hasUnread && (
              <span className="absolute -top-1 -right-3 text-lg animate-bounce-flag">🚩</span>
            )}
          </div>
          <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-1">
            {hasUnread ? 'ADA SURAT BARU!' : 'POSTBOX'}
          </p>
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
            {letters.length} surat · {inTransitLetters.length} dalam perjalanan
          </p>
        </div>

        {/* Write Letter Form */}
        {showForm && (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-3">
            <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-2">TULIS SURAT CINTA</h2>

            <div>
              <label className="font-['VT323'] text-sm text-[#a0a0b0] block mb-1">Untuk siapa?</label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="Nama pasanganmu"
                maxLength={40}
                className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-3 py-2 outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/40"
              />
            </div>

            <div>
              <label className="font-['VT323'] text-sm text-[#a0a0b0] block mb-1">Isi surat</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tulis pesan cintamu di sini..."
                maxLength={500}
                rows={5}
                className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg px-3 py-2 outline-none focus:border-[#ff69b4] resize-none placeholder:text-[#a0a0b0]/40"
              />
              <p className="font-['VT323'] text-xs text-[#a0a0b0]/40 text-right mt-1">{message.length}/500</p>
            </div>

            <div>
              <label className="font-['VT323'] text-sm text-[#a0a0b0] block mb-1">Kirim dalam</label>
              <div className="flex flex-wrap gap-2">
                {DELAY_OPTIONS.map(opt => (
                  <button
                    key={opt.hours}
                    onClick={() => setDelayHours(opt.hours)}
                    className={[
                      "font-['Press_Start_2P'] text-[8px] px-3 py-2 border-4 border-[#000000] transition-colors",
                      delayHours === opt.hours
                        ? 'bg-[#ff69b4] text-[#000000]'
                        : 'bg-[#1a1a2a] text-[#a0a0b0] hover:bg-[#222240]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <PixelButton
                onClick={handleSend}
                variant="primary"
                size="sm"
                disabled={!recipient.trim() || !message.trim()}
                className="text-[9px] flex-1"
              >
                KIRIM 💌 +10 XP
              </PixelButton>
              <PixelButton onClick={() => setShowForm(false)} variant="secondary" size="sm" className="text-[9px]">
                BATAL
              </PixelButton>
            </div>
          </div>
        )}

        {/* In Transit Letters */}
        {inTransitLetters.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ffb300] flex items-center gap-2">
              <span className="envelope-move">💌</span> DALAM PERJALANAN
            </h2>
            {inTransitLetters.map(letter => {
              const deliverTime = new Date(letter.deliverAt).getTime();
              const sentTime = new Date(letter.sentAt).getTime();
              const totalDuration = deliverTime - sentTime;
              const elapsed = now - sentTime;
              const remaining = Math.max(0, deliverTime - now);
              const progress = Math.min(1, elapsed / totalDuration);

              return (
                <div key={letter.id} className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-['Press_Start_2P'] text-[8px] text-[#a0a0b0]">
                        Untuk: <span className="text-[#ff69b4]">{letter.recipient}</span>
                      </p>
                      <p className="font-['VT323'] text-xs text-[#a0a0b0]/60 mt-1">
                        Dikirim: {new Date(letter.sentAt).toLocaleString('id-ID')} · {letter.delayLabel}
                      </p>
                    </div>
                    <span className="envelope-move text-lg">💌</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-4 bg-[#1a1a2a] border-4 border-[#000000] relative mb-2">
                    <div
                      className="h-full bg-[#ff69b4] transition-all duration-1000"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <p className="font-['VT323'] text-sm text-[#ffb300] text-center">
                    Tiba dalam: {formatCountdown(remaining)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Delivered Letters */}
        {deliveredLetters.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] flex items-center gap-2">
              📬 SURAT DITERIMA
            </h2>
            {deliveredLetters.map(letter => {
              const isOpen = openLetterId === letter.id;
              const isUnread = letter.status === 'delivered';
              return (
                <div key={letter.id} className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000]">
                  <button
                    onClick={() => handleReadLetter(letter.id)}
                    className="w-full text-left p-4 flex justify-between items-center hover:bg-[#1a1a2a] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {isUnread && <span className="w-2 h-2 bg-[#ff69b4] inline-block shrink-0" />}
                        <p className="font-['Press_Start_2P'] text-[8px] text-[#a0a0b0]">
                          Untuk: <span className="text-[#ff69b4]">{letter.recipient}</span>
                        </p>
                      </div>
                      <p className="font-['VT323'] text-xs text-[#a0a0b0]/60 mt-1">
                        {new Date(letter.deliverAt).toLocaleString('id-ID')}
                        {letter.status === 'read' && ' · Dibaca'}
                        {isUnread && ' · Belum dibaca'}
                      </p>
                    </div>
                    <span className="font-['VT323'] text-lg text-[#a0a0b0]">{isOpen ? '▼' : '▶'}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t-4 border-[#000000] p-4 bg-[#1a1a2a]">
                      <p className="font-['VT323'] text-lg text-[#ffffff] leading-relaxed whitespace-pre-wrap mb-3">
                        {letter.message}
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t-2 border-[#000000]/30">
                        <span className="font-['VT323'] text-xs text-[#a0a0b0]/60">
                          {letter.delayLabel} delay
                        </span>
                        <button
                          onClick={() => handleDeleteLetter(letter.id)}
                          className="font-['VT323'] text-xs text-[#a0a0b0]/40 hover:text-[#ff69b4] transition-colors"
                        >
                          hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {letters.length === 0 && !showForm && (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-8 text-center">
            <div className="text-4xl mb-3">✉️</div>
            <p className="font-['Press_Start_2P'] text-[9px] text-[#a0a0b0] mb-2">POSTBOX KOSONG</p>
            <p className="font-['VT323'] text-base text-[#a0a0b0]">
              Tulis surat cinta pertamamu!
            </p>
          </div>
        )}

        {/* XP Info */}
        <div className="bg-[#1a1a2a] border-4 border-[#000000] p-3 text-center">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
            Tulis surat: +10 Intimacy XP · Baca surat: +5 Trust XP
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce-flag {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-flag {
          animation: bounce-flag 0.8s ease-in-out infinite;
        }
        @keyframes envelope-move-anim {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .envelope-move {
          animation: envelope-move-anim 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LovePostbox;
