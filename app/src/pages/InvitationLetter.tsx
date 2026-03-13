import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';

type ReactionType = 'happy' | 'sad' | 'hopeful';

interface ReactionState {
  type: ReactionType;
  title: string;
  message: string;
  emoji: string;
}

const RSVP_REACTIONS: Record<ReactionType, ReactionState> = {
  happy: {
    type: 'happy',
    title: 'YESSS! 🎉',
    message: 'Yay! Aku senang banget kamu mau datang. Aku tunggu yaa!',
    emoji: '🎉🥰✨',
  },
  sad: {
    type: 'sad',
    title: 'YAAH... 🍂',
    message: 'Sayang sekali kamu belum bisa datang. Semoga next time yaa.',
    emoji: '😢💔',
  },
  hopeful: {
    type: 'hopeful',
    title: 'HMM... ⏳',
    message: 'Semoga kamu ada waktu dan akhirnya bisa datang yaa.',
    emoji: '🥺🙏💗',
  },
};

const InvitationLetter: React.FC = () => {
  const navigate = useNavigate();
  const reactionTimeoutRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [reaction, setReaction] = useState<ReactionState | null>(null);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const timer1 = window.setTimeout(() => setIsOpen(true), 120);
    const timer2 = window.setTimeout(() => setShowContent(true), 320);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReaction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) {
        window.clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, []);

  const handleRSVP = (status: 'Hadir' | 'Tidak Hadir' | 'Maybe') => {
    if (reactionTimeoutRef.current) {
      window.clearTimeout(reactionTimeoutRef.current);
    }

    if (status === 'Hadir') {
      setReaction(RSVP_REACTIONS.happy);
    } else if (status === 'Tidak Hadir') {
      setReaction(RSVP_REACTIONS.sad);
    } else {
      setReaction(RSVP_REACTIONS.hopeful);
    }

    reactionTimeoutRef.current = window.setTimeout(() => {
      setReaction(null);
    }, 2500);
  };

  const handleOpenMaps = () => {
    window.open('https://goo.gl/maps/xybqUiUpevmuEdYu6', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#16142b]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,182,193,0.10),transparent_30%),linear-gradient(to_bottom,rgba(16,14,31,0.25),rgba(16,14,31,0.50))]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="absolute h-2 w-2 rounded-full bg-pink-200/25 animate-soft-float"
            style={{
              left: `${12 + index * 18}%`,
              top: `${14 + (index % 3) * 20}%`,
              animationDelay: `${index * 0.45}s`,
              animationDuration: `${5 + index}s`,
            }}
          />
        ))}
      </div>

      {reaction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="RSVP reaction"
        >
          <div className="w-full max-w-sm mx-4 rounded-2xl border-4 border-[#8b5a2b] bg-[#f4e4bc] px-6 py-7 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,0.35)] animate-modal-in">
            <div className="mb-4 text-5xl">{reaction.emoji}</div>
            <h2 className="font-['Press_Start_2P'] text-[#4a2c11] text-sm md:text-base mb-3 leading-relaxed">
              {reaction.title}
            </h2>
            <p className="font-['VT323'] text-2xl text-[#5d4037] leading-relaxed">
              {reaction.message}
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full items-center justify-center px-4 py-4">
        <div
          className={`relative w-full max-w-6xl transition-all duration-700 ${
            isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.98] translate-y-4'
          }`}
        >
          <div className="relative rounded-[30px] border-4 border-[#8b5a2b] bg-[#f4e4bc] shadow-[10px_10px_0px_0px_rgba(0,0,0,0.38)] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />

            <div className="relative px-5 py-5 md:px-8 md:py-7">
              <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 items-center min-h-[78vh] md:min-h-[76vh] lg:min-h-[72vh]">
                <div
                  className={`flex flex-col items-center justify-center text-center lg:border-r-2 border-[#8b5a2b]/15 lg:pr-8 transition-all duration-700 ${
                    showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                  }`}
                >
                  <div className="mb-3 text-4xl animate-envelope-bob">✉️</div>

                  <h1 className="font-['Press_Start_2P'] text-xl md:text-2xl xl:text-3xl text-[#4a2c11] leading-relaxed mb-6">
                    INVITATION FOR YOU
                  </h1>

                  <div className="max-w-xl space-y-4 font-['VT323'] text-xl md:text-2xl text-[#5d4037] leading-relaxed">
                    <p>
                      Halo, <span className="font-bold text-[#8b5a2b]">Sayangkuuu!</span>
                    </p>

                    <p>
                      Aku ingin mengundangmu ke <span className="rounded px-2 py-1 bg-[#8b5a2b]/12">rumahku</span>{' '}
                      untuk bermain, ngobrol, dan menghabiskan waktu bersama.
                    </p>

                    <p>
                      Datanglah dengan hati yang tenang dan mood yang ceria yaa.
                    </p>

                    <p className="italic text-[#8b5a2b] text-lg md:text-xl">
                      "Jangan lupa hati-hati di jalan."
                    </p>
                  </div>

                  <div className="mt-8">
                    <p className="font-['VT323'] text-xl text-[#8b5a2b] mb-1">Tertanda,</p>
                    <p className="font-['Press_Start_2P'] text-xs md:text-sm text-[#4a2c11]">
                      UR HONNEEE
                    </p>
                    <div className="mx-auto mt-2 h-[2px] w-36 bg-[#8b5a2b]/30" />
                  </div>
                </div>

                <div
                  className={`flex flex-col justify-center transition-all duration-700 delay-150 ${
                    showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#8b5a2b]/12 bg-[#8b5a2b]/08 px-5 py-4">
                      <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#8b5a2b] mb-2">
                        📍 LOKASI
                      </p>
                      <p className="font-['VT323'] text-2xl text-[#5d4037]">
                        Rumahkuuu
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#8b5a2b]/12 bg-[#8b5a2b]/08 px-5 py-4">
                      <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#8b5a2b] mb-2">
                        ⏰ WAKTU
                      </p>
                      <p className="font-['VT323'] text-2xl leading-snug text-[#5d4037]">
                        Kapanpun kamu mau datang, undangan ini selalu terbuka untukmu.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#FF69B4]/35 bg-[#ff69b4]/05 px-5 py-4">
                      <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#8b5a2b] mb-3">
                        OPEN INVITATION
                      </p>

                      <div className="rounded-xl border border-[#8b5a2b]/12 bg-[#f4e4bc]/55 px-4 py-4">
                        <p className="font-['VT323'] text-xl md:text-2xl text-center leading-snug text-[#5d4037]">
                          Datanglah saat kamu ingin berkunjung. Aku akan senang menyambutmu.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#8b5a2b]/12 bg-[#8b5a2b]/08 px-5 py-4">
                      <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#8b5a2b] mb-3">
                        RSVP
                      </p>

                      <p className="font-['VT323'] text-xl md:text-2xl text-[#8b5a2b] mb-3">
                        Konfirmasi kehadiranmu:
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleRSVP('Hadir')}
                          className="px-3 py-2 rounded-xl border-2 border-[#8b5a2b] font-['VT323'] text-xl text-[#5d4037] hover:bg-[#8b5a2b] hover:text-[#f4e4bc] transition-all duration-200"
                        >
                          ✅ Hadir
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRSVP('Maybe')}
                          className="px-3 py-2 rounded-xl border-2 border-[#8b5a2b] font-['VT323'] text-xl text-[#5d4037] hover:bg-[#8b5a2b] hover:text-[#f4e4bc] transition-all duration-200"
                        >
                          🤔 Maybe
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRSVP('Tidak Hadir')}
                          className="px-3 py-2 rounded-xl border-2 border-[#8b5a2b] font-['VT323'] text-xl text-[#5d4037] hover:bg-[#8b5a2b] hover:text-[#f4e4bc] transition-all duration-200"
                        >
                          ❌ Tidak Hadir
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      <PixelButton
                        onClick={() => navigate('/home')}
                        variant="secondary"
                        className="text-xs py-2 hover:-translate-y-0.5 transition-transform"
                      >
                        ← KEMBALI
                      </PixelButton>

                      <PixelButton
                        onClick={handleOpenMaps}
                        className="text-xs py-2 hover:-translate-y-0.5 transition-transform"
                      >
                        📍 BUKA MAPS
                      </PixelButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 md:bottom-4 md:left-5">
              <img
                src="/images/sprites/char-boy.png"
                alt="Animated boy"
                className="h-20 w-20 md:h-28 md:w-28 pixel-art animate-boy-wiggle"
              />
            </div>
          </div>

          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-5 w-3/4 rounded-full bg-black/18 blur-md" />
        </div>
      </div>

      <style>{`
        @keyframes soft-float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.2;
          }
          33% {
            transform: translateY(-14px) translateX(8px);
            opacity: 0.45;
          }
          66% {
            transform: translateY(8px) translateX(-8px);
            opacity: 0.2;
          }
        }

        @keyframes envelope-bob {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes boy-wiggle {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          20% {
            transform: translateY(-4px) translateX(2px);
          }
          40% {
            transform: translateY(0) translateX(4px);
          }
          60% {
            transform: translateY(-3px) translateX(2px);
          }
          80% {
            transform: translateY(0) translateX(0);
          }
        }

        @keyframes modal-in {
          0% {
            opacity: 0;
            transform: scale(0.94) translateY(8px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-soft-float {
          animation: soft-float 6s ease-in-out infinite;
        }

        .animate-envelope-bob {
          animation: envelope-bob 2.6s ease-in-out infinite;
        }

        .animate-boy-wiggle {
          animation: boy-wiggle 2.7s ease-in-out infinite;
          transform-origin: bottom center;
        }

        .animate-modal-in {
          animation: modal-in 0.28s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.22s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default InvitationLetter;