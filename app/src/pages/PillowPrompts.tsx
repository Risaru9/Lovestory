import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-pillow-prompts';

interface AnsweredPrompt {
  prompt: string;
  response: string;
  answeredAt: string;
}

interface PillowState {
  currentPromptIndex: number;
  answered: AnsweredPrompt[];
  seenIndices: number[];
}

const PROMPTS: string[] = [
  'Apa pelukan terbaik yang kamu ingat?',
  'Kalau kita punya satu hari tanpa ponsel, mau ngapain?',
  'Apa hal kecil dariku yang membuatmu tersenyum?',
  'Kapan pertama kali kamu merasa jatuh cinta padaku?',
  'Apa mimpi yang ingin kita wujudkan bersama?',
  'Kalau bisa teleportasi, kamu mau ajak aku ke mana?',
  'Apa lagu yang mengingatkanmu tentang kita?',
  'Moment apa yang ingin kamu ulang lagi bersamaku?',
  'Apa yang paling kamu syukuri dari hubungan kita?',
  'Kalau kita punya superpower, kamu pilih apa?',
  'Apa makanan yang mengingatkanmu padaku?',
  'Hal apa yang ingin kamu pelajari bareng aku?',
  'Apa ketakutan terbesarmu tentang masa depan kita?',
  'Kalau menulis surat cinta, kalimat pertamanya apa?',
  'Apa kebiasaanku yang menurutmu lucu?',
  'Di mana tempat favoritmu untuk berduaan denganku?',
  'Apa yang kamu rasakan saat pertama kali kita bertemu?',
  'Kalau kita jadi karakter film, film apa?',
  'Apa hadiah terbaik yang pernah kamu terima dariku?',
  'Hal apa yang ingin kamu ubah dari cara kita berkomunikasi?',
  'Apa yang membuatmu merasa paling dicintai?',
  'Kalau kita punya rumah impian, seperti apa?',
  'Apa kenangan terlucu kita berdua?',
  'Bagaimana caramu mengatasi rindu saat kita jauh?',
  'Apa yang kamu kagumi dari diriku?',
  'Kalau besok dunia berakhir, apa yang mau kita lakukan hari ini?',
  'Apa arti kesetiaan menurutmu?',
  'Ceritakan satu rahasia kecil yang belum pernah kamu ceritakan.',
  'Apa yang paling kamu nantikan dari masa depan kita?',
  'Kalau kita bisa kembali ke masa lalu, ke kapan?',
  'Apa bahasa cinta utamamu?',
  'Hal sederhana apa yang bisa membuatmu bahagia hari ini?',
  'Apa resolusi hubungan kita untuk bulan depan?',
  'Kalau kita punya anak, nama apa yang kamu suka?',
  'Apa pesan yang ingin kamu sampaikan ke aku 10 tahun lagi?',
];

const defaultState: PillowState = {
  currentPromptIndex: 0,
  answered: [],
  seenIndices: [0],
};

const loadState = (): PillowState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState;
  } catch {
    return defaultState;
  }
};

const saveState = (data: PillowState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const playSound = (freq: number = 440, duration: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
  } catch (_e) { /* silent */ }
};

const PillowPrompts: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<PillowState>(loadState);
  const [response, setResponse] = useState('');
  const [saved, setSaved] = useState(false);

  const currentPrompt = PROMPTS[state.currentPromptIndex];

  useEffect(() => {
    saveState(state);
  }, [state]);

  const handleNextPrompt = useCallback(() => {
    let nextIndex: number;
    const unseenIndices = PROMPTS.map((_, i) => i).filter((i) => !state.seenIndices.includes(i));

    if (unseenIndices.length > 0) {
      nextIndex = unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
    } else {
      // All seen, pick random excluding current
      const others = PROMPTS.map((_, i) => i).filter((i) => i !== state.currentPromptIndex);
      nextIndex = others[Math.floor(Math.random() * others.length)];
    }

    setState((prev) => ({
      ...prev,
      currentPromptIndex: nextIndex,
      seenIndices: [...new Set([...prev.seenIndices, nextIndex])],
    }));
    setResponse('');
    setSaved(false);
    playSound(440, 0.08);
    setTimeout(() => playSound(554, 0.08), 80);
  }, [state.currentPromptIndex, state.seenIndices]);

  const handleSaveResponse = useCallback(async () => {
    if (!response.trim()) return;

    const entry: AnsweredPrompt = {
      prompt: currentPrompt,
      response: response.trim(),
      answeredAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      answered: [entry, ...prev.answered],
    }));

    setSaved(true);
    setResponse('');
    playSound(523, 0.1);
    setTimeout(() => playSound(659, 0.1), 100);
    setTimeout(() => playSound(784, 0.15), 200);

    try {
      await addRelationshipXP(10, 'intimacy');
    } catch (_e) { /* silent */ }
  }, [response, currentPrompt]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
              PILLOW PROMPTS 🌙
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">

        {/* Moon icon */}
        <div className="text-center select-none">
          <span className="text-4xl">🌙</span>
          <p className="font-['VT323'] text-lg text-[#a0a0b0] mt-1">
            Pertanyaan untuk malam yang tenang...
          </p>
        </div>

        {/* Featured prompt card - RPG dialog box style */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-5 relative">
          {/* Dialog box triangle indicator */}
          <div className="absolute -top-0 left-4">
            <span className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] bg-[#121224] px-2 -mt-2 block relative -top-2">
              PROMPT
            </span>
          </div>

          <p className="font-['VT323'] text-2xl text-[#ffffff] leading-relaxed mt-1 min-h-[60px]">
            &quot;{currentPrompt}&quot;
          </p>

          <div className="flex justify-between items-center mt-4">
            <span className="font-['VT323'] text-sm text-[#a0a0b0]">
              {state.seenIndices.length}/{PROMPTS.length} dilihat
            </span>
            <PixelButton onClick={handleNextPrompt} variant="primary" size="sm" className="text-[9px]">
              NEXT →
            </PixelButton>
          </div>
        </div>

        {/* Response input */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4">
          <p className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] mb-3">
            JAWABAN KAMU
          </p>
          <textarea
            value={response}
            onChange={(e) => {
              setResponse(e.target.value);
              setSaved(false);
            }}
            placeholder="Tulis jawabanmu di sini..."
            className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg p-3 resize-none h-24 placeholder-[#a0a0b0]/50 focus:outline-none focus:border-[#ff69b4]"
          />
          <div className="flex justify-between items-center mt-3">
            {saved && (
              <span className="font-['VT323'] text-base text-[#ffb300]">
                ✨ Tersimpan! +10 Intimacy XP
              </span>
            )}
            {!saved && <span />}
            <PixelButton
              onClick={handleSaveResponse}
              variant="accent"
              size="sm"
              disabled={!response.trim()}
              className="text-[9px]"
            >
              💾 SIMPAN
            </PixelButton>
          </div>
        </div>

        {/* Previously answered prompts */}
        {state.answered.length > 0 && (
          <div className="space-y-3">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">
              JAWABAN SEBELUMNYA ({state.answered.length})
            </p>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {state.answered.map((item, i) => (
                <div
                  key={i}
                  className="bg-[#1a1a2a] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3"
                >
                  <p className="font-['VT323'] text-base text-[#ff69b4] mb-1">
                    &quot;{item.prompt}&quot;
                  </p>
                  <p className="font-['VT323'] text-lg text-[#ffffff] mb-2">
                    {item.response}
                  </p>
                  <p className="font-['VT323'] text-sm text-[#a0a0b0]">
                    {formatTime(item.answeredAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PillowPrompts;
