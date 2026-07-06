import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
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

interface Category {
  id: 'journey' | 'connection' | 'playroom' | 'vault';
  label: string;
  icon: string;
  description: string;
  color: string;
}

interface PlaylistItem {
  title: string;
  src: string;
}

type CharAction = 'walk' | 'dance';

interface CharState {
  action: CharAction;
  frame: number;
}

// ─── Animation config ────────────────────────────────────────────────────────
const WALK_FRAMES  = 8;
const DANCE_FRAMES = 12;
const FRAME_MS     = 130; // ~7.7fps — ideal for pixel art walk cycles
const IDLE_DELAY_MS = 8000; // 8s idle → trigger dance easter egg

// Helper to build animated frame path
const getCharFrame = (role: 'boy' | 'girl', action: CharAction, frame: number): string => {
  const padded = String(frame).padStart(2, '0');
  return `/images/asset_baru_karakter/${role}/${action}/${action}_${padded}.png`;
};

// ─── Static data ─────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  musicEnabled: 'home-music-enabled',
  trackIndex:   'home-track-index',
};

const HOME_PLAYLIST: PlaylistItem[] = [
  { title: 'Pixel',  src: '/audio/home/Pixelated_Reverie.mp3' },
  { title: 'Pixel',  src: '/audio/home/Midnight_Frost.mp3' },
  { title: 'Pixel',  src: '/audio/home/Pixelated_Petal_Promenade.mp3' },
  { title: 'Rainy',  src: '/audio/home/Rainy_Day_Vinyl_Dreams.mp3' },
  { title: 'Rainy',  src: '/audio/home/Golden_Hour_Drift.mp3' },
];

const createParticleId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
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
  const saved  = window.localStorage.getItem(STORAGE_KEYS.trackIndex);
  const parsed = Number(saved);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= HOME_PLAYLIST.length) return 0;
  return parsed;
};

const CATEGORIES: Category[] = [
  { id: 'journey',    label: 'JOURNEY',    icon: '📖', description: 'Petualangan & Lini Masa Kenangan Kita',   color: '#ff69b4' },
  { id: 'connection', label: 'CONNECTION', icon: '💬', description: 'Obrolan Real-Time & Mood Pasangan',       color: '#00bcd4' },
  { id: 'playroom',   label: 'PLAYROOM',   icon: '🎮', description: 'Aktivitas Seru, Doodle & Game Arcade',   color: '#4caf50' },
  { id: 'vault',      label: 'VAULT',      icon: '🔒', description: 'Peti Impian & Kenangan Kapsul Waktu',    color: '#ffb300' },
];

const SUB_MENU_ITEMS: Record<'journey' | 'connection' | 'playroom' | 'vault', MenuItem[]> = {
  journey: [
    { label: 'NEW GAME',     path: '/couple',      icon: '✨', enabled: true },
    { label: 'CONTINUE',     path: '/timeline',    icon: '▶',  enabled: true },
    { label: 'GALLERY',      path: '/gallery',     icon: '📷', enabled: true },
    { label: 'DATE PLANNER', path: '/dateplanner', icon: '📅', enabled: true },
  ],
  connection: [
    { label: 'DAILY CHECK-IN',    path: '/checkin', icon: '🗒', enabled: true },
    { label: 'COUPLE CHAT',       path: '/chat',    icon: '💬', enabled: true },
    { label: 'LOCATION TRACKER',  path: '/map',     icon: '📍', enabled: true },
    { label: 'LETTER',            path: '/letter',  icon: '💌', enabled: true },
  ],
  playroom: [
    { label: 'QUIZ QUEST',    path: '/quizquest',    icon: '❓', enabled: true },
    { label: 'DOODLE CANVAS', path: '/doodle',       icon: '🎨', enabled: true },
    { label: 'FORTUNE WHEEL', path: '/fortunewheel', icon: '🎡', enabled: true },
    { label: 'MINI GAME',     path: '/game',         icon: '🎮', enabled: true },
  ],
  vault: [
    { label: 'TIME CAPSULE',  path: '/timecapsule',  icon: '🔒', enabled: true },
    { label: 'DREAM VAULT',   path: '/dreamvault',   icon: '💭', enabled: true },
    { label: 'ACHIEVEMENTS',  path: '/achievements', icon: '⭐', enabled: true },
    { label: 'MUSIC',         path: '/music',        icon: '🎵', enabled: true },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
const Home: React.FC = () => {
  const navigate        = useNavigate();
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const autoplayAttemptedRef = useRef(false);
  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hearts,           setHearts]           = useState<HeartParticle[]>([]);
  const [activeCategory,   setActiveCategory]   = useState<'journey' | 'connection' | 'playroom' | 'vault' | null>(null);
  const [selectedIndex,    setSelectedIndex]    = useState(0);
  const [musicEnabled,     setMusicEnabled]     = useState<boolean>(getInitialMusicEnabled);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [currentTrackIndex,setCurrentTrackIndex]= useState<number>(getInitialTrackIndex);

  // ── Animated character state ──────────────────────────────────────────────
  const [boyState,  setBoyState]  = useState<CharState>({ action: 'walk', frame: 1 });
  const [girlState, setGirlState] = useState<CharState>({ action: 'walk', frame: 1 });
  const [isIdle,    setIsIdle]    = useState(false);

  const currentTrack = HOME_PLAYLIST[currentTrackIndex];

  // ── Heart particles ───────────────────────────────────────────────────────
  const spawnHeart = useCallback((x: number, y: number) => {
    const newHeart: HeartParticle = { id: createParticleId(), x, y };
    setHearts(prev => [...prev, newHeart]);
    window.setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1300);
  }, []);

  // ── Audio helpers ─────────────────────────────────────────────────────────
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
    if (musicEnabled) { setMusicEnabled(false); pauseAudio(); return; }
    setMusicEnabled(true);
  }, [musicEnabled, pauseAudio]);

  // ── Navigation handlers ───────────────────────────────────────────────────
  const handleCategoryHover = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    setSelectedIndex(index);
    const rect = event.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left - 8, rect.top + rect.height / 2);
  };

  const handleCategoryClick = (
    catId: 'journey' | 'connection' | 'playroom' | 'vault',
    _index: number,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    setActiveCategory(catId);
    setSelectedIndex(1);
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      spawnHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  };

  const handleSubMenuHover = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    setSelectedIndex(index);
    const rect = event.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left - 8, rect.top + rect.height / 2);
  };

  const handleSubMenuClick = (item: MenuItem, _index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!item.enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    spawnHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
    window.setTimeout(() => { navigate(item.path); }, 100);
  };

  const handleGoBack = (event?: React.MouseEvent<HTMLButtonElement>) => {
    const prevId = activeCategory;
    setActiveCategory(null);
    const catIndex = CATEGORIES.findIndex(c => c.id === prevId);
    setSelectedIndex(catIndex >= 0 ? catIndex : 0);
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      spawnHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  };

  // ── Persist settings ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.musicEnabled, String(musicEnabled));
  }, [musicEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.trackIndex, String(currentTrackIndex));
  }, [currentTrackIndex]);

  // ── Audio event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    const handlePlay  = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setCurrentTrackIndex(prev => prev === HOME_PLAYLIST.length - 1 ? 0 : prev + 1);
    };
    audio.addEventListener('play',  handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('play',  handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = currentTrack.src;
    audio.load();
    if (musicEnabled) void playAudio();
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
      window.removeEventListener('keydown',     handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown',     handleFirstInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown',     handleFirstInteraction);
    };
  }, [musicEnabled, isPlaying, playAudio]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeCategory === null) {
        if (event.key === 'ArrowUp')    { event.preventDefault(); setSelectedIndex(prev => prev >= 2 ? prev - 2 : prev + 2); }
        else if (event.key === 'ArrowDown')  { event.preventDefault(); setSelectedIndex(prev => prev < 2 ? prev + 2 : prev - 2); }
        else if (event.key === 'ArrowLeft')  { event.preventDefault(); setSelectedIndex(prev => prev % 2 === 1 ? prev - 1 : prev + 1); }
        else if (event.key === 'ArrowRight') { event.preventDefault(); setSelectedIndex(prev => prev % 2 === 0 ? prev + 1 : prev - 1); }
        else if (event.key === 'Enter') {
          event.preventDefault();
          const targetCat = CATEGORIES[selectedIndex];
          if (targetCat) { setActiveCategory(targetCat.id); setSelectedIndex(1); }
        }
      } else {
        const totalItems = 5;
        if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedIndex(prev => (prev + 1) % totalItems); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems); }
        else if (event.key === 'Enter') {
          event.preventDefault();
          if (selectedIndex === 0) {
            const prevId   = activeCategory;
            setActiveCategory(null);
            const catIndex = CATEGORIES.findIndex(c => c.id === prevId);
            setSelectedIndex(catIndex >= 0 ? catIndex : 0);
          } else {
            const items       = SUB_MENU_ITEMS[activeCategory];
            const selectedItem = items[selectedIndex - 1];
            if (selectedItem && selectedItem.enabled !== false) navigate(selectedItem.path);
          }
        } else if (event.key === 'Escape') {
          event.preventDefault();
          const prevId   = activeCategory;
          setActiveCategory(null);
          const catIndex = CATEGORIES.findIndex(c => c.id === prevId);
          setSelectedIndex(catIndex >= 0 ? catIndex : 0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCategory, selectedIndex, navigate]);

  // ── Prevent body scroll ───────────────────────────────────────────────────
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // ── Character frame animation loop (130ms per frame) ──────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setBoyState(prev => {
        const maxFrames = prev.action === 'dance' ? DANCE_FRAMES : WALK_FRAMES;
        return { ...prev, frame: prev.frame >= maxFrames ? 1 : prev.frame + 1 };
      });
      setGirlState(prev => {
        const maxFrames = prev.action === 'dance' ? DANCE_FRAMES : WALK_FRAMES;
        return { ...prev, frame: prev.frame >= maxFrames ? 1 : prev.frame + 1 };
      });
    }, FRAME_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Idle detection → dance easter egg ────────────────────────────────────
  useEffect(() => {
    const startDancing = () => {
      setIsIdle(true);
      setBoyState({ action: 'dance', frame: 1 });
      setGirlState({ action: 'dance', frame: 1 });
    };

    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsIdle(false);
      setBoyState(prev => prev.action === 'dance' ? { action: 'walk', frame: 1 } : prev);
      setGirlState(prev => prev.action === 'dance' ? { action: 'walk', frame: 1 } : prev);
      idleTimerRef.current = setTimeout(startDancing, IDLE_DELAY_MS);
    };

    // Start idle timer immediately
    idleTimerRef.current = setTimeout(startDancing, IDLE_DELAY_MS);

    window.addEventListener('mousemove',  resetIdle);
    window.addEventListener('keydown',    resetIdle);
    window.addEventListener('click',      resetIdle);
    window.addEventListener('touchstart', resetIdle, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove',  resetIdle);
      window.removeEventListener('keydown',    resetIdle);
      window.removeEventListener('click',      resetIdle);
      window.removeEventListener('touchstart', resetIdle);
    };
  }, []);

  // ── Precompute current sprite paths ───────────────────────────────────────
  const boySrc  = getCharFrame('boy',  boyState.action,  boyState.frame);
  const girlSrc = getCharFrame('girl', girlState.action, girlState.frame);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#080710]"
      style={{
        backgroundImage: 'url(/images/backgrounds/home-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <audio ref={audioRef} preload="auto" />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#080710]/92" />

      {/* Floating hearts */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {hearts.map(heart => (
          <div key={heart.id} className="absolute animate-float-heart" style={{ left: heart.x, top: heart.y }}>
            <span className="text-lg">💕</span>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-between px-4 py-6 md:py-8">

        {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
        <div className="w-full flex flex-col items-center gap-2 sm:gap-3">
          <div className="text-center">
            <p className="mb-1 font-['VT323'] text-sm sm:text-base md:text-lg text-[#a0a0b0] tracking-widest uppercase font-bold">
              Press Start to Continue Our Journey
            </p>
            <h1 className="font-['Press_Start_2P'] text-lg sm:text-xl md:text-3xl leading-none text-[#ffffff] drop-shadow-[2px_2px_0_#ff69b4] md:drop-shadow-[2.5px_2.5px_0_#ff69b4] tracking-wider font-bold">
              OUR LOVE STORY
            </h1>
          </div>

          <button
            type="button"
            onClick={handleToggleMusic}
            className="inline-flex items-center gap-2 rounded-full border-2 sm:border-4 border-[#000000] bg-[#121224] px-3 py-1 sm:px-3.5 sm:py-1.5 text-[#ffffff] transition hover:bg-[#ff69b4] hover:text-black active:scale-95 text-xs shadow-[2px_2px_0_#000000] sm:shadow-[4px_4px_0_#000000] font-bold"
            aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
          >
            {musicEnabled
              ? <Volume2 className="h-3.5 w-3.5 text-[#ff69b4]" />
              : <VolumeX  className="h-3.5 w-3.5 text-[#a0a0b0]/40" />}
            <span className="font-['VT323'] text-sm sm:text-base tracking-wide">
              {musicEnabled ? 'BGM ON' : 'BGM OFF'}
            </span>
          </button>
        </div>

        {/* ── CENTER CONSOLE ────────────────────────────────────────────────── */}
        <div className="w-full max-w-[310px] sm:max-w-[360px] bg-[#121224] border-2 sm:border-4 border-[#000000] rounded-xl p-3 sm:p-4 shadow-[4px_4px_0_#000000] sm:shadow-[6px_6px_0_#000000] relative">
          <div className="mb-2.5 sm:mb-3.5 flex items-center justify-between border-b-2 border-[#000000] pb-2 select-none">
            <span className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] tracking-widest font-bold uppercase">
              {activeCategory === null ? 'MAIN MENU' : activeCategory}
            </span>
            <span className="font-['VT323'] text-base text-[#a0a0b0]/65 font-bold">
              {activeCategory === null ? `${selectedIndex + 1} / 4` : `${selectedIndex} / 4`}
            </span>
          </div>

          <div className="space-y-1.5">
            {activeCategory === null ? (
              /* 2×2 Category Grid */
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {CATEGORIES.map((cat, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onMouseEnter={e => handleCategoryHover(e, index)}
                      onFocus={() => setSelectedIndex(index)}
                      onClick={e => handleCategoryClick(cat.id, index, e)}
                      className={[
                        'flex flex-col items-center justify-center p-3 rounded-xl border-2 sm:border-4 transition-all duration-100 cursor-pointer min-h-[90px] sm:min-h-[100px] font-bold',
                        isSelected
                          ? 'border-black bg-[#ff69b4] text-[#000000] shadow-[2px_2px_0_#000000] translate-x-0.5 translate-y-0.5'
                          : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:bg-[#2a2a3e] hover:text-[#ffffff]',
                      ].join(' ')}
                      aria-label={cat.label}
                    >
                      <span className="text-xl sm:text-2xl mb-1.5 shrink-0 select-none">{cat.icon}</span>
                      <span className="font-['Press_Start_2P'] text-[8px] sm:text-[9px] tracking-wider leading-none">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Sub-menu list */
              <div className="space-y-1.5">
                <button
                  type="button"
                  onMouseEnter={e => handleSubMenuHover(e, 0)}
                  onFocus={() => setSelectedIndex(0)}
                  onClick={() => handleGoBack()}
                  className={[
                    'w-full px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-left transition-all duration-100 flex items-center gap-3 font-["Press_Start_2P"] text-[8px] sm:text-[9px] border-2 sm:border-4 rounded-xl font-bold min-h-[38px] sm:min-h-[44px] cursor-pointer',
                    selectedIndex === 0
                      ? 'border-black bg-[#a0a0b0] text-[#000000] shadow-[2px_2px_0_#000000]'
                      : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:bg-[#2a2a3e] hover:text-[#ffffff]',
                  ].join(' ')}
                  aria-label="Kembali"
                >
                  <span className="w-4 sm:w-5 text-center text-xs shrink-0 select-none">◀</span>
                  <span>KEMBALI</span>
                </button>

                <div className="border-t border-white/5 my-1.5" />

                {SUB_MENU_ITEMS[activeCategory].map((item, index) => {
                  const idxInMenu = index + 1;
                  const isSelected = selectedIndex === idxInMenu;
                  const isEnabled  = item.enabled !== false;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onMouseEnter={e => handleSubMenuHover(e, idxInMenu)}
                      onFocus={() => setSelectedIndex(idxInMenu)}
                      onClick={e => handleSubMenuClick(item, idxInMenu, e)}
                      disabled={!isEnabled}
                      className={[
                        'w-full px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-left transition-all duration-100 flex items-center gap-3 font-["Press_Start_2P"] text-[8px] sm:text-[9px] border-2 sm:border-4 rounded-xl font-bold min-h-[38px] sm:min-h-[44px] cursor-pointer',
                        isEnabled
                          ? isSelected
                            ? 'border-black bg-[#ff69b4] text-[#000000] shadow-[2px_2px_0_#000000] translate-x-0.5 translate-y-0.5'
                            : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:bg-[#2a2a3e] hover:text-[#ffffff]'
                          : 'cursor-not-allowed border-transparent bg-black/[0.15] text-[#a0a0b0]/30',
                      ].join(' ')}
                      aria-label={item.label}
                    >
                      <span className="w-4 sm:w-5 text-center text-xs shrink-0 select-none">{item.icon}</span>
                      <span>{item.label}</span>
                      {isSelected && isEnabled && <span className="ml-auto text-black font-bold select-none">◀</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description bar */}
          <div className="mt-3.5 border-t-2 border-black/35 pt-2 select-none min-h-[38px] flex items-center justify-center">
            <p className="font-['VT323'] text-sm sm:text-base text-[#a0a0b0] text-center tracking-wider leading-tight">
              {activeCategory === null
                ? CATEGORIES[selectedIndex]?.description
                : selectedIndex === 0
                  ? 'Kembali ke menu kategori utama'
                  : `Buka fitur ${SUB_MENU_ITEMS[activeCategory][selectedIndex - 1]?.label}`}
            </p>
          </div>
        </div>

        {/* ── BOTTOM BAR ────────────────────────────────────────────────────── */}
        <div className="w-full flex flex-col items-center gap-2 sm:gap-3">
          <div className="text-center">
            <p className="font-['VT323'] text-xs sm:text-sm md:text-base text-[#a0a0b0]/70 tracking-wider font-bold">
              Use ↑ ↓ key to navigate · ENTER to select
            </p>
            {/* Idle hint */}
            {isIdle && (
              <p className="font-['VT323'] text-xs text-[#ff69b4]/60 animate-pulse mt-0.5 select-none">
                ★ DANCE PARTY! ★
              </p>
            )}
          </div>

          {/* Mobile: animated sprite pair */}
          <div className="flex gap-4 sm:gap-8 items-end justify-center xl:hidden pointer-events-none">
            <img
              src={boySrc}
              alt="Character boy"
              className="h-14 w-14 sm:h-20 sm:w-20 object-contain pixel-art"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="text-sm sm:text-base mb-3 animate-pulse select-none">💕</span>
            <img
              src={girlSrc}
              alt="Character girl"
              className="h-14 w-14 sm:h-20 sm:w-20 object-contain pixel-art"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      </div>

      {/* ── DESKTOP CORNER SPRITES ────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-5 left-8 hidden xl:block">
        <img
          src={boySrc}
          alt="Character boy"
          className="h-28 w-28 xl:h-36 xl:w-36 object-contain pixel-art"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-5 right-8 hidden xl:block">
        <img
          src={girlSrc}
          alt="Character girl"
          className="h-28 w-28 xl:h-36 xl:w-36 object-contain pixel-art"
          style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)' }}
        />
      </div>

      <style>{`
        .pixel-art { image-rendering: pixelated; image-rendering: crisp-edges; }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #121224; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ff69b4; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ff8da1; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #ff69b4 #121224; }

        @keyframes float-up-heart {
          0%   { transform: translateY(0) scale(1);    opacity: 1; }
          100% { transform: translateY(-65px) scale(0.65); opacity: 0; }
        }
        .animate-float-heart { animation: float-up-heart 1.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Home;