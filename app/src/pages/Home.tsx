import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

interface HeartParticle {
  id: string;
  x: number;
  y: number;
}

interface MenuItem {
  label: string;
  path: string;
  icon: string;
  enabled?: boolean;
}

interface PlaylistItem {
  title: string;
  src: string;
}

const STORAGE_KEYS = {
  musicEnabled: 'home-music-enabled',
  trackIndex: 'home-track-index',
};

const HOME_PLAYLIST: PlaylistItem[] = [
  { title: 'Pixel', src: '/audio/home/Pixelated_Reverie.mp3' },
  { title: 'Pixel', src: '/audio/home/Midnight_Frost.mp3' },
  { title: 'Pixel', src: '/audio/home/Pixelated_Petal_Promenade.mp3' },
  { title: 'Rainy', src: '/audio/home/Rainy_Day_Vinyl_Dreams.mp3' },
  { title: 'Rainy', src: '/audio/home/Golden_Hour_Drift.mp3' },
];

const createParticleId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const getInitialMusicEnabled = () => {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(STORAGE_KEYS.musicEnabled);
  if (saved === null) return true;
  return saved === 'true';
};

const getInitialTrackIndex = () => {
  if (typeof window === 'undefined') return 0;
  const saved = window.localStorage.getItem(STORAGE_KEYS.trackIndex);
  const parsed = Number(saved);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= HOME_PLAYLIST.length) {
    return 0;
  }

  return parsed;
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayAttemptedRef = useRef(false);

  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(getInitialMusicEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(getInitialTrackIndex);

  const currentTrack = HOME_PLAYLIST[currentTrackIndex];

  const menuItems: MenuItem[] = useMemo(
    () => [
      { label: 'NEW GAME', path: '/couple', icon: '✨', enabled: true },
      { label: 'CONTINUE', path: '/timeline', icon: '▶', enabled: true },
      { label: 'GALLERY', path: '/gallery', icon: '📷', enabled: true },
      { label: 'ACHIEVEMENTS', path: '/achievements', icon: '⭐', enabled: true },
      { label: 'MUSIC', path: '/music', icon: '🎵', enabled: true },
      { label: 'MINI GAME', path: '/game', icon: '🎮', enabled: true },
      { label: 'LETTER', path: '/letter', icon: '💌', enabled: true },
      { label: 'DATE PLANNER', path: '/dateplanner', icon: '📅', enabled: true },
      { label: 'LOCATION TRACKER', path: '/map', icon: '📍', enabled: true },
    ],
    []
  );

  const spawnHeart = useCallback((x: number, y: number) => {
    const newHeart: HeartParticle = {
      id: createParticleId(),
      x,
      y,
    };

    setHearts((prev) => [...prev, newHeart]);

    window.setTimeout(() => {
      setHearts((prev) => prev.filter((heart) => heart.id !== newHeart.id));
    }, 1300);
  }, []);

  const playAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    try {
      audio.volume = 0.35;
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }, []);

  const pauseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }, []);

  const handleToggleMusic = useCallback(() => {
    if (musicEnabled) {
      setMusicEnabled(false);
      pauseAudio();
      return;
    }

    setMusicEnabled(true);
  }, [musicEnabled, pauseAudio]);

  const handleMenuHover = (
    event: React.MouseEvent<HTMLButtonElement>,
    index: number
  ) => {
    setSelectedIndex(index);

    const rect = event.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left - 8, rect.top + rect.height / 2);
  };

  const handleMenuClick = (
    item: MenuItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!item.enabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);

    window.setTimeout(() => {
      navigate(item.path);
    }, 100);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.musicEnabled, String(musicEnabled));
  }, [musicEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.trackIndex, String(currentTrackIndex));
  }, [currentTrackIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setCurrentTrackIndex((prev) =>
        prev === HOME_PLAYLIST.length - 1 ? 0 : prev + 1
      );
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = currentTrack.src;
    audio.load();

    if (musicEnabled) {
      void playAudio();
    }
  }, [currentTrack.src, musicEnabled, playAudio]);

  useEffect(() => {
    if (autoplayAttemptedRef.current) return;
    autoplayAttemptedRef.current = true;

    if (!musicEnabled) return;
    void playAudio();
  }, [musicEnabled, playAudio]);

  useEffect(() => {
    if (!musicEnabled) return;
    if (isPlaying) return;

    const handleFirstInteraction = async () => {
      await playAudio();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [musicEnabled, isPlaying, playAudio]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();

        const selectedItem = menuItems[selectedIndex];
        if (selectedItem?.enabled) {
          navigate(selectedItem.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuItems, navigate, selectedIndex]);

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

  return (
    <div
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#0a0813]"
      style={{
        backgroundImage: 'url(/images/backgrounds/home-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <audio ref={audioRef} preload="auto" />

      {/* Retro background filters */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Floating hearts */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute animate-float-heart"
            style={{
              left: heart.x,
              top: heart.y,
            }}
          >
            <span className="text-lg">💕</span>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-between px-4 py-6 md:py-8">
        
        {/* Top bar: Title & Music Control */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="mb-1.5 font-['VT323'] text-base md:text-lg text-[#FFD700] tracking-widest uppercase">
              Press Start to Continue Our Journey
            </p>
            <h1 className="font-['Press_Start_2P'] text-xl sm:text-2xl md:text-3xl leading-none text-white drop-shadow-[2.5px_2.5px_0_#1a1a2e] tracking-wider">
              OUR LOVE STORY
            </h1>
          </div>

          <button
            type="button"
            onClick={handleToggleMusic}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#1a1a2e] bg-black/50 px-3.5 py-1.5 text-white/80 transition hover:bg-black/75 active:scale-95 text-xs shadow-[2px_2px_0_#000000]"
            aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
          >
            {musicEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-[#FFD700]" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-white/40" />
            )}
            <span className="font-['VT323'] text-base tracking-wide">
              {musicEnabled ? 'BGM ON' : 'BGM OFF'}
            </span>
          </button>
        </div>

        {/* Center: Main Menu Retro Console Board */}
        <div className="w-full max-w-[340px] sm:max-w-[360px] bg-[#12121c] border-4 border-[#1a1a2e] rounded-2xl p-4 shadow-[6px_6px_0_#000000] relative">
          <div className="mb-3.5 flex items-center justify-between border-b-2 border-[#1a1a2e] pb-2 select-none">
            <span className="font-['Press_Start_2P'] text-[9px] text-[#FF69B4] tracking-widest">
              MAIN MENU
            </span>
            <span className="font-['VT323'] text-base text-white/40">
              {selectedIndex + 1} / {menuItems.length}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[35vh] sm:max-h-none overflow-y-auto pr-0.5">
            {menuItems.map((item, index) => {
              const isSelected = selectedIndex === index;
              const isEnabled = item.enabled !== false;

              return (
                <button
                  key={item.label}
                  type="button"
                  onMouseEnter={(event) => handleMenuHover(event, index)}
                  onFocus={() => setSelectedIndex(index)}
                  onClick={(event) => handleMenuClick(item, event)}
                  disabled={!isEnabled}
                  className={[
                    'w-full px-3.5 py-2.5 text-left transition-all duration-100 flex items-center gap-3 font-["Press_Start_2P"] text-[9px] border-2 rounded-xl',
                    isEnabled
                      ? isSelected
                        ? 'border-[#1a1a2e] bg-[#FF69B4] text-white shadow-[2px_2px_0_#000000] translate-x-0.5 translate-y-0.5'
                        : 'border-transparent bg-[#1a1a2e]/40 text-white/60 hover:bg-[#1a1a2e]/80 hover:text-white'
                      : 'cursor-not-allowed border-transparent bg-white/[0.01] text-white/15',
                  ].join(' ')}
                  aria-label={item.label}
                >
                  <span className="w-5 text-center text-xs shrink-0">{item.icon}</span>

                  <span>
                    {item.label}
                  </span>

                  {isSelected && isEnabled && (
                    <span className="ml-auto text-white">◀</span>
                  )}

                  {!isEnabled && (
                    <span className="ml-auto font-['VT323'] text-xs text-white/20">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom bar: Instruction & Walking Character Sprites */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="font-['VT323'] text-sm md:text-base text-white/50 tracking-wider">
              Use ↑ ↓ key to navigate · ENTER to select
            </p>
          </div>

          {/* Mobile Character Deck (Side-by-side sprites below console card) */}
          <div className="flex gap-8 items-center justify-center lg:hidden pointer-events-none">
            <img
              src="/images/sprites/char-boy.png"
              alt="Character boy"
              className="h-16 w-16 pixel-art animate-character-left"
            />
            <span className="text-sm animate-pulse">💕</span>
            <img
              src="/images/sprites/char-girl.png"
              alt="Character girl"
              className="h-16 w-16 pixel-art animate-character-right"
            />
          </div>
        </div>

        {/* Desktop Corner Sprites */}
        <div className="pointer-events-none absolute bottom-5 left-8 hidden lg:block">
          <img
            src="/images/sprites/char-boy.png"
            alt="Character boy"
            className="h-32 w-32 pixel-art animate-character-left"
          />
        </div>

        <div className="pointer-events-none absolute bottom-5 right-8 hidden lg:block">
          <img
            src="/images/sprites/char-girl.png"
            alt="Character girl"
            className="h-32 w-32 pixel-art animate-character-right"
          />
        </div>
      </div>

      <style>{`
        @keyframes float-up-heart {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-65px) scale(0.65);
            opacity: 0;
          }
        }

        @keyframes character-left-float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-6px) translateX(2px);
          }
          50% {
            transform: translateY(0) translateX(4px);
          }
          75% {
            transform: translateY(-4px) translateX(2px);
          }
        }

        @keyframes character-right-float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-5px) translateX(-2px);
          }
          50% {
            transform: translateY(0) translateX(-4px);
          }
          75% {
            transform: translateY(-3px) translateX(-2px);
          }
        }

        @keyframes bounce-horiz {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-4px); }
        }

        .animate-bounce-horizontal {
          animation: bounce-horiz 0.8s infinite;
        }

        .animate-float-heart {
          animation: float-up-heart 1.3s ease-out forwards;
        }

        .animate-character-left {
          animation: character-left-float 2.6s ease-in-out infinite;
        }

        .animate-character-right {
          animation: character-right-float 2.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;