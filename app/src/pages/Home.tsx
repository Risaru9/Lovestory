import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, User, ArrowLeft, ArrowRight } from 'lucide-react';

// ─── Character Asset Helpers ─────────────────────────────────────────────────
const WALK_FRAMES = 8;
const WALK_MS = 120;
const getWalkFrame = (role: 'boy' | 'girl', frame: number) => {
  const p = String(frame).padStart(2, '0');
  return `/images/asset_baru_karakter/${role}/walk/walk_${p}.png`;
};

// ─── Music Constants ────────────────────────────────────────────────────────
const STORAGE_KEYS = { musicEnabled: 'home-music-enabled', trackIndex: 'home-track-index' };
const HOME_PLAYLIST = [
  { title: 'Pixel', src: '/audio/home/Pixelated_Reverie.mp3' },
  { title: 'Pixel', src: '/audio/home/Midnight_Frost.mp3' },
  { title: 'Pixel', src: '/audio/home/Pixelated_Petal_Promenade.mp3' },
];
const BGM_VOLUME = 1;

const getInitialMusic = () => {
  if (typeof window === 'undefined') return true;
  const s = window.localStorage.getItem(STORAGE_KEYS.musicEnabled);
  return s === null ? true : s === 'true';
};

// ─── World Data ─────────────────────────────────────────────────────────────
const HOTSPOTS = [
  { id: 'garden', name: 'Love Garden', icon: '🌷', xPos: 12, route: '/dateplanner' },
  { id: 'journey', name: 'Tree of Journey', icon: '📖', xPos: 35, route: '/timeline' },
  { id: 'playroom', name: 'Arcade Playroom', icon: '🕹️', xPos: 65, route: '/game' },
  { id: 'checkin', name: 'Klinik Check-Up', icon: '🏥', xPos: 78, route: '/checkin' },
  { id: 'vault', name: 'Secret Vault', icon: '🔐', xPos: 92, route: '/dreamvault' },
];

export default function Home() {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // States
  const [musicEnabled, setMusicEnabled] = useState<boolean>(getInitialMusic);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(50); // 0 to 100%
  const [isMoving, setIsMoving] = useState<'left' | 'right' | null>(null);
  const [frame, setFrame] = useState(1);
  const [activeHotspot, setActiveHotspot] = useState<typeof HOTSPOTS[0] | null>(null);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Animation Frame Loop
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const walkTimerRef = useRef<number>(0);

  // ─── Audio Logic ────────────────────────────────────────────────────────
  const playAudio = useCallback(async () => {
    const a = audioRef.current; if (!a) return false;
    a.loop = true;
    a.muted = !musicEnabled;
    a.volume = musicEnabled ? BGM_VOLUME : 0;
    try { await a.play(); setIsPlaying(true); return true; }
    catch { setIsPlaying(false); return false; }
  }, [musicEnabled]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.musicEnabled, String(musicEnabled));
    const a = audioRef.current; if (!a) return;
    a.muted = !musicEnabled;
    a.volume = musicEnabled ? BGM_VOLUME : 0;
    if (musicEnabled && !isPlaying) void playAudio();
  }, [musicEnabled, isPlaying, playAudio]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.src = HOME_PLAYLIST[0].src;
    a.load();
    const handleInteraction = () => { playAudio(); };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [playAudio]);

  // ─── Movement Logic ──────────────────────────────────────────────────────
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      
      // Update walk frame if moving
      if (isMoving) {
        walkTimerRef.current += deltaTime;
        if (walkTimerRef.current > WALK_MS) {
          setFrame(prev => (prev >= WALK_FRAMES ? 1 : prev + 1));
          walkTimerRef.current = 0;
        }

        // Update progress (speed: 15% per second)
        setProgress(prev => {
          let newProgress = prev;
          if (isMoving === 'left') newProgress = Math.max(0, prev - (15 * deltaTime) / 1000);
          if (isMoving === 'right') newProgress = Math.min(100, prev + (15 * deltaTime) / 1000);
          return newProgress;
        });
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [isMoving]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Handle key presses for keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { setIsMoving('left'); setDirection('left'); }
      if (e.key === 'ArrowRight') { setIsMoving('right'); setDirection('right'); }
      if (e.key === 'Enter' || e.key === ' ') {
        if (activeHotspot) navigate(activeHotspot.route);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && isMoving === 'left') setIsMoving(null);
      if (e.key === 'ArrowRight' && isMoving === 'right') setIsMoving(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMoving, activeHotspot, navigate]);

  // Reset to frame 1 when stopped
  useEffect(() => {
    if (!isMoving) setFrame(1);
  }, [isMoving]);

  // Detect Proximity
  useEffect(() => {
    const PROXIMITY_THRESHOLD = 5; // +/- 5% to trigger
    const nearby = HOTSPOTS.find(h => Math.abs(h.xPos - progress) < PROXIMITY_THRESHOLD);
    setActiveHotspot(nearby || null);
  }, [progress]);

  // UI Event Handlers
  const handleStartMove = (dir: 'left' | 'right') => {
    setIsMoving(dir);
    setDirection(dir);
  };
  const handleStopMove = () => {
    setIsMoving(null);
  };

  const boySrc = getWalkFrame('boy', frame);
  const girlSrc = getWalkFrame('girl', frame);

  // Determine scaleX based on direction
  // Assuming default sprites face RIGHT
  const scale = direction === 'left' ? -1 : 1;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#f4a1a3] select-none touch-none">
      <audio ref={audioRef} />

      {/* ─── WORLD LAYER (Moves based on progress) ─── */}
      {/* 
        To make the character appear to move, we shift the world background in the opposite direction.
        The world width is much larger than the screen. Let's say world width is 300vw.
        progress goes from 0 to 100.
        translateX goes from 0 to -200vw (so the right edge meets the screen right edge).
        Actually, an easier way is to use background-position-x.
      */}
      <div 
        className="absolute inset-0 h-full"
        style={{
          width: '300vw',
          transform: `translateX(-${progress * 2}vw)`, // progress 0 to 100 maps to 0 to -200vw
          backgroundImage: 'url(/rpg-bg.png)',
          backgroundSize: 'auto 100%',
          backgroundPosition: 'left bottom',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      >
        {/* Hotspots / Buildings */}
        {HOTSPOTS.map((hotspot) => (
          <div
            key={hotspot.id}
            className="absolute bottom-[20vh] flex flex-col items-center"
            style={{ 
              left: `${hotspot.xPos}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-5xl sm:text-7xl drop-shadow-xl animate-bounce">
              {hotspot.icon}
            </div>
            {/* Soft shadow under hotspot */}
            <div className="w-16 h-4 mt-2 bg-black/20 rounded-[50%] blur-sm" />
          </div>
        ))}
      </div>

      {/* ─── UI / HUD LAYER (Fixed) ─── */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-auto">
        <button
          onClick={() => setMusicEnabled(!musicEnabled)}
          className="flex items-center gap-2 rounded-full border-4 border-black bg-[#121224] px-4 py-2 text-white shadow-[3px_3px_0_#000]"
        >
          {musicEnabled ? <Volume2 className="h-4 w-4 text-[#ff69b4]" /> : <VolumeX className="h-4 w-4 text-[#a0a0b0]" />}
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-full border-4 border-black bg-[#121224] px-4 py-2 text-white shadow-[3px_3px_0_#000]"
        >
          <User className="h-4 w-4 text-[#ff69b4]" />
        </button>
      </div>

      {/* Title */}
      <div className="absolute top-6 w-full text-center pointer-events-none z-10">
        <h1 className="font-['Press_Start_2P'] text-lg sm:text-2xl text-white drop-shadow-[3px_3px_0_#ff69b4]">
          LOVESTORY TOWN
        </h1>
        <p className="font-['VT323'] text-white/90 text-sm mt-1">Explore to find our memories</p>
      </div>

      {/* ─── CHARACTER LAYER (Fixed in center) ─── */}
      <div className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 flex items-end gap-1 z-20 pointer-events-none">
        {/* Active Hotspot Bubble */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 transition-all duration-300 ${activeHotspot ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="bg-white border-4 border-black rounded-xl p-3 shadow-[4px_4px_0_#000] whitespace-nowrap flex flex-col items-center">
            <span className="font-['Press_Start_2P'] text-[10px] text-black mb-2">
              {activeHotspot?.name}
            </span>
            <button
              onClick={() => activeHotspot && navigate(activeHotspot.route)}
              className="bg-[#ff69b4] text-white border-2 border-black rounded px-4 py-1.5 font-['Press_Start_2P'] text-[8px] hover:bg-pink-400 active:scale-95 transition-all"
            >
              MASUK
            </button>
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-black" />
          </div>
        </div>

        {/* Boy Avatar */}
        <div className="relative">
          <img 
            src={boySrc} 
            alt="Boy" 
            className="w-16 sm:w-20"
            style={{ 
              imageRendering: 'pixelated',
              transform: `scaleX(${scale})`
            }} 
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-black/30 rounded-[50%] blur-sm -z-10" />
        </div>
        {/* Girl Avatar */}
        <div className="relative">
          <img 
            src={girlSrc} 
            alt="Girl" 
            className="w-16 sm:w-20"
            style={{ 
              imageRendering: 'pixelated',
              transform: `scaleX(${scale})` // Assuming default girl asset also faces right? Actually old code had `transform: scaleX(-1)` for girl by default.
            }} 
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-black/30 rounded-[50%] blur-sm -z-10" />
        </div>
      </div>

      {/* ─── ON-SCREEN CONTROLS ─── */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between z-30 pointer-events-none">
        <button
          onPointerDown={() => handleStartMove('left')}
          onPointerUp={handleStopMove}
          onPointerLeave={handleStopMove}
          onContextMenu={e => e.preventDefault()}
          className="pointer-events-auto bg-black/40 border-4 border-white/80 rounded-full w-16 h-16 flex items-center justify-center text-white active:bg-black/60 active:scale-90 transition-all backdrop-blur-sm"
        >
          <ArrowLeft size={32} />
        </button>
        <button
          onPointerDown={() => handleStartMove('right')}
          onPointerUp={handleStopMove}
          onPointerLeave={handleStopMove}
          onContextMenu={e => e.preventDefault()}
          className="pointer-events-auto bg-black/40 border-4 border-white/80 rounded-full w-16 h-16 flex items-center justify-center text-white active:bg-black/60 active:scale-90 transition-all backdrop-blur-sm"
        >
          <ArrowRight size={32} />
        </button>
      </div>

    </div>
  );
}
