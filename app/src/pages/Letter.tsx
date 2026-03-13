import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MailOpen, PenSquare, CheckCircle2, Sparkles } from 'lucide-react';

import { PixelButton } from '@/components/custom/PixelButton';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface GameState {
  replyLetter: string;
}

const LETTER_TEXT = `Sayangku,

Tidak terasa kita sudah menjalani hubungan sejauh ini. Rasanya seperti baru kemarin kita bertemu, tapi sekaligus rasanya sudah mengenalmu seumur hidup.

Setiap hari bersamamu adalah berkat. Setiap tawa yang kita bagikan adalah harta yang tak ternilai. Setiap momen, baik suka maupun duka, telah membuat kita semakin kuat.

Terima kasih untuk cinta kamu yang memang terkadang naik turun, tapi aku memahaminya karena keadaan terkadang tidak selalu seperti yang kita inginkan. Namun, aku tetap berterima kasih dan sangat menghargainya.

Terima kasih untuk dukunganmu di saat-saat sulit. Terima kasih untuk setiap senyum, pelukan, dan kata-kata manis yang selalu membuat hariku lebih cerah.

Aku berjanji akan terus mencintaimu, menghargaimu, dan berusaha menjadi yang terbaik untukmu. Ini bukan akhir, melainkan awal dari perjalanan yang lebih panjang.

Sayang, aku mencintaimu hari ini, besok, dan selamanya.

Dengan segenap cintaku,
Aku 💕`;

const LETTER_SPEED = 18;

const Letter: React.FC = () => {
  const navigate = useNavigate();
  const successTimeoutRef = useRef<number | null>(null);

  const [gameState, setGameState] = useLocalStorage<GameState>('gameState', {
    replyLetter: '',
  });

  const [reply, setReply] = useState(gameState.replyLetter || '');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [visibleChars, setVisibleChars] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);

  const displayedText = skipTyping
    ? LETTER_TEXT
    : LETTER_TEXT.slice(0, visibleChars);

  const isTypingFinished = displayedText.length >= LETTER_TEXT.length;
  const trimmedReply = reply.trim();

  useEffect(() => {
    if (skipTyping) return;
    if (visibleChars >= LETTER_TEXT.length) return;

    const timeoutId = window.setTimeout(() => {
      setVisibleChars((prev) => prev + 1);
    }, LETTER_SPEED);

    return () => window.clearTimeout(timeoutId);
  }, [visibleChars, skipTyping]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmitReply = () => {
    if (!trimmedReply) return;

    setGameState({
      ...gameState,
      replyLetter: trimmedReply,
    });

    setReply(trimmedReply);
    setIsSubmitted(true);

    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    successTimeoutRef.current = window.setTimeout(() => {
      setIsSubmitted(false);
      setShowReplyForm(false);
    }, 1800);
  };

  const handleEditReply = () => {
    setReply(gameState.replyLetter || '');
    setIsSubmitted(false);
    setShowReplyForm(true);
  };

  const handleCancelReply = () => {
    setReply(gameState.replyLetter || '');
    setIsSubmitted(false);
    setShowReplyForm(false);
  };

  return (
    <div className="min-h-screen bg-[#16142b] text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,182,193,0.08),transparent_28%),linear-gradient(to_bottom,rgba(14,12,27,0.22),rgba(14,12,27,0.48))]" />

      <header className="relative z-20 border-b border-[#FF69B4]/20 bg-[#1A1A2E]/88 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
              LOVE LETTER
            </h1>
            <p className="font-['VT323'] text-base text-white/60 mt-1">
              A letter from the heart
            </p>
          </div>

          <div className="w-20" />
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-10">
        <section className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-4 py-2 mb-4">
            <MailOpen className="w-4 h-4 text-[#FFD700]" />
            <span className="font-['VT323'] text-lg text-[#FFD700]">
              Personal Letter
            </span>
          </div>

          <div className="flex justify-center mb-4">
            <div className="text-5xl md:text-6xl animate-letter-float">💌</div>
          </div>

          <h2 className="font-['Press_Start_2P'] text-lg md:text-2xl text-white leading-relaxed">
            A little piece of my heart
          </h2>
        </section>

        <section className="relative rounded-[28px] border-4 border-[#8b5a2b] bg-[#f5e9cf] text-[#4a2c11] shadow-[10px_10px_0px_0px_rgba(0,0,0,0.28)] overflow-hidden mb-8">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]" />
          <div className="absolute top-5 right-5 flex items-center gap-2 rounded-full border border-[#ff69b4]/20 bg-[#ff69b4]/10 px-3 py-1">
            <Heart className="w-4 h-4 text-[#FF69B4] fill-current" />
            <span className="font-['VT323'] text-lg text-[#8b5a2b]">sealed with love</span>
          </div>

          <div className="relative px-5 py-6 md:px-8 md:py-8">
            <div className="text-center mb-6">
              <h3 className="font-['Press_Start_2P'] text-sm md:text-base text-[#8b5a2b] mb-3">
                SURAT CINTA
              </h3>
              <div className="w-28 h-[3px] bg-[#8b5a2b]/35 mx-auto rounded-full" />
            </div>

            <div className="rounded-2xl border border-[#8b5a2b]/15 bg-[#fff9ee]/45 px-4 py-5 md:px-6 md:py-6">
              <div className="font-['VT323'] text-xl md:text-2xl leading-relaxed whitespace-pre-line text-[#4a2c11] min-h-[350px]">
                {displayedText}
                {!isTypingFinished && (
                  <span className="inline-block ml-1 animate-caret text-[#8b5a2b]">▌</span>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#8b5a2b]">
                <Sparkles className="w-4 h-4" />
                <span className="font-['VT323'] text-lg">
                  {isTypingFinished ? 'Selesai dibaca' : 'Surat sedang ditampilkan'}
                </span>
              </div>

              {!isTypingFinished && (
                <button
                  type="button"
                  onClick={() => setSkipTyping(true)}
                  className="rounded-xl border border-[#8b5a2b]/25 bg-[#8b5a2b]/10 px-4 py-2 font-['VT323'] text-lg text-[#8b5a2b] hover:bg-[#8b5a2b] hover:text-[#f5e9cf] transition-all duration-200"
                >
                  Skip animation
                </button>
              )}
            </div>

            <div className="flex justify-center gap-2 mt-6">
              <span className="text-[#FF69B4] animate-pulse">💕</span>
              <span className="text-[#FF69B4] animate-pulse" style={{ animationDelay: '0.2s' }}>
                💕
              </span>
              <span className="text-[#FF69B4] animate-pulse" style={{ animationDelay: '0.4s' }}>
                💕
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#FF69B4]/25 bg-[#241f3d]/90 p-5 md:p-6 shadow-[0_0_22px_rgba(255,105,180,0.08)] mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-[#FF69B4]/12 p-2 border border-[#FF69B4]/20">
              <PenSquare className="w-5 h-5 text-[#FF69B4]" />
            </div>

            <div>
              <h3 className="font-['Press_Start_2P'] text-xs md:text-sm text-white">
                BALAS SURAT INI
              </h3>
              <p className="font-['VT323'] text-lg text-white/60 mt-1">
                Tulis isi hatimu untukku
              </p>
            </div>
          </div>

          {!showReplyForm ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setShowReplyForm(true);
                }}
                className="rounded-2xl border-2 border-[#FF69B4] bg-[#FF69B4]/10 px-5 py-3 font-['Press_Start_2P'] text-xs md:text-sm text-white hover:bg-[#FF69B4] hover:text-white transition-all duration-200 shadow-[0_0_14px_rgba(255,105,180,0.12)]"
              >
                💌 TULIS BALASAN
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#1b1630] p-4 md:p-5">
              {!isSubmitted ? (
                <>
                  <label className="block font-['Press_Start_2P'] text-[10px] md:text-xs text-[#FFD700] mb-3">
                    BALASANMU
                  </label>

                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Tulis isi hatimu di sini..."
                    className="w-full h-40 rounded-2xl border-2 border-[#FF69B4]/35 bg-[#fff9ee] px-4 py-4 text-[#4a2c11] font-['VT323'] text-xl resize-none focus:outline-none focus:border-[#FFD700] leading-relaxed"
                  />

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="font-['VT323'] text-base text-white/50">
                      {reply.length} karakter
                    </p>

                    <p className="font-['VT323'] text-base text-white/50">
                      {trimmedReply ? 'Siap disimpan' : 'Tulis dulu sebelum kirim'}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 mt-5">
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-['Press_Start_2P'] text-[10px] md:text-xs text-white hover:bg-white/10 transition-all duration-200"
                    >
                      BATAL
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitReply}
                      disabled={!trimmedReply}
                      className={[
                        'rounded-xl px-4 py-2 font-["Press_Start_2P"] text-[10px] md:text-xs transition-all duration-200',
                        trimmedReply
                          ? 'border border-[#FF69B4] bg-[#FF69B4] text-white hover:brightness-110'
                          : 'border border-white/10 bg-white/5 text-white/30 cursor-not-allowed',
                      ].join(' ')}
                    >
                      KIRIM 💕
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-3 animate-soft-pop">
                  <CheckCircle2 className="w-10 h-10 text-[#FFD700] mx-auto mb-3" />
                  <p className="font-['Press_Start_2P'] text-sm md:text-base text-[#FFD700]">
                    BALASAN TERSIMPAN!
                  </p>
                  <p className="font-['VT323'] text-xl text-white mt-2">
                    Terima kasih untuk balasannya sayang 💕
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {gameState.replyLetter && !showReplyForm && (
          <section className="rounded-[24px] border border-[#FF69B4]/30 bg-[#2a2346]/90 p-5 md:p-6 shadow-[0_0_20px_rgba(255,105,180,0.08)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-['Press_Start_2P'] text-xs md:text-sm text-[#FF69B4]">
                  PESAN DARIMU
                </h3>
                <p className="font-['VT323'] text-lg text-white/55 mt-1">
                  Balasan yang sudah tersimpan
                </p>
              </div>

              <button
                type="button"
                onClick={handleEditReply}
                className="rounded-xl border border-[#FF69B4]/30 bg-[#FF69B4]/10 px-4 py-2 font-['Press_Start_2P'] text-[10px] md:text-xs text-white hover:bg-[#FF69B4] transition-all duration-200"
              >
                EDIT
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#fff9ee] px-4 py-4">
              <p className="font-['VT323'] text-xl text-[#4a2c11] whitespace-pre-line leading-relaxed">
                {gameState.replyLetter}
              </p>
            </div>
          </section>
        )}
      </main>

      <style>{`
        @keyframes letter-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes caret {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        @keyframes soft-pop {
          0% {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-letter-float {
          animation: letter-float 2.8s ease-in-out infinite;
        }

        .animate-caret {
          animation: caret 0.8s step-end infinite;
        }

        .animate-soft-pop {
          animation: soft-pop 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Letter;