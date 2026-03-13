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
  { title: 'Rainy', src: '/audio/home/Rainy_Day_Vinyl_Dreams.mp3' },
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
      { label: 'INVITATION LETTER', path: '/invitationletter', icon: '💗', enabled: true },
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
      className="relative h-screen w-full overflow-hidden bg-[#1A1A2E]"
      style={{
        backgroundImage: 'url(/images/backgrounds/home-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <audio ref={audioRef} preload="auto" />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(12,10,24,0.34),rgba(12,10,24,0.56))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,192,203,0.08),transparent_45%)]" />

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
            <span className="text-xl">💕</span>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 py-5">
        <div className="mb-4 text-center">
          <p className="mb-2 font-['VT323'] text-base md:text-lg text-[#FFD700]">
            Press Start to Continue Our Journey
          </p>

          <h1 className="font-['Press_Start_2P'] text-2xl md:text-3xl leading-relaxed text-white drop-shadow-[3px_3px_0_#FF69B4]">
            OUR LOVE STORY
          </h1>
        </div>

        <div className="mb-4 flex items-center justify-center">
          <button
            type="button"
            onClick={handleToggleMusic}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-white/85 backdrop-blur-sm transition hover:bg-black/40"
            aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
          >
            {musicEnabled ? (
              <Volume2 className="h-4 w-4 text-[#FFD700]" />
            ) : (
              <VolumeX className="h-4 w-4 text-white/70" />
            )}

            <span className="font-['VT323'] text-lg">
              {musicEnabled ? 'Music On' : 'Music Off'}
            </span>
          </button>
        </div>

        <div className="w-full max-w-[390px] rounded-[22px] border border-[#FF69B4]/45 bg-[rgba(255,250,255,0.88)] p-4 shadow-[0_0_24px_rgba(255,105,180,0.16)] backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-['Press_Start_2P'] text-[10px] text-[#1A1A2E]">
              MAIN MENU
            </span>

            <span className="font-['VT323'] text-lg text-[#1A1A2E]/60">
              {selectedIndex + 1} / {menuItems.length}
            </span>
          </div>

          <div className="space-y-2">
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
                    'w-full rounded-xl border px-4 py-3 text-left transition-all duration-200',
                    'flex items-center gap-3',
                    'font-["Press_Start_2P"] text-[11px]',
                    isEnabled
                      ? isSelected
                        ? 'border-[#FF69B4] bg-[#1A1A2E] text-[#FF69B4] shadow-[0_0_12px_rgba(255,105,180,0.14)]'
                        : 'border-[#1A1A2E]/10 bg-white text-[#1A1A2E] hover:border-[#FF69B4]/30 hover:bg-[#fff8fc]'
                      : 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400',
                  ].join(' ')}
                  aria-label={item.label}
                >
                  <span className="w-5 text-center text-sm">{item.icon}</span>

                  <span className={isSelected ? 'animate-pulse' : ''}>
                    {item.label}
                  </span>

                  {isSelected && isEnabled && (
                    <span className="ml-auto text-[#FF69B4]">◀</span>
                  )}

                  {!isEnabled && (
                    <span className="ml-auto font-['VT323'] text-base text-gray-400">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="font-['VT323'] text-base text-white/65">
            Use ↑ ↓ to navigate, ENTER to select
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 md:bottom-5 md:left-6">
          <img
            src="/images/sprites/char-boy.png"
            alt="Character boy"
            className="h-24 w-24 md:h-32 md:w-32 pixel-art animate-character-left"
          />
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 md:bottom-5 md:right-6">
          <img
            src="/images/sprites/char-girl.png"
            alt="Character girl"
            className="h-24 w-24 md:h-32 md:w-32 pixel-art animate-character-right"
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