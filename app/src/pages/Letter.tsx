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
    <div className="h-[100dvh] max-h-[100dvh] bg-[#f4f0e6] text-[#1a1a2e] flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-black/[0.02]" />

      <header className="sticky top-0 z-45 border-b-4 border-[#1A1A2E] bg-[#e8e5da] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#1a1a2e] leading-none">
              LOVE LETTER
            </h1>
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider hidden sm:block font-bold">
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
              className="mx-auto max-w-sm cursor-pointer group bg-[#ffffff] border-4 border-[#1a1a2e] rounded-xl p-6 text-center shadow-[4px_4px_0_#1a1a2e] hover:-translate-y-0.5 transition-all duration-150 text-[#1a1a2e]"
            >
              <div className="relative w-32 h-24 mx-auto mb-4 bg-white border-4 border-[#1a1a2e] rounded flex items-center justify-center shadow-[2px_2px_0_#1a1a2e] overflow-hidden group-hover:scale-102 transition-transform duration-150">
                <div className="absolute inset-x-0 top-0 h-1/2 bg-black/[0.04] border-b-2 border-[#1a1a2e]" style={{ clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }} />
                <Heart className="w-10 h-10 text-[#FF69B4] fill-current animate-pulse z-10" />
              </div>
              <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-2 tracking-wide select-none font-bold">
                YOU HAVE A LETTER
              </h3>
              <p className="font-['VT323'] text-lg text-[#1a1a2e]/60 select-none">
                Ketuk amplop untuk membuka surat cinta dari pasanganmu
              </p>
            </div>
          ) : (
            /* Opened Envelope & Parchment Paper */
            <div className="relative rounded-xl border-4 border-[#1a1a2e] bg-[#fcfaf2] text-[#1a1a2e] shadow-[4px_4px_0_#1a1a2e] overflow-hidden transition-all duration-150">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              
              <div className="absolute top-4 right-4 flex items-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setIsEnvelopeOpened(false)}
                  className="font-['Press_Start_2P'] text-[7px] text-[#1a1a2e]/60 hover:text-[#ff69b4] transition-colors"
                >
                  [TUTUP SURAT]
                </button>
              </div>

              <div className="px-5 py-6 md:px-8 md:py-8">
                <div className="text-center mb-5 select-none">
                  <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-2.5 font-bold">
                    ✉️ SURAT UNTUKKU
                  </h3>
                  <div className="w-24 h-0.5 bg-[#1a1a2e]/10 mx-auto rounded-full" />
                </div>

                <div className="rounded-xl border border-[#1a1a2e]/15 bg-[#ffffff] px-4 py-5 md:px-6 md:py-6">
                  <div className="font-['VT323'] text-lg md:text-xl leading-relaxed whitespace-pre-line text-[#1a1a2e] min-h-[220px]">
                    {displayedText}
                    {!isTypingFinished && (
                      <span className="inline-block ml-0.5 animate-caret text-[#ff69b4] font-bold">▌</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 select-none">
                  <div className="flex items-center gap-2 text-[#1a1a2e]/60">
                    <Heart className="w-3.5 h-3.5 text-[#ff69b4] fill-current animate-pulse" />
                    <span className="font-['VT323'] text-base uppercase tracking-wider opacity-75">
                      {isTypingFinished ? 'Telah selesai dibaca' : 'Surat sedang dibaca'}
                    </span>
                  </div>

                  {!isTypingFinished && (
                    <button
                      type="button"
                      onClick={() => setSkipTyping(true)}
                      className="rounded-lg border-2 border-[#1a1a2e] bg-[#e8e5da] px-3 py-1 font-['VT323'] text-base text-[#1a1a2e] hover:bg-[#ff69b4] hover:text-white transition-all duration-100 shadow-[2px_2px_0_#1a1a2e] font-bold"
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
        <section className="rounded-xl border-4 border-[#1a1a2e] bg-[#ffffff] p-5 shadow-[4px_4px_0_#1a1a2e] mb-6 text-[#1a1a2e]">
          <div className="flex items-center gap-3 mb-4 select-none">
            <div className="rounded-lg bg-[#e8e5da] p-2 border border-[#1a1a2e]/20 shrink-0">
              <PenSquare className="w-4 h-4 text-[#ff69b4]" />
            </div>

            <div>
              <h3 className="font-['Press_Start_2P'] text-[9px] md:text-[10px] text-[#1a1a2e] tracking-wide font-bold">
                SURAT CINTAKU UNTUKNYA
              </h3>
              <p className="font-['VT323'] text-base text-[#1a1a2e]/60">
                Tuliskan isi hati terdalammu untuk pasanganmu
              </p>
            </div>
          </div>

          {!showReplyForm ? (
            <div className="text-center py-2 select-none">
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
            <div className="rounded-lg border-2 border-[#1a1a2e] bg-[#e8e5da]/20 p-4">
              {!isSubmitted ? (
                <>
                  <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 select-none font-bold">
                    ISI SURATMU
                  </label>

                  <textarea
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Sayangku... (Tulis surat cintamu di sini)"
                    className="w-full h-44 rounded-xl border-2 border-[#1a1a2e] bg-[#ffffff] px-3.5 py-3.5 text-[#1a1a2e] font-['VT323'] text-lg resize-none focus:outline-none focus:border-[#ff69b4] leading-relaxed transition-colors placeholder-[#1a1a2e]/40"
                  />

                  <div className="mt-2 flex items-center justify-between gap-4 font-['VT323'] text-sm text-[#1a1a2e]/55 select-none font-semibold">
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
                <div className="text-center py-3 animate-soft-pop select-none">
                  <CheckCircle2 className="w-8 h-8 text-[#ff69b4] mx-auto mb-2" />
                  <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold">
                    SURAT BERHASIL DIKIRIM!
                  </p>
                  <p className="font-['VT323'] text-lg text-[#1a1a2e]/60 mt-1 font-semibold">
                    Surat cintamu telah disegel dan siap dibaca oleh pasanganmu 💕
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* My Letter Draft */}
        {myLetter && !showReplyForm && (
          <section className="rounded-xl border-4 border-[#1a1a2e] bg-[#12121c] p-5 shadow-[4px_4px_0_#000000]">
            <div className="flex items-start justify-between gap-4 mb-3 select-none">
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
                className="rounded-lg border-2 border-[#1a1a2e] bg-black/40 px-3 py-1 font-['Press_Start_2P'] text-[8px] text-white hover:bg-[#FF69B4] transition-colors shadow-[2px_2px_0_#000000]"
              >
                EDIT
              </button>
            </div>

            <div className="rounded-lg border border-white/5 bg-black/35 px-4 py-4">
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