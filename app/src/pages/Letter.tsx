import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, PenSquare, CheckCircle2 } from 'lucide-react';
import { PixelButton } from '@/components/custom/PixelButton';
import { getLoveLetter, saveLoveLetter } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const DEFAULT_PARTNER_TEXT = `Sayangku,
Aku belum menulis surat cintaku untukmu di sini...
Tunggu sebentar ya, aku akan segera menuliskan segenap isi hatiku untukmu di kolom bawah layar HP-ku! 💕`;

const LETTER_SPEED = 18;

const Letter: React.FC = () => {
  const navigate = useNavigate();
  const successTimeoutRef = useRef<number | null>(null);

  const [partnerLetter, setPartnerLetter] = useState(DEFAULT_PARTNER_TEXT);
  const [myLetter, setMyLetter] = useState('');
  
  const [replyInput, setReplyInput] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [visibleChars, setVisibleChars] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnvelopeOpened, setIsEnvelopeOpened] = useState(false);

  // Load awal
  const loadLetterData = async () => {
    try {
      const { myLetter: mine, partnerLetter: partner } = await getLoveLetter();
      setMyLetter(mine);
      setReplyInput(mine);
      if (partner.trim()) {
        setPartnerLetter(partner);
      } else {
        setPartnerLetter(DEFAULT_PARTNER_TEXT);
      }
    } catch (err) {
      console.error('Error load love letters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLetterData();
  }, []);

  // Realtime subscription agar surat terupdate instan saat pasangan menyimpan surat baru
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('public:letters:realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'letters',
        },
        async () => {
          console.log('[Realtime] Perubahan surat cinta terdeteksi, memuat ulang...');
          const { myLetter: mine, partnerLetter: partner } = await getLoveLetter();
          setMyLetter(mine);
          if (partner.trim()) {
            setPartnerLetter(partner);
            // Reset typing animation agar mengetik ulang jika ada surat baru
            setVisibleChars(0);
            setSkipTyping(false);
          } else {
            setPartnerLetter(DEFAULT_PARTNER_TEXT);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  // Animasi Mengetik Surat
  const displayedText = skipTyping
    ? partnerLetter
    : partnerLetter.slice(0, visibleChars);

  const isTypingFinished = displayedText.length >= partnerLetter.length;
  const trimmedReply = replyInput.trim();

  useEffect(() => {
    if (skipTyping) return;
    if (visibleChars >= partnerLetter.length) return;

    const timeoutId = window.setTimeout(() => {
      setVisibleChars((prev) => prev + 1);
    }, LETTER_SPEED);

    return () => window.clearTimeout(timeoutId);
  }, [visibleChars, skipTyping, partnerLetter]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Simpan Surat Kita
  const handleSubmitReply = async () => {
    if (!trimmedReply) return;

    setIsSubmitted(true);
    try {
      await saveLoveLetter(trimmedReply);
      setMyLetter(trimmedReply);
    } catch (err) {
      console.error('Gagal menyimpan surat cinta:', err);
      alert('Gagal menyimpan surat. Silakan coba lagi.');
      setIsSubmitted(false);
      return;
    }

    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    successTimeoutRef.current = window.setTimeout(() => {
      setIsSubmitted(false);
      setShowReplyForm(false);
    }, 1800);
  };

  const handleEditReply = () => {
    setReplyInput(myLetter);
    setIsSubmitted(false);
    setShowReplyForm(true);
  };

  const handleCancelReply = () => {
    setReplyInput(myLetter);
    setIsSubmitted(false);
    setShowReplyForm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16142b] flex items-center justify-center">
        <p className="font-['Press_Start_2P'] text-xs text-[#FF69B4] animate-pulse">
          MEMBUKA SEGEL SURAT...
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] text-white flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,105,180,0.06),_transparent_40%)]" />
      </div>

      <header className="sticky top-0 z-45 border-b border-[#1A1A2E] bg-[#080b18]/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-white leading-none">
              LOVE LETTER
            </h1>
            <p className="font-['VT323'] text-xs text-white/50 mt-1 tracking-wider hidden sm:block">
              Surat dari lubuk hati terdalam
            </p>
          </div>

          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 py-6 overflow-y-auto">
        
        {/* Envelope Container */}
        <section className="mb-6">
          {!isEnvelopeOpened ? (
            /* Interactive Closed Envelope Badge */
            <div 
              onClick={() => {
                setIsEnvelopeOpened(true);
                setVisibleChars(0);
                setSkipTyping(false);
              }}
              className="mx-auto max-w-sm cursor-pointer group bg-[#090b1e]/90 border-4 border-[#1a1a2e] rounded-2xl p-6 text-center shadow-[4px_4px_0_#FF69B4,inset_-4px_-4px_0_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:border-[#FF69B4]/50 transition-all duration-200"
            >
              <div className="relative w-32 h-24 mx-auto mb-4 bg-[#FF69B4]/10 border-4 border-[#FF69B4] rounded flex items-center justify-center shadow-[4px_4px_0_#1a1a2e] overflow-hidden group-hover:scale-105 transition-transform duration-200">
                <div className="absolute inset-x-0 top-0 h-1/2 bg-[#FF69B4]/20 border-b-2 border-[#FF69B4]" style={{ clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }} />
                <Heart className="w-10 h-10 text-[#FF69B4] fill-current animate-pulse z-10" />
              </div>
              <h3 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-2 tracking-wide">
                YOU HAVE A LETTER
              </h3>
              <p className="font-['VT323'] text-lg text-white/60">
                Ketuk amplop untuk membuka surat cinta dari pasanganmu
              </p>
            </div>
          ) : (
            /* Opened Envelope & Parchment Paper */
            <div className="relative rounded-2xl border-4 border-[#8b5a2b] bg-[#f5e9cf] text-[#4a2c11] shadow-[4px_4px_0_#1a1a2e] overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15),rgba(255,255,255,0.02))] pointer-events-none" />
              
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnvelopeOpened(false)}
                  className="font-['Press_Start_2P'] text-[7px] text-[#8b5a2b]/70 hover:text-[#ff69b4] transition-colors"
                >
                  [TUTUP SURAT]
                </button>
              </div>

              <div className="px-5 py-6 md:px-8 md:py-8">
                <div className="text-center mb-5">
                  <h3 className="font-['Press_Start_2P'] text-[9px] text-[#8b5a2b] mb-2.5">
                    ✉️ SURAT UNTUKKU
                  </h3>
                  <div className="w-24 h-0.5 bg-[#8b5a2b]/25 mx-auto rounded-full" />
                </div>

                <div className="rounded-xl border border-[#8b5a2b]/15 bg-[#fff9ee]/50 px-4 py-5 md:px-6 md:py-6 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)]">
                  <div className="font-['VT323'] text-lg md:text-xl leading-relaxed whitespace-pre-line text-[#4a2c11] min-h-[220px]">
                    {displayedText}
                    {!isTypingFinished && (
                      <span className="inline-block ml-0.5 animate-caret text-[#8b5a2b] font-bold">▌</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 select-none">
                  <div className="flex items-center gap-2 text-[#8b5a2b]">
                    <Heart className="w-3.5 h-3.5 text-[#ff69b4] fill-current animate-pulse" />
                    <span className="font-['VT323'] text-base uppercase tracking-wider opacity-75">
                      {isTypingFinished ? 'Telah selesai dibaca' : 'Surat sedang dibaca'}
                    </span>
                  </div>

                  {!isTypingFinished && (
                    <button
                      type="button"
                      onClick={() => setSkipTyping(true)}
                      className="rounded-lg border border-[#8b5a2b]/20 bg-[#8b5a2b]/10 px-3 py-1 font-['VT323'] text-base text-[#8b5a2b] hover:bg-[#8b5a2b] hover:text-[#f5e9cf] transition-all duration-100"
                    >
                      Tampilkan Semua
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Reply Section */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#111327]/80 p-5 shadow-lg mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-[#FF69B4]/10 p-2 border border-[#FF69B4]/20 shrink-0">
              <PenSquare className="w-4 h-4 text-[#FF69B4]" />
            </div>

            <div>
              <h3 className="font-['Press_Start_2P'] text-[9px] md:text-[10px] text-white tracking-wide">
                SURAT CINTAKU UNTUKNYA
              </h3>
              <p className="font-['VT323'] text-base text-white/50">
                Tuliskan isi hati terdalammu untuk pasanganmu
              </p>
            </div>
          </div>

          {!showReplyForm ? (
            <div className="text-center py-2">
              <PixelButton
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setShowReplyForm(true);
                }}
                variant="primary"
                size="sm"
                className="text-[9px] px-6 py-3"
              >
                💌 {myLetter ? 'EDIT SURAT CINTAKU' : 'TULIS SURAT CINTA'}
              </PixelButton>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.05] bg-[#090b1e]/60 p-4">
              {!isSubmitted ? (
                <>
                  <label className="block font-['Press_Start_2P'] text-[8px] text-[#FFD700] mb-2">
                    ISI SURATMU
                  </label>

                  <textarea
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Sayangku... (Tulis surat cintamu di sini)"
                    className="w-full h-44 rounded-xl border-2 border-white/10 bg-[#fff9ee] px-3.5 py-3.5 text-[#4a2c11] font-['VT323'] text-lg resize-none focus:outline-none focus:border-[#FF69B4] leading-relaxed transition-colors"
                  />

                  <div className="mt-2 flex items-center justify-between gap-4 font-['VT323'] text-sm text-white/40">
                    <p>{replyInput.length} karakter</p>
                    <p>{trimmedReply ? 'Siap dikirim' : 'Kotak surat kosong'}</p>
                  </div>

                  <div className="flex justify-center gap-3 mt-4">
                    <PixelButton
                      type="button"
                      onClick={handleCancelReply}
                      variant="secondary"
                      size="sm"
                      className="text-[9px] flex-1 max-w-[120px]"
                    >
                      BATAL
                    </PixelButton>

                    <PixelButton
                      type="button"
                      onClick={handleSubmitReply}
                      disabled={!trimmedReply}
                      variant="primary"
                      size="sm"
                      className="text-[9px] flex-1 max-w-[120px]"
                    >
                      KIRIM 💕
                    </PixelButton>
                  </div>
                </>
              ) : (
                <div className="text-center py-3 animate-soft-pop">
                  <CheckCircle2 className="w-8 h-8 text-[#FFD700] mx-auto mb-2" />
                  <p className="font-['Press_Start_2P'] text-[9px] text-[#FFD700]">
                    SURAT BERHASIL DIKIRIM!
                  </p>
                  <p className="font-['VT323'] text-lg text-white/60 mt-1">
                    Surat cintamu telah disegel dan siap dibaca oleh pasanganmu 💕
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* My Letter Draft */}
        {myLetter && !showReplyForm && (
          <section className="rounded-2xl border border-white/[0.05] bg-[#111327]/40 p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-['Press_Start_2P'] text-[9px] text-[#FF69B4] tracking-wide">
                  SURAT YANG KU-KIRIM
                </h3>
                <p className="font-['VT323'] text-sm text-white/40">
                  Draft surat cinta aktif yang bisa dibaca pasanganmu
                </p>
              </div>

              <button
                type="button"
                onClick={handleEditReply}
                className="rounded-lg border border-[#FF69B4]/30 bg-[#FF69B4]/10 px-3 py-1 font-['Press_Start_2P'] text-[8px] text-white hover:bg-[#FF69B4] transition-colors"
              >
                EDIT
              </button>
            </div>

            <div className="rounded-xl border border-white/[0.05] bg-[#090b1e]/50 px-4 py-4">
              <p className="font-['VT323'] text-lg text-white/80 whitespace-pre-line leading-relaxed">
                {myLetter}
              </p>
            </div>
          </section>
        )}
      </main>

      <style>{`
        @keyframes caret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes soft-pop {
          0% { opacity: 0; transform: scale(0.97) translateY(4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-caret {
          animation: caret 0.8s step-end infinite;
        }
        .animate-soft-pop {
          animation: soft-pop 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Letter;