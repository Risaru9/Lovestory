import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HeartParticle { id: string; x: number; y: number; }
interface MenuItem { label: string; path: string; icon: string; enabled?: boolean; }
interface Category {
  id: 'journey' | 'connection' | 'playroom' | 'vault';
  label: string; icon: string; description: string; color: string;
}
interface PlaylistItem { title: string; src: string; }

// Character actions and reaction states
type CharAction = 'walk' | 'dance';
type CharReact  = 'idle' | 'hover' | 'click';

interface CharState {
  action:  CharAction;
  frame:   number;
  react:   CharReact;
  entered: boolean; // entrance animation status
}

// ─── Animation Constants ──────────────────────────────────────────────────────
const WALK_FRAMES   = 8;
const DANCE_FRAMES  = 12;
const WALK_MS       = 120;   // Snappier walking
const DANCE_MS      = 90;    // Faster dance frame swapping
const IDLE_DELAY_MS = 7000;  // 7s idle → dance loop

// ─── Asset Helpers ────────────────────────────────────────────────────────────
const getWalkFrame = (role: 'boy' | 'girl', action: CharAction, frame: number) => {
  const p = String(frame).padStart(2, '0');
  return `/images/asset_baru_karakter/${role}/${action}/${action}_${p}.png`;
};
const getExpr = (role: 'boy' | 'girl', name: string) =>
  `/images/asset_baru_karakter/${role}/expressions/${name}.png`;

// Reaction expressions per character state
const BOY_REACT_EXPR: Record<CharReact, string> = {
  idle:  'smile',
  hover: 'happy',
  click: 'laugh',
};
const GIRL_REACT_EXPR: Record<CharReact, string> = {
  idle:  'shy',
  hover: 'smile',
  click: 'laugh',
};

// ─── Static Data ──────────────────────────────────────────────────────────────
const STORAGE_KEYS = { musicEnabled: 'home-music-enabled', trackIndex: 'home-track-index' };
const HOME_PLAYLIST: PlaylistItem[] = [
  { title: 'Pixel', src: '/audio/home/Pixelated_Reverie.mp3' },
  { title: 'Pixel', src: '/audio/home/Midnight_Frost.mp3' },
  { title: 'Pixel', src: '/audio/home/Pixelated_Petal_Promenade.mp3' },
  { title: 'Rainy', src: '/audio/home/Rainy_Day_Vinyl_Dreams.mp3' },
  { title: 'Rainy', src: '/audio/home/Golden_Hour_Drift.mp3' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const getInitialMusic = () => {
  if (typeof window === 'undefined') return true;
  const s = window.localStorage.getItem(STORAGE_KEYS.musicEnabled);
  return s === null ? true : s === 'true';
};

const getInitialTrack = () => {
  if (typeof window === 'undefined') return 0;
  const s = window.localStorage.getItem(STORAGE_KEYS.trackIndex);
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n < HOME_PLAYLIST.length ? n : 0;
};

const CATEGORIES: Category[] = [
  { id: 'journey',    label: 'JOURNEY',    icon: '📖', description: 'Petualangan & Lini Masa Kenangan Kita', color: '#ff69b4' },
  { id: 'connection', label: 'CONNECTION', icon: '💬', description: 'Obrolan Real-Time & Mood Pasangan',     color: '#00bcd4' },
  { id: 'playroom',   label: 'PLAYROOM',   icon: '🎮', description: 'Aktivitas Seru, Doodle & Game Arcade', color: '#4caf50' },
  { id: 'vault',      label: 'VAULT',      icon: '🔒', description: 'Peti Impian & Kenangan Kapsul Waktu',  color: '#ffb300' },
];

const SUB_MENU_ITEMS: Record<'journey'|'connection'|'playroom'|'vault', MenuItem[]> = {
  journey:    [
    { label: 'NEW GAME',     path: '/couple',      icon: '✨', enabled: true },
    { label: 'CONTINUE',     path: '/timeline',    icon: '▶',  enabled: true },
    { label: 'GALLERY',      path: '/gallery',     icon: '📷', enabled: true },
    { label: 'DATE PLANNER', path: '/dateplanner', icon: '📅', enabled: true },
  ],
  connection: [
    { label: 'DAILY CHECK-IN',   path: '/checkin', icon: '🗒', enabled: true },
    { label: 'COUPLE CHAT',      path: '/chat',    icon: '💬', enabled: true },
    { label: 'LOCATION TRACKER', path: '/map',     icon: '📍', enabled: true },
    { label: 'LETTER',           path: '/letter',  icon: '💌', enabled: true },
  ],
  playroom:   [
    { label: 'QUIZ QUEST',    path: '/quizquest',    icon: '❓', enabled: true },
    { label: 'DOODLE CANVAS', path: '/doodle',       icon: '🎨', enabled: true },
    { label: 'FORTUNE WHEEL', path: '/fortunewheel', icon: '🎡', enabled: true },
    { label: 'MINI GAME',     path: '/game',         icon: '🎮', enabled: true },
  ],
  vault:      [
    { label: 'TIME CAPSULE', path: '/timecapsule',  icon: '🔒', enabled: true },
    { label: 'DREAM VAULT',  path: '/dreamvault',   icon: '💭', enabled: true },
    { label: 'ACHIEVEMENTS', path: '/achievements', icon: '⭐', enabled: true },
    { label: 'MUSIC',        path: '/music',        icon: '🎵', enabled: true },
  ],
};

const PixelShadow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${className}`}
    style={{
      width: '60%', height: '8px',
      background: 'radial-gradient(ellipse at center, rgba(255,105,180,0.3) 0%, transparent 70%)',
      filter: 'blur(3px)',
    }}
  />
);

// ═══════════════════════════════════════════════════════════════════════════════
const Home: React.FC = () => {
  const navigate             = useNavigate();
  const audioRef             = useRef<HTMLAudioElement | null>(null);
  const autoplayAttempted    = useRef(false);
  const idleTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameIntervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hearts,            setHearts]            = useState<HeartParticle[]>([]);
  const [activeCategory,    setActiveCategory]    = useState<'journey'|'connection'|'playroom'|'vault'|null>(null);
  const [selectedIndex,     setSelectedIndex]     = useState(0);
  const [musicEnabled,      setMusicEnabled]      = useState<boolean>(getInitialMusic);
  const [isPlaying,         setIsPlaying]         = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(getInitialTrack);

  const [isIdle, setIsIdle] = useState(false);

  const [boyState,  setBoyState]  = useState<CharState>({ action: 'walk', frame: 1, react: 'idle', entered: false });
  const [girlState, setGirlState] = useState<CharState>({ action: 'walk', frame: 1, react: 'idle', entered: false });

  const [boyHovered,  setBoyHovered]  = useState(false);
  const [girlHovered, setGirlHovered] = useState(false);

  const currentTrack = HOME_PLAYLIST[currentTrackIndex];

  // ── Preload walk, dance, and expression assets for mobile instant caching ────
  useEffect(() => {
    const roles: ('boy' | 'girl')[] = ['boy', 'girl'];
    const actions: CharAction[] = ['walk', 'dance'];
    roles.forEach(role => {
      actions.forEach(action => {
        const maxFrames = action === 'dance' ? DANCE_FRAMES : WALK_FRAMES;
        for (let i = 1; i <= maxFrames; i++) {
          const img = new Image();
          img.src = getWalkFrame(role, action, i);
        }
      });
      ['smile', 'happy', 'laugh', 'shy'].forEach(expr => {
        const img = new Image();
        img.src = getExpr(role, expr);
      });
    });
  }, []);

  // ── Heart particles ───────────────────────────────────────────────────────
  const spawnHeart = useCallback((x: number, y: number) => {
    const id = createId();
    setHearts(p => [...p, { id, x, y }]);
    window.setTimeout(() => setHearts(p => p.filter(h => h.id !== id)), 1300);
  }, []);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const playAudio = useCallback(async () => {
    const a = audioRef.current; if (!a) return false;
    try { a.volume = 0.35; await a.play(); setIsPlaying(true); return true; }
    catch { setIsPlaying(false); return false; }
  }, []);
  const pauseAudio = useCallback(() => {
    const a = audioRef.current; if (!a) return;
    a.pause(); setIsPlaying(false);
  }, []);
  const handleToggleMusic = useCallback(() => {
    if (musicEnabled) { setMusicEnabled(false); pauseAudio(); }
    else setMusicEnabled(true);
  }, [musicEnabled, pauseAudio]);

  // ── Nav handlers ──────────────────────────────────────────────────────────
  const handleCategoryHover = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    setSelectedIndex(index);
    const r = e.currentTarget.getBoundingClientRect();
    spawnHeart(r.left - 8, r.top + r.height / 2);
  };
  const handleCategoryClick = (
    catId: 'journey'|'connection'|'playroom'|'vault',
    _i: number,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    setActiveCategory(catId); setSelectedIndex(1);
    if (e) { const r = e.currentTarget.getBoundingClientRect(); spawnHeart(r.left + r.width/2, r.top + r.height/2); }
  };
  const handleSubMenuHover = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    setSelectedIndex(index);
    const r = e.currentTarget.getBoundingClientRect();
    spawnHeart(r.left - 8, r.top + r.height / 2);
  };
  const handleSubMenuClick = (item: MenuItem, _i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!item.enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    spawnHeart(r.left + r.width/2, r.top + r.height/2);
    window.setTimeout(() => navigate(item.path), 100);
  };
  const handleGoBack = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const prevId = activeCategory;
    setActiveCategory(null);
    const ci = CATEGORIES.findIndex(c => c.id === prevId);
    setSelectedIndex(ci >= 0 ? ci : 0);
    if (e) { const r = e.currentTarget.getBoundingClientRect(); spawnHeart(r.left + r.width/2, r.top + r.height/2); }
  };

  // ── Persist settings ──────────────────────────────────────────────────────
  useEffect(() => { window.localStorage.setItem(STORAGE_KEYS.musicEnabled, String(musicEnabled)); }, [musicEnabled]);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEYS.trackIndex, String(currentTrackIndex)); }, [currentTrackIndex]);

  // ── Audio events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.volume = 0.35;
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setCurrentTrackIndex(p => p === HOME_PLAYLIST.length - 1 ? 0 : p + 1);
    a.addEventListener('play', onPlay); a.addEventListener('pause', onPause); a.addEventListener('ended', onEnded);
    return () => { a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('ended', onEnded); };
  }, []);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.src = currentTrack.src; a.load();
    if (musicEnabled) void playAudio();
  }, [currentTrack.src, musicEnabled, playAudio]);
  useEffect(() => {
    if (autoplayAttempted.current) return;
    autoplayAttempted.current = true;
    if (musicEnabled) void playAudio();
  }, [musicEnabled, playAudio]);
  useEffect(() => {
    if (!musicEnabled || isPlaying) return;
    const fn = async () => { await playAudio(); window.removeEventListener('pointerdown', fn); window.removeEventListener('keydown', fn); };
    window.addEventListener('pointerdown', fn); window.addEventListener('keydown', fn);
    return () => { window.removeEventListener('pointerdown', fn); window.removeEventListener('keydown', fn); };
  }, [musicEnabled, isPlaying, playAudio]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (activeCategory === null) {
        if (e.key === 'ArrowUp')    { e.preventDefault(); setSelectedIndex(p => p >= 2 ? p-2 : p+2); }
        else if (e.key === 'ArrowDown')  { e.preventDefault(); setSelectedIndex(p => p < 2 ? p+2 : p-2); }
        else if (e.key === 'ArrowLeft')  { e.preventDefault(); setSelectedIndex(p => p%2===1 ? p-1 : p+1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedIndex(p => p%2===0 ? p+1 : p-1); }
        else if (e.key === 'Enter') { e.preventDefault(); const c = CATEGORIES[selectedIndex]; if (c) { setActiveCategory(c.id); setSelectedIndex(1); } }
      } else {
        const tot = 5;
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => (p+1)%tot); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => (p-1+tot)%tot); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedIndex === 0) { const prev = activeCategory; setActiveCategory(null); const ci = CATEGORIES.findIndex(c => c.id === prev); setSelectedIndex(ci >= 0 ? ci : 0); }
          else { const it = SUB_MENU_ITEMS[activeCategory][selectedIndex-1]; if (it?.enabled !== false) navigate(it.path); }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          const prev = activeCategory; setActiveCategory(null);
          const ci = CATEGORIES.findIndex(c => c.id === prev); setSelectedIndex(ci >= 0 ? ci : 0);
        }
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [activeCategory, selectedIndex, navigate]);

  // ── Strict window/body level scroll block ──────────────────────────────────
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const prevPosition = document.body.style.position;

    // Completely lock viewport scrolling and overscroll bouncing at document level
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    // Touch event blocker for background swipe gestures
    const preventScroll = (e: TouchEvent) => {
      // Allow touch events but prevent defaults that trigger browser viewport panning/scrolling
      const target = e.target as HTMLElement;
      if (!target.closest('.custom-scrollbar')) {
        e.preventDefault();
      }
    };

    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      document.body.style.position = prevPosition;
      window.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // ── Entrance animation on mount ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setBoyState(p  => ({ ...p,  entered: true }));
      setGirlState(p => ({ ...p, entered: true }));
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // ── Frame animation loop — adaptive interval per action ───────────────────
  useEffect(() => {
    const tick = () => {
      setBoyState(prev => {
        const maxF = prev.action === 'dance' ? DANCE_FRAMES : WALK_FRAMES;
        return { ...prev, frame: prev.frame >= maxF ? 1 : prev.frame + 1 };
      });
      setGirlState(prev => {
        const maxF = prev.action === 'dance' ? DANCE_FRAMES : WALK_FRAMES;
        return { ...prev, frame: prev.frame >= maxF ? 1 : prev.frame + 1 };
      });
    };
    const ms = isIdle ? DANCE_MS : WALK_MS;
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    frameIntervalRef.current = setInterval(tick, ms);
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
  }, [isIdle]);

  // ── Idle detection + dance easter egg ────────────────────────────────────
  useEffect(() => {
    const goIdle = () => {
      setIsIdle(true);
      setBoyState(p  => ({ ...p,  action: 'dance', frame: 1, react: 'idle' }));
      setGirlState(p => ({ ...p, action: 'dance', frame: 1, react: 'idle' }));
    };
    const reset = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsIdle(false);
      setBoyState(p  => p.action === 'dance' ? { ...p,  action: 'walk', frame: 1 } : p);
      setGirlState(p => p.action === 'dance' ? { ...p, action: 'walk', frame: 1 } : p);
      idleTimerRef.current = setTimeout(goIdle, IDLE_DELAY_MS);
    };
    idleTimerRef.current = setTimeout(goIdle, IDLE_DELAY_MS);
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown',   reset);
    window.addEventListener('click',     reset);
    window.addEventListener('touchstart', reset, { passive: true });
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown',   reset);
      window.removeEventListener('click',     reset);
      window.removeEventListener('touchstart', reset);
    };
  }, []);

  // ── Character reaction triggers ───────────────────────────────────────────
  const triggerReact = useCallback((who: 'boy' | 'girl', react: CharReact) => {
    if (react === 'click') {
      const cx = who === 'boy' ? window.innerWidth * 0.15 : window.innerWidth * 0.85;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnHeart(cx + (Math.random()-0.5)*40, window.innerHeight * 0.75), i * 120);
      }
    }
    if (who === 'boy')  setBoyState(p  => ({ ...p,  react }));
    else                setGirlState(p => ({ ...p, react }));

    if (reactTimerRef.current) clearTimeout(reactTimerRef.current);
    reactTimerRef.current = setTimeout(() => {
      if (who === 'boy')  setBoyState(p  => ({ ...p,  react: 'idle' }));
      else                setGirlState(p => ({ ...p, react: 'idle' }));
    }, 2000);
  }, [spawnHeart]);

  // ── Derive current sprite src ─────────────────────────────────────────────
  const boySrc  = getWalkFrame('boy',  boyState.action,  boyState.frame);
  const girlSrc = getWalkFrame('girl', girlState.action, girlState.frame);

  const boyShowBubble  = boyState.action === 'walk'  && boyState.react  !== 'idle';
  const girlShowBubble = girlState.action === 'walk' && girlState.react !== 'idle';

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#1e1c2e] select-none fixed inset-0"
      style={{
        backgroundImage: 'url(/images/backgrounds/home-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        touchAction: 'none', // Prevents touch-based scroll shifts
        overscrollBehavior: 'none' // Prevents elastic bounce scrolling
      }}
    >
      <audio ref={audioRef} preload="auto" />

      {/* Very soft translucent overlay */}
      <div className="absolute inset-0 bg-[#ffe4e1]/10 backdrop-blur-[0.2px] pointer-events-none" />

      {/* Floating hearts */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        {hearts.map(h => (
          <div key={h.id} className="absolute animate-float-heart" style={{ left: h.x, top: h.y }}>
            <span className="text-base select-none">💕</span>
          </div>
        ))}
      </div>

      {/* ── DESKTOP LEFT CHARACTER (Boy) ────────────────────────────────────── */}
      <div className="hidden xl:flex pointer-events-auto absolute left-0 bottom-0 flex-col items-center z-30"
           style={{ width: '220px' }}>
        <div className={`mb-1 transition-all duration-300 ${boyShowBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="relative bg-[#121224] border-2 border-white/20 rounded-xl px-2 py-1 shadow-lg">
            <img
              src={getExpr('boy', BOY_REACT_EXPR[boyState.react])}
              alt="reaction"
              className="h-10 w-10 object-contain pixel-art mx-auto"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/20" />
          </div>
        </div>

        <div
          className={`relative cursor-pointer select-none transition-all duration-700 ${boyState.entered ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}
          onMouseEnter={() => { setBoyHovered(true); triggerReact('boy', 'hover'); }}
          onMouseLeave={() => setBoyHovered(false)}
          onClick={() => triggerReact('boy', 'click')}
        >
          <img
            src={boySrc}
            alt="Boy character"
            className={`object-contain pixel-art transition-transform duration-150 ${boyHovered ? 'scale-110 drop-shadow-[0_0_16px_rgba(255,105,180,0.6)]' : ''} ${isIdle ? 'scale-105' : ''}`}
            style={{
              width: '160px',
              height: '160px',
              imageRendering: 'pixelated',
              filter: boyHovered ? 'brightness(1.15)' : 'brightness(1)',
            }}
          />
          <PixelShadow className="w-24" />
        </div>

        <div className={`mt-1 px-2 py-0.5 bg-[#121224]/80 border border-[#ff69b4]/40 rounded font-['Press_Start_2P'] text-[6px] text-[#ff69b4] select-none transition-opacity duration-500 ${boyState.entered ? 'opacity-100' : 'opacity-0'}`}>
          {isIdle ? '♪ DANCE ♪' : boyHovered ? '( ´ ▽ ` )' : 'BOY'}
        </div>
      </div>

      {/* ── DESKTOP RIGHT CHARACTER (Girl) ──────────────────────────────────── */}
      <div className="hidden xl:flex pointer-events-auto absolute right-0 bottom-0 flex-col items-center z-30"
           style={{ width: '220px' }}>
        <div className={`mb-1 transition-all duration-300 ${girlShowBubble ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="relative bg-[#121224] border-2 border-white/20 rounded-xl px-2 py-1 shadow-lg">
            <img
              src={getExpr('girl', GIRL_REACT_EXPR[girlState.react])}
              alt="reaction"
              className="h-10 w-10 object-contain pixel-art mx-auto"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/20" />
          </div>
        </div>

        <div
          className={`relative cursor-pointer select-none transition-all duration-700 delay-150 ${girlState.entered ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}
          onMouseEnter={() => { setGirlHovered(true); triggerReact('girl', 'hover'); }}
          onMouseLeave={() => setGirlHovered(false)}
          onClick={() => triggerReact('girl', 'click')}
        >
          <img
            src={girlSrc}
            alt="Girl character"
            className={`object-contain pixel-art transition-transform duration-150 ${girlHovered ? 'scale-110 drop-shadow-[0_0_16px_rgba(255,105,180,0.6)]' : ''} ${isIdle ? 'scale-105' : ''}`}
            style={{
              width: '160px',
              height: '160px',
              imageRendering: 'pixelated',
              transform: `scaleX(-1)${girlHovered ? ' scale(1.1)' : ''}`,
              filter: girlHovered ? 'brightness(1.15)' : 'brightness(1)',
            }}
          />
          <PixelShadow className="w-24" />
        </div>

        <div className={`mt-1 px-2 py-0.5 bg-[#121224]/80 border border-[#ff69b4]/40 rounded font-['Press_Start_2P'] text-[6px] text-[#ff69b4] select-none transition-opacity duration-500 delay-150 ${girlState.entered ? 'opacity-100' : 'opacity-0'}`}>
          {isIdle ? '♪ DANCE ♪' : girlHovered ? '(*^▽^*)' : 'GIRL'}
        </div>
      </div>

      {/* ── MAIN CONTENT LAYER ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-4 py-3 xs:py-4 sm:py-6 md:py-8">

        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <div className="w-full flex flex-col items-center gap-1.5 xs:gap-2">
          <p className="font-['VT323'] text-xs xs:text-sm sm:text-base text-white tracking-widest uppercase font-bold select-none drop-shadow-[1px_1px_2px_#000]">
            Press Start to Continue Our Journey
          </p>
          <h1 className="font-['Press_Start_2P'] text-base xs:text-lg sm:text-2xl md:text-3xl leading-none text-white drop-shadow-[3px_3px_0_#ff69b4] tracking-wider font-bold select-none">
            OUR LOVE STORY
          </h1>
          <button
            type="button"
            onClick={handleToggleMusic}
            className="inline-flex items-center gap-2 rounded-full border-2 sm:border-4 border-black bg-[#121224] px-3 py-0.5 xs:py-1 sm:px-3.5 sm:py-1.5 text-white transition hover:bg-[#ff69b4] hover:text-black active:scale-95 text-[10px] sm:text-xs shadow-[2px_2px_0_#000] sm:shadow-[4px_4px_0_#000] font-bold"
            aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
          >
            {musicEnabled ? <Volume2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#ff69b4]" /> : <VolumeX className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#a0a0b0]/40" />}
            <span className="font-['VT323'] text-xs sm:text-base tracking-wide">{musicEnabled ? 'BGM ON' : 'BGM OFF'}</span>
          </button>
        </div>

        {/* ── CENTER CONSOLE ───────────────────────────────────────────────── */}
        <div className="w-full max-w-[290px] xs:max-w-[320px] sm:max-w-[360px] bg-[#121224]/90 border-2 sm:border-4 border-black rounded-xl p-2.5 xs:p-3 sm:p-4 shadow-[3px_3px_0_#000] sm:shadow-[6px_6px_0_#000] relative">
          <div className="mb-2 sm:mb-3.5 flex items-center justify-between border-b-2 border-black pb-1.5 xs:pb-2 select-none">
            <span className="font-['Press_Start_2P'] text-[8px] xs:text-[9px] text-[#ff69b4] tracking-widest font-bold uppercase">
              {activeCategory === null ? 'MAIN MENU' : activeCategory}
            </span>
            <span className="font-['VT323'] text-sm xs:text-base text-[#a0a0b0]/65 font-bold">
              {activeCategory === null ? `${selectedIndex + 1} / 4` : `${selectedIndex} / 4`}
            </span>
          </div>

          <div className="space-y-1.5">
            {activeCategory === null ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {CATEGORIES.map((cat, index) => {
                  const isSel = selectedIndex === index;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onMouseEnter={e => handleCategoryHover(e, index)}
                      onFocus={() => setSelectedIndex(index)}
                      onClick={e => handleCategoryClick(cat.id, index, e)}
                      className={[
                        'flex flex-col items-center justify-center p-2 rounded-xl border-2 sm:border-4 transition-all duration-100 cursor-pointer min-h-[75px] xs:min-h-[85px] sm:min-h-[100px] font-bold',
                        isSel
                          ? 'border-black bg-[#ff69b4] text-black shadow-[2px_2px_0_#000] translate-x-0.5 translate-y-0.5'
                          : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:bg-[#2a2a3e] hover:text-white',
                      ].join(' ')}
                      aria-label={cat.label}
                    >
                      <span className="text-lg xs:text-xl sm:text-2xl mb-1 xs:mb-1.5 shrink-0 select-none">{cat.icon}</span>
                      <span className="font-['Press_Start_2P'] text-[7px] xs:text-[8px] sm:text-[9px] tracking-wider leading-none">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onMouseEnter={e => handleSubMenuHover(e, 0)}
                  onFocus={() => setSelectedIndex(0)}
                  onClick={() => handleGoBack()}
                  className={[
                    'w-full px-2 py-1.5 xs:px-3 xs:py-2 text-left transition-all duration-100 flex items-center gap-2 xs:gap-3 font-["Press_Start_2P"] text-[7px] xs:text-[8px] sm:text-[9px] border-2 sm:border-4 rounded-xl font-bold min-h-[32px] xs:min-h-[38px] sm:min-h-[44px] cursor-pointer',
                    selectedIndex === 0
                      ? 'border-black bg-[#a0a0b0] text-black shadow-[2px_2px_0_#000]'
                      : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:bg-[#2a2a3e] hover:text-white',
                  ].join(' ')}
                  aria-label="Kembali"
                >
                  <span className="w-3 xs:w-4 text-center text-[10px] shrink-0 select-none">◀</span>
                  <span>KEMBALI</span>
                </button>
                <div className="border-t border-white/5 my-1" />
                {SUB_MENU_ITEMS[activeCategory].map((item, index) => {
                  const idx = index + 1;
                  const isSel = selectedIndex === idx;
                  const isEn  = item.enabled !== false;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onMouseEnter={e => handleSubMenuHover(e, idx)}
                      onFocus={() => setSelectedIndex(idx)}
                      onClick={e => handleSubMenuClick(item, idx, e)}
                      disabled={!isEn}
                      className={[
                        'w-full px-2 py-1.5 xs:px-3 xs:py-2 text-left transition-all duration-100 flex items-center gap-2 xs:gap-3 font-["Press_Start_2P"] text-[7px] xs:text-[8px] sm:text-[9px] border-2 sm:border-4 rounded-xl font-bold min-h-[32px] xs:min-h-[38px] sm:min-h-[44px] cursor-pointer',
                        isEn
                          ? isSel
                            ? 'border-black bg-[#ff69b4] text-black shadow-[2px_2px_0_#000] translate-x-0.5 translate-y-0.5'
                            : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:bg-[#2a2a3e] hover:text-white'
                          : 'cursor-not-allowed border-transparent bg-black/[0.15] text-[#a0a0b0]/30',
                      ].join(' ')}
                      aria-label={item.label}
                    >
                      <span className="w-3 xs:w-4 text-center text-[10px] shrink-0 select-none">{item.icon}</span>
                      <span>{item.label}</span>
                      {isSel && isEn && <span className="ml-auto text-black font-bold select-none">◀</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description bar */}
          <div className="mt-2.5 border-t-2 border-black/35 pt-1.5 select-none min-h-[32px] xs:min-h-[38px] flex items-center justify-center">
            <p className="font-['VT323'] text-xs xs:text-sm sm:text-base text-[#a0a0b0] text-center tracking-wider leading-tight">
              {activeCategory === null
                ? CATEGORIES[selectedIndex]?.description
                : selectedIndex === 0
                  ? 'Kembali ke menu kategori utama'
                  : `Buka fitur ${SUB_MENU_ITEMS[activeCategory][selectedIndex - 1]?.label}`}
            </p>
          </div>
        </div>

        {/* ── BOTTOM BAR ──────────────────────────────────────────────────── */}
        <div className="w-full flex flex-col items-center gap-1">
          <p className="font-['VT323'] text-[10px] xs:text-xs text-white/80 tracking-wider font-bold select-none drop-shadow-[1px_1px_2px_#000]">
            Use ↑ ↓ key to navigate · ENTER to select
          </p>

          {/* Mobile: Large animated characters */}
          <div className="flex items-end justify-center gap-1 sm:gap-6 xl:hidden pointer-events-auto">

            {/* Boy */}
            <div
              className={`relative flex flex-col items-center transition-all duration-700 ${boyState.entered ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
              onClick={(e) => { e.stopPropagation(); triggerReact('boy', 'click'); }}
            >
              <div className={`mb-0.5 transition-all duration-200 ${boyShowBubble ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                <div className="bg-[#121224] border border-white/20 rounded-lg p-0.5">
                  <img src={getExpr('boy', BOY_REACT_EXPR[boyState.react])} alt="" className="h-6 w-6 object-contain pixel-art" />
                </div>
              </div>
              <img
                src={boySrc}
                alt="Boy"
                className="object-contain pixel-art cursor-pointer"
                style={{ width: '64px', height: '64px', imageRendering: 'pixelated' }}
              />
              <PixelShadow className="w-8" />
            </div>

            {/* Center heart node */}
            <div className="mb-2 flex flex-col items-center gap-0.5">
              <span className={`text-base select-none ${isIdle ? 'animate-bounce' : 'animate-pulse'}`}>💕</span>
              {isIdle && (
                <span className="font-['Press_Start_2P'] text-[5px] text-[#ff69b4] animate-pulse select-none whitespace-nowrap">
                  ★ DANCE ★
                </span>
              )}
            </div>

            {/* Girl */}
            <div
              className={`relative flex flex-col items-center transition-all duration-700 delay-100 ${girlState.entered ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
              onClick={(e) => { e.stopPropagation(); triggerReact('girl', 'click'); }}
            >
              <div className={`mb-0.5 transition-all duration-200 ${girlShowBubble ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                <div className="bg-[#121224] border border-white/20 rounded-lg p-0.5">
                  <img src={getExpr('girl', GIRL_REACT_EXPR[girlState.react])} alt="" className="h-6 w-6 object-contain pixel-art" />
                </div>
              </div>
              <img
                src={girlSrc}
                alt="Girl"
                className="object-contain pixel-art cursor-pointer"
                style={{ width: '64px', height: '64px', imageRendering: 'pixelated', transform: 'scaleX(-1)' }}
              />
              <PixelShadow className="w-8" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pixel-art { image-rendering: pixelated; image-rendering: crisp-edges; }

        @keyframes float-up-heart {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-70px) scale(0.5); opacity: 0; }
        }
        .animate-float-heart { animation: float-up-heart 1.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Home;