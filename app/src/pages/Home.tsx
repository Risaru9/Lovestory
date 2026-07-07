import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Volume2, VolumeX, User } from 'lucide-react';

// ─── Constants & World Config ──────────────────────────────────────────────
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1200;
const MOVEMENT_SPEED = 300; // pixels per second
const WALK_FRAMES = 8;
const WALK_MS = 120;

const STORAGE_KEYS = { musicEnabled: 'home-music-enabled', trackIndex: 'home-track-index' };
const HOME_PLAYLIST = [
  { title: 'Pixel', src: '/audio/home/Pixelated_Reverie.mp3' },
  { title: 'Midnight', src: '/audio/home/Midnight_Frost.mp3' },
  { title: 'Promenade', src: '/audio/home/Pixelated_Petal_Promenade.mp3' },
];
const BGM_VOLUME = 1;

// Define 8 hotspots according to plan
const HOTSPOTS = [
  { id: 'start', name: 'Start Game', icon: '🎮', x: 500, y: 700, route: '/timeline', color: '#ffeb3b' },
  { id: 'memory', name: 'Create Memory', icon: '📖', x: 800, y: 550, route: '/dateplanner', color: '#4caf50' },
  { id: 'gallery', name: 'Gallery', icon: '🖼️', x: 1200, y: 400, route: '/gallery', color: '#e91e63' },
  { id: 'music', name: 'Music Room', icon: '🎵', x: 1500, y: 600, route: '/music', color: '#9c27b0' },
  { id: 'checkin', name: 'Check-Up', icon: '💗', x: 1700, y: 850, route: '/checkin', color: '#f44336' },
  { id: 'map', name: 'Live Map', icon: '🗺️', x: 1300, y: 1000, route: '/map', color: '#03a9f4' },
  { id: 'vault', name: 'Secret Vault', icon: '🔒', x: 900, y: 950, route: '/dreamvault', color: '#ff9800' },
  { id: 'profile', name: 'Profile', icon: '👤', x: 300, y: 900, route: '/profile', color: '#9e9e9e' },
];

export default function Home() {
  const navigate = useNavigate();
  const { profile, partner } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine avatar from profile
  const myAvatar = (profile?.avatar_url === 'boy' || profile?.avatar_url === 'girl') ? profile.avatar_url : 'boy';
  const partnerAvatar = (partner?.avatar_url === 'boy' || partner?.avatar_url === 'girl') ? partner.avatar_url : (myAvatar === 'boy' ? 'girl' : 'boy');

  // Music State
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const s = window.localStorage.getItem(STORAGE_KEYS.musicEnabled);
    return s === null ? true : s === 'true';
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // Engine States
  const worldRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const partnerRef = useRef<HTMLDivElement>(null);
  
  const [activeHotspot, setActiveHotspot] = useState<typeof HOTSPOTS[0] | null>(null);
  
  // Input State (D-Pad)
  const keys = useRef({ up: false, down: false, left: false, right: false });

  // Player State
  const pos = useRef({ x: 300, y: 700 });
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [frame, setFrame] = useState(1);

  // Partner State (Follows player loosely)
  const partnerPos = useRef({ x: 250, y: 700 });
  const [partnerFacing, setPartnerFacing] = useState<'left' | 'right'>('right');
  const [partnerFrame, setPartnerFrame] = useState(1);

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

  // ─── Input Handling ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') keys.current.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = true;
      if (e.key === 'Enter' || e.key === ' ') {
        if (activeHotspot) navigate(activeHotspot.route);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') keys.current.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeHotspot, navigate]);

  // ─── Game Loop ──────────────────────────────────────────────────────────
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const walkTimerRef = useRef<number>(0);
  const partnerWalkTimerRef = useRef<number>(0);

  const update = useCallback((time: number) => {
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    let dx = 0;
    let dy = 0;
    if (keys.current.up) dy -= 1;
    if (keys.current.down) dy += 1;
    if (keys.current.left) dx -= 1;
    if (keys.current.right) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      if (dx < 0) setFacing('left');
      if (dx > 0) setFacing('right');

      // Update position
      pos.current.x += dx * MOVEMENT_SPEED * deltaTime;
      pos.current.y += dy * MOVEMENT_SPEED * deltaTime;

      // Clamp to world bounds
      pos.current.x = Math.max(50, Math.min(pos.current.x, WORLD_WIDTH - 50));
      pos.current.y = Math.max(400, Math.min(pos.current.y, WORLD_HEIGHT - 50)); // Don't walk into sky

      // Animation
      walkTimerRef.current += deltaTime * 1000;
      if (walkTimerRef.current > WALK_MS) {
        setFrame(prev => (prev >= WALK_FRAMES ? 1 : prev + 1));
        walkTimerRef.current = 0;
      }
    } else {
      setFrame(1);
    }

    // --- Partner AI (Follow player) ---
    const pDx = pos.current.x - partnerPos.current.x;
    const pDy = pos.current.y - partnerPos.current.y;
    const pDist = Math.sqrt(pDx * pDx + pDy * pDy);
    
    if (pDist > 100) { // Distance to start following
      if (pDx < 0) setPartnerFacing('left');
      if (pDx > 0) setPartnerFacing('right');
      
      partnerPos.current.x += (pDx / pDist) * (MOVEMENT_SPEED * 0.85) * deltaTime;
      partnerPos.current.y += (pDy / pDist) * (MOVEMENT_SPEED * 0.85) * deltaTime;
      
      partnerWalkTimerRef.current += deltaTime * 1000;
      if (partnerWalkTimerRef.current > WALK_MS) {
        setPartnerFrame(prev => (prev >= WALK_FRAMES ? 1 : prev + 1));
        partnerWalkTimerRef.current = 0;
      }
    } else {
      setPartnerFrame(1);
    }

    // --- Proximity Check ---
    const PROXIMITY = 120;
    let foundHotspot = null;
    for (const hotspot of HOTSPOTS) {
      const hx = hotspot.x;
      const hy = hotspot.y;
      const dist = Math.sqrt(Math.pow(pos.current.x - hx, 2) + Math.pow(pos.current.y - hy, 2));
      if (dist < PROXIMITY) {
        foundHotspot = hotspot;
        break;
      }
    }
    // Only update state if changed (optimization)
    setActiveHotspot(prev => prev?.id === foundHotspot?.id ? prev : foundHotspot);

    // --- Camera Follow ---
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    
    let camX = pos.current.x - viewWidth / 2;
    let camY = pos.current.y - viewHeight / 2;
    
    camX = Math.max(0, Math.min(camX, WORLD_WIDTH - viewWidth));
    camY = Math.max(0, Math.min(camY, WORLD_HEIGHT - viewHeight));

    // --- DOM Updates ---
    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${-camX}px, ${-camY}px)`;
    }
    if (playerRef.current) {
      // Use standard transform, the anchor is bottom-center in CSS
      playerRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      playerRef.current.style.zIndex = Math.floor(pos.current.y).toString();
    }
    if (partnerRef.current) {
      partnerRef.current.style.transform = `translate(${partnerPos.current.x}px, ${partnerPos.current.y}px)`;
      partnerRef.current.style.zIndex = Math.floor(partnerPos.current.y).toString();
    }

    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const getWalkSrc = (role: string, currentFrame: number) => {
    const p = String(currentFrame).padStart(2, '0');
    return `/images/asset_baru_karakter/${role}/walk/walk_${p}.png`;
  };

  const getDpadProps = (dir: 'up' | 'down' | 'left' | 'right') => ({
    onPointerDown: () => { keys.current[dir] = true; },
    onPointerUp: () => { keys.current[dir] = false; },
    onPointerLeave: () => { keys.current[dir] = false; },
    onContextMenu: (e: any) => e.preventDefault(),
  });

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#87CEEB] select-none touch-none">
      <audio ref={audioRef} />

      {/* ─── WORLD LAYER ─── */}
      <div 
        ref={worldRef}
        className="absolute top-0 left-0"
        style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, willChange: 'transform' }}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/rpg-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'bottom center',
            imageRendering: 'pixelated',
          }}
        />

        {/* Hotspots */}
        {HOTSPOTS.map((hotspot) => (
          <div
            key={hotspot.id}
            className="absolute flex flex-col items-center"
            style={{ 
              left: hotspot.x, 
              top: hotspot.y, 
              transform: 'translate(-50%, -100%)', // Anchor at bottom-center
            }}
          >
            {/* Ping animation when near */}
            {activeHotspot?.id === hotspot.id && (
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping blur-md" />
            )}
            
            <div 
              className="w-16 h-16 rounded-2xl border-4 border-white flex items-center justify-center text-4xl shadow-[4px_4px_0_rgba(0,0,0,0.5)] bg-white/10 backdrop-blur-sm z-10 animate-bounce"
              style={{ borderColor: hotspot.color }}
            >
              {hotspot.icon}
            </div>
            
            <div className="mt-2 bg-black/60 text-white font-['Press_Start_2P'] text-[8px] px-2 py-1 rounded border-2 border-white/50 text-center whitespace-nowrap shadow-[2px_2px_0_#000]">
              {hotspot.name}
            </div>
            {/* Ground shadow */}
            <div className="w-16 h-4 mt-1 bg-black/30 rounded-[50%] blur-sm" />
          </div>
        ))}

        {/* --- PARTNER CHARACTER --- */}
        <div 
          ref={partnerRef} 
          className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
          style={{ margin: '-16px 0 0 -32px' }} // Center offset
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/40 rounded-[50%] blur-[2px]" />
          <img 
            src={getWalkSrc(partnerAvatar, partnerFrame)}
            alt="Partner"
            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-auto drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]"
            style={{ 
              imageRendering: 'pixelated',
              transform: `scaleX(${partnerFacing === 'left' ? -1 : 1})`,
              transformOrigin: 'bottom center'
            }}
          />
          {/* Name tag */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/50 px-2 py-0.5 rounded text-[8px] font-['VT323'] text-white whitespace-nowrap">
            {partner?.name || 'Partner'}
          </div>
        </div>

        {/* --- PLAYER CHARACTER --- */}
        <div 
          ref={playerRef} 
          className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
          style={{ margin: '-16px 0 0 -32px' }} // Center offset
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/40 rounded-[50%] blur-[2px]" />
          <img 
            src={getWalkSrc(myAvatar, frame)}
            alt="Player"
            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-auto drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]"
            style={{ 
              imageRendering: 'pixelated',
              transform: `scaleX(${facing === 'left' ? -1 : 1})`,
              transformOrigin: 'bottom center'
            }}
          />
          {/* Interaction Bubble */}
          {activeHotspot && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white border-2 border-black rounded-lg p-2 shadow-[2px_2px_0_#000] whitespace-nowrap flex flex-col items-center animate-pulse">
              <span className="font-['Press_Start_2P'] text-[6px] text-black">PRESS ACTION</span>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-black" />
            </div>
          )}
        </div>
      </div>

      {/* ─── HUD LAYER ─── */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-none">
        <button
          onClick={() => setMusicEnabled(!musicEnabled)}
          className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#121224] text-white shadow-[3px_3px_0_#000] active:scale-95"
        >
          {musicEnabled ? <Volume2 className="h-4 w-4 text-[#ff69b4]" /> : <VolumeX className="h-4 w-4 text-[#a0a0b0]" />}
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="pointer-events-auto flex items-center gap-2 rounded-full border-4 border-black bg-[#121224] px-4 py-2 text-white shadow-[3px_3px_0_#000] active:scale-95"
          >
            <User className="h-4 w-4 text-[#00bcd4]" />
            <span className="font-['Press_Start_2P'] text-[8px] hidden sm:block">{profile?.name || 'Player'}</span>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="absolute top-6 w-full text-center pointer-events-none z-10">
        <h1 className="font-['Press_Start_2P'] text-lg sm:text-2xl text-white drop-shadow-[3px_3px_0_#ff69b4]">
          LOVESTORY
        </h1>
        <p className="font-['VT323'] text-white/90 text-sm mt-1 drop-shadow-md">Explore your world</p>
      </div>

      {/* ─── VIRTUAL CONTROLS ─── */}
      <div className="absolute bottom-6 left-6 z-30 flex flex-col gap-1 opacity-70">
        <div className="flex justify-center">
          <button {...getDpadProps('up')} className="w-12 h-12 bg-black/40 border-4 border-white/60 rounded-t-xl backdrop-blur-sm active:bg-black/60 flex items-center justify-center">▲</button>
        </div>
        <div className="flex gap-1 justify-center">
          <button {...getDpadProps('left')} className="w-12 h-12 bg-black/40 border-4 border-white/60 rounded-l-xl backdrop-blur-sm active:bg-black/60 flex items-center justify-center">◀</button>
          <div className="w-12 h-12 bg-black/30 border-4 border-white/30 backdrop-blur-sm" />
          <button {...getDpadProps('right')} className="w-12 h-12 bg-black/40 border-4 border-white/60 rounded-r-xl backdrop-blur-sm active:bg-black/60 flex items-center justify-center">▶</button>
        </div>
        <div className="flex justify-center">
          <button {...getDpadProps('down')} className="w-12 h-12 bg-black/40 border-4 border-white/60 rounded-b-xl backdrop-blur-sm active:bg-black/60 flex items-center justify-center">▼</button>
        </div>
      </div>

      <div className="absolute bottom-10 right-6 z-30">
        <button
          onClick={() => {
            if (activeHotspot) {
              navigate(activeHotspot.route);
            }
          }}
          className={`w-20 h-20 rounded-full border-4 font-['Press_Start_2P'] text-[10px] flex items-center justify-center shadow-[0_5px_15px_rgba(0,0,0,0.5)] transition-all ${
            activeHotspot 
              ? 'bg-[#ff69b4] border-white text-white animate-pulse shadow-[0_0_20px_#ff69b4]' 
              : 'bg-black/40 border-white/60 text-white/60 backdrop-blur-sm active:scale-95'
          }`}
        >
          {activeHotspot ? 'ENTER' : 'ACT'}
        </button>
      </div>

    </div>
  );
}
