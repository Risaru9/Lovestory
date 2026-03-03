import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { songs } from '@/lib/chapter-data';
import { cn } from '@/lib/utils';

// Types
type Song = typeof songs[0];
type RepeatMode = 'none' | 'all' | 'one';

interface IconProps {
  className?: string;
  size?: number;
}

// SVG Icon Components (Ukuran absolut terjaga)
const PlayIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const NextIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const PrevIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
  </svg>
);

const ShuffleIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>
);

const RepeatIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);

const RepeatOneIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-6V9H9v2h4z" />
  </svg>
);

const VolumeHighIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const VolumeLowIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
  </svg>
);

const VolumeMuteIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

const MusicNoteIcon = ({ className, size = 24 }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cn("shrink-0", className)} style={{ minWidth: size, minHeight: size }}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);

// Floating Music Note Component
const FloatingNote = ({ delay, left }: { delay: number; left: string }) => (
  <div 
    className="absolute text-[#FFD700] opacity-0 animate-note-float pointer-events-none"
    style={{ 
      animationDelay: `${delay}s`,
      left,
      bottom: '20%'
    }}
  >
    <MusicNoteIcon size={20} />
  </div>
);

// Animated Character Component (CSS Animation Applied)
const AnimatedCharacter = ({ 
  src, 
  alt, 
  className,
  isPlaying 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  isPlaying: boolean;
}) => {
  return (
    <div className={cn(
      "relative transition-all duration-300",
      className
    )}>
      <img 
        src={src} 
        alt={alt}
        className={cn(
          "w-full h-full object-contain drop-shadow-lg",
          // Apply different CSS animations based on isPlaying state
          isPlaying ? "animate-dance" : "animate-idle"
        )}
        style={{ 
          imageRendering: 'pixelated',
          filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.5))'
        }}
      />
      {isPlaying && (
        <>
          <div className="absolute -top-4 -right-2 text-[#FF69B4] animate-float">
            <MusicNoteIcon size={14} />
          </div>
          <div className="absolute top-1/2 -left-4 text-[#FFD700] animate-float-delayed">
            <MusicNoteIcon size={10} />
          </div>
        </>
      )}
    </div>
  );
};

// Pixel Vinyl Record Component
const PixelVinylRecord = ({ isPlaying }: { isPlaying: boolean }) => {
  return (
    <div className={cn(
      "relative w-36 h-36 md:w-44 md:h-44",
      isPlaying ? "vinyl-spin" : ""
    )}>
      <div 
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: 'conic-gradient(from 0deg, #2a2a2a, #1a1a1a, #333333, #1a1a1a, #2a2a2a)',
          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.8), 0 0 0 3px #1a1a1a, 0 0 0 5px #333333'
        }}
      >
        <div className="absolute inset-2 rounded-full border-2 md:border-4 border-[#333333] opacity-60" />
        <div className="absolute inset-4 rounded-full border-2 md:border-4 border-[#2a2a2a] opacity-50" />
        <div className="absolute inset-6 rounded-full border-2 md:border-4 border-[#333333] opacity-40" />
        <div className="absolute inset-8 rounded-full border-2 md:border-4 border-[#2a2a2a] opacity-30" />
        <div className="absolute inset-10 rounded-full border-2 md:border-4 border-[#333333] opacity-20" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #FF69B4, #E94560)',
              boxShadow: '0 0 0 3px #FFD700, inset 0 0 8px rgba(0,0,0,0.3)'
            }}
          >
            <div className="absolute inset-1.5 rounded-full border border-[#FFD700] opacity-40" />
            <div 
              className="w-4 h-4 rounded-full bg-[#1a1a2e]"
              style={{ boxShadow: 'inset 0 0 4px rgba(0,0,0,0.8)' }}
            />
            <div className="absolute top-1.5 font-pixel text-[5px] text-white opacity-80">
              8-BIT
            </div>
          </div>
        </div>
        <div className="absolute top-3 right-5 w-4 h-10 bg-white opacity-10 rounded-full transform rotate-12" />
      </div>
    </div>
  );
};

// Control Button Component
interface ControlButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ControlButton = ({ 
  onClick, 
  children, 
  className, 
  title,
  active = false,
  size = 'md'
}: ControlButtonProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8', 
    md: 'w-10 h-10',  
    lg: 'w-14 h-14'  
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center pixel-btn pixel-shadow transition-all duration-150 shrink-0",
        active 
          ? 'bg-[#FF69B4] border-2 border-[#FFD700] text-white' 
          : 'bg-[#0F3460] border-2 border-[#E94560] text-white hover:bg-[#E94560]',
        className
      )}
    >
      {children}
    </button>
  );
};

// Main Music Component
const Music: React.FC = () => {
  const navigate = useNavigate();

  // STATE
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [hoveredSong, setHoveredSong] = useState<number | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // REF
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visualizerRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const pixelParticlesRef = useRef<Array<{x: number, y: number, size: number, speed: number, color: string}>>([]);

  // Initialize shuffle
  useEffect(() => {
    if (isShuffle) {
      const indices = Array.from({ length: songs.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
    }
  }, [isShuffle]);

  // --- AUDIO LOGIC ---
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = currentSong.src;
      audioRef.current.load();
      audioRef.current.volume = isMuted ? 0 : volume;

      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Playback interrupted:", error);
          });
        }
      }
    }
  }, [currentSong]);

  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Play error:", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // --- NAVIGATION LOGIC ---
  const getNextIndex = useCallback((currentIndex: number) => {
    if (isShuffle && shuffledIndices.length > 0) {
      const shuffledPos = shuffledIndices.indexOf(currentIndex);
      const nextShuffledPos = (shuffledPos + 1) % shuffledIndices.length;
      return shuffledIndices[nextShuffledPos];
    }
    return (currentIndex + 1) % songs.length;
  }, [isShuffle, shuffledIndices]);

  const getPrevIndex = useCallback((currentIndex: number) => {
    if (isShuffle && shuffledIndices.length > 0) {
      const shuffledPos = shuffledIndices.indexOf(currentIndex);
      const prevShuffledPos = (shuffledPos - 1 + shuffledIndices.length) % shuffledIndices.length;
      return shuffledIndices[prevShuffledPos];
    }
    return (currentIndex - 1 + songs.length) % songs.length;
  }, [isShuffle, shuffledIndices]);

  const changeSong = (direction: 'next' | 'prev') => {
    if (!currentSong) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const newIndex = direction === 'next' ? getNextIndex(currentIndex) : getPrevIndex(currentIndex);
    
    setCurrentSong(songs[newIndex]);
    setIsPlaying(true);
  };

  const handleSongEnd = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);
      const isLastSong = currentIndex === songs.length - 1;
      
      if (isLastSong && repeatMode === 'none') {
        setIsPlaying(false);
      } else {
        changeSong('next');
      }
    }
  };

  const handlePlayToggle = () => {
    if (!currentSong) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSelectSong = (song: Song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const toggleRepeat = () => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(current);
      if (dur && !isNaN(dur)) {
        setDuration(dur);
        setProgress((current / dur) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && currentSong) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const percentage = x / width;
      audioRef.current.currentTime = percentage * audioRef.current.duration;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- PIXEL ART VISUALIZER ---
  useEffect(() => {
    if (!visualizerRef.current) return;
    const canvas = visualizerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (pixelParticlesRef.current.length === 0) {
      const colors = ['#FF69B4', '#FFD700', '#00CED1', '#FF6B6B', '#4ECDC4', '#E94560'];
      for (let i = 0; i < 40; i++) {
        pixelParticlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 6 + 2,
          speed: Math.random() * 1.5 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    let frameCount = 0;
    
    const animate = () => {
      frameCount++;
      
      // Clear canvas
      ctx.fillStyle = '#0F3460';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying && frameCount % 2 === 0) {
        const bars = 20;
        const barWidth = Math.floor(canvas.width / bars / 4) * 4;
        const gap = 3;

        for (let i = 0; i < bars; i++) {
          const time = Date.now() / 800;
          const height = Math.abs(Math.sin(time * 3 + i * 0.4)) * canvas.height * 0.8;
          const pixelHeight = Math.floor(height / 4) * 4;
          
          const x = i * (barWidth + gap) + gap;
          const y = canvas.height - pixelHeight;
          
          const hue = 320 + (i / bars) * 40;
          
          ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
          ctx.fillRect(x, y, barWidth - 1, pixelHeight);
          ctx.fillStyle = `hsl(${hue}, 100%, 80%)`;
          ctx.fillRect(x, y, 2, pixelHeight);
          ctx.fillStyle = `hsl(${hue}, 100%, 90%)`;
          ctx.fillRect(x, y, barWidth - 1, 2);
        }
      } else if (!isPlaying) {
        const bars = 20;
        const barWidth = Math.floor(canvas.width / bars / 4) * 4;
        const gap = 3;

        for (let i = 0; i < bars; i++) {
          const height = 4 + Math.sin(Date.now() / 1000 + i) * 2;
          const x = i * (barWidth + gap) + gap;
          const y = canvas.height - height;
          
          ctx.fillStyle = '#1A1A2E';
          ctx.fillRect(x, y, barWidth - 1, height);
        }
      }

      pixelParticlesRef.current.forEach((particle) => {
        if (isPlaying) {
          particle.y -= particle.speed;
          if (particle.y < 0) {
            particle.y = canvas.height;
            particle.x = Math.random() * canvas.width;
          }
        }
        
        const pixelX = Math.floor(particle.x / 4) * 4;
        const pixelY = Math.floor(particle.y / 4) * 4;
        
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = isPlaying ? 0.8 : 0.3;
        ctx.fillRect(pixelX, pixelY, particle.size, particle.size);
        ctx.globalAlpha = 1;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.code === 'ArrowRight') {
        changeSong('next');
      } else if (e.code === 'ArrowLeft') {
        changeSong('prev');
      } else if (e.code === 'ArrowUp') {
        setVolume(prev => Math.min(1, prev + 0.1));
      } else if (e.code === 'ArrowDown') {
        setVolume(prev => Math.max(0, prev - 0.1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, isPlaying]);

  return (
    <div className="min-h-screen bg-[#1A1A2E] relative overflow-hidden flex flex-col items-center py-4">
      {/* Inline Styles for Animation to ensure they work without separate CSS files */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(0.95) translateY(2px); }
        }
        @keyframes dance {
          0%, 100% { transform: translateY(0) scaleY(1) rotate(0deg); }
          25% { transform: translateY(-8px) scaleY(1.05) rotate(-3deg); }
          50% { transform: translateY(0) scaleY(0.95) rotate(0deg); }
          75% { transform: translateY(-8px) scaleY(1.05) rotate(3deg); }
        }
        .animate-idle {
          animation: breathe 2s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .animate-dance {
          animation: dance 0.6s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
          transform-origin: bottom center;
        }
      `}</style>

      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(/images/backgrounds/music-room-bg.png)',
          imageRendering: 'pixelated'
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div 
          className="absolute inset-0 animate-grid"
          style={{
            backgroundImage: `
              linear-gradient(to right, #FF69B4 1px, transparent 1px),
              linear-gradient(to bottom, #FF69B4 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#FFD700] animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random()}s`
            }}
          />
        ))}
      </div>

      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <FloatingNote key={i} delay={i * 0.8} left={`${15 + i * 18}%`} />
          ))}
        </div>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnd}
        onLoadedMetadata={handleLoadedMetadata}
        onError={(e) => console.log("Audio Error:", e)}
      />

      <div className="w-full max-w-4xl z-10 px-4">
        
        {/* Header */}
        <div className="bg-[#16213E]/90 backdrop-blur-sm border-b-4 border-[#FF69B4] p-3 md:p-4 pixel-shadow mb-4">
          <div className="flex justify-between items-center w-full">
            <PixelButton 
              onClick={() => navigate('/home')} 
              variant="secondary" 
              size="sm"
              className="pixel-btn text-xs"
            >
              ← MENU
            </PixelButton>

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#FF69B4] animate-pulse" />
              <h1 className="font-pixel text-xs md:text-sm text-white tracking-wider">
                8-BIT JUKEBOX
              </h1>
              <div className="w-2.5 h-2.5 bg-[#FFD700] animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <div className="hidden md:flex items-center gap-1 h-5 w-16 justify-end">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 bg-[#FF69B4] transition-all duration-150",
                    isPlaying ? "equalizer-bar" : "h-1"
                  )}
                  style={{ 
                    height: isPlaying ? undefined : '3px',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex justify-between items-end mb-4 px-2">
          {/* Karakter Cewek */}
          <AnimatedCharacter 
            src="/images/sprites/char-girl.png" 
            alt="Dancing Girl"
            className="w-16 h-16 md:w-24 md:h-24"
            isPlaying={isPlaying}
          />
          
          {isPlaying && (
            <div className="animate-float">
              <div className="flex items-center gap-2 bg-[#FF69B4]/90 px-3 py-1.5 border-2 border-[#FFD700] pixel-shadow">
                <div className="w-1.5 h-1.5 bg-white animate-pulse rounded-full" />
                <span className="font-pixel text-[10px] md:text-xs text-white">NOW PLAYING</span>
                <div className="w-1.5 h-1.5 bg-[#FFD700] animate-pulse rounded-full" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
          
          {/* Karakter Cowok */}
          <AnimatedCharacter 
            src="/images/sprites/char-boy.png" 
            alt="Dancing Boy"
            className="w-16 h-16 md:w-24 md:h-24"
            isPlaying={isPlaying}
          />
        </div>

        <div className="bg-[#16213E]/95 backdrop-blur-md border-4 border-[#0F3460] p-4 md:p-5 mb-5 pixel-shadow-lg relative">
          <div className="absolute -top-2 -left-2 w-3 h-3 bg-[#FF69B4] animate-pulse" />
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-[#FF69B4] animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-[#FFD700] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-[#FFD700] animate-pulse" style={{ animationDelay: '1.5s' }} />

          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="relative flex-shrink-0">
              <PixelVinylRecord isPlaying={isPlaying} />
              {isPlaying && (
                <div className="absolute inset-0 rounded-full animate-pulse-glow pointer-events-none" />
              )}
            </div>

            <div className="flex-1 text-center md:text-left w-full">
              <h2 className="font-pixel text-xs md:text-sm text-white mb-1.5 truncate leading-relaxed">
                {currentSong ? currentSong.title : 'SELECT A SONG'}
              </h2>
              <p className="font-retro text-xl md:text-2xl text-[#FFD700] mb-3">
                {currentSong ? currentSong.artist : '---'}
              </p>
              
              <div className="mb-4">
                <div 
                  className="h-5 bg-[#0F3460] border-2 border-[#E94560] cursor-pointer relative overflow-hidden pixel-shadow progress-bar"
                  onClick={handleProgressBarClick}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-[#FF69B4] to-[#E94560] transition-all duration-100 relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-[#FFD700] border-l-2 border-white" />
                  </div>
                </div>
                <div className="flex justify-between mt-1.5 font-retro text-sm text-[#E94560]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{currentSong ? formatTime(duration) : '0:00'}</span>
                </div>
              </div>

              <div className="flex justify-center md:justify-start gap-2 items-center flex-wrap">
                <ControlButton onClick={toggleShuffle} active={isShuffle} size="sm" title="Shuffle">
                  <ShuffleIcon size={16} className="text-white" />
                </ControlButton>

                <ControlButton onClick={() => changeSong('prev')} size="md" title="Previous">
                  <PrevIcon size={20} className="text-white" />
                </ControlButton>

                <ControlButton onClick={handlePlayToggle} active={isPlaying} size="lg" className={cn(isPlaying && "animate-pulse-glow")}>
                  {isPlaying ? (
                    <PauseIcon size={28} className="text-white" />
                  ) : (
                    <PlayIcon size={28} className="text-white ml-1" />
                  )}
                </ControlButton>

                <ControlButton onClick={() => changeSong('next')} size="md" title="Next">
                  <NextIcon size={20} className="text-white" />
                </ControlButton>

                <ControlButton onClick={toggleRepeat} active={repeatMode !== 'none'} size="sm" title={`Repeat: ${repeatMode}`} className="relative">
                  {repeatMode === 'one' ? (
                    <RepeatOneIcon size={16} className="text-white" />
                  ) : (
                    <RepeatIcon size={16} className="text-white" />
                  )}
                  {repeatMode === 'one' && (
                    <span className="absolute -top-1 -right-1 bg-[#FFD700] text-black text-[8px] w-3.5 h-3.5 flex items-center justify-center font-pixel rounded-sm">
                      1
                    </span>
                  )}
                </ControlButton>

                <div className="relative" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                  <ControlButton onClick={() => setIsMuted(!isMuted)} size="sm" title="Volume">
                    {isMuted || volume === 0 ? (
                      <VolumeMuteIcon size={16} className="text-white" />
                    ) : volume < 0.5 ? (
                      <VolumeLowIcon size={16} className="text-white" />
                    ) : (
                      <VolumeHighIcon size={16} className="text-white" />
                    )}
                  </ControlButton>
                  
                  {showVolumeSlider && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#16213E] border-2 border-[#E94560] p-2 pixel-shadow z-50">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-24 h-2.5"
                        style={{ background: `linear-gradient(to right, #FF69B4 ${volume * 100}%, #0F3460 ${volume * 100}%)` }}
                      />
                      <div className="text-center mt-1 font-retro text-[10px] text-[#FFD700]">
                        {Math.round((isMuted ? 0 : volume) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 relative">
            <div className="absolute -top-1.5 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E94560] to-transparent" />
            <canvas 
              ref={visualizerRef}
              width={500}
              height={64}
              className="w-full h-16 bg-[#0F3460] border-2 border-[#E94560] pixel-shadow"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E94560] to-transparent" />
          </div>
        </div>

        <div className="bg-[#16213E]/95 backdrop-blur-md border-4 border-[#0F3460] p-3 md:p-4 pixel-shadow">
          <div className="flex items-center justify-between mb-3 border-b-2 border-[#E94560] pb-2">
            <h3 className="font-pixel text-[10px] md:text-xs text-[#FFD700]">
              PLAYLIST ({songs.length} TRACKS)
            </h3>
            <div className="flex items-center gap-3">
              {isShuffle && (
                <span className="font-retro text-xs text-[#FF69B4] animate-pulse">
                  SHUFFLE ON
                </span>
              )}
              {repeatMode !== 'none' && (
                <span className="font-retro text-xs text-[#FFD700]">
                  REPEAT: {repeatMode.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            {songs.map((song, index) => {
              const isActive = currentSong?.id === song.id;
              const isHovered = hoveredSong === index;

              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  onMouseEnter={() => setHoveredSong(index)}
                  onMouseLeave={() => setHoveredSong(null)}
                  className={cn(
                    'flex items-center gap-3 p-2 md:p-3 cursor-pointer transition-all border-2 pixel-btn',
                    isActive
                      ? 'bg-[#E94560] border-[#FFD700]'
                      : 'bg-[#0F3460] border-[#1A1A2E] hover:border-[#E94560] hover:bg-[#16213E]'
                  )}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-[#1A1A2E] border-2 border-[#E94560] flex-shrink-0">
                    {isActive && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-3">
                        <div className="w-0.5 bg-[#FFD700] equalizer-bar" style={{ height: '60%', animationDelay: '0s' }} />
                        <div className="w-0.5 bg-[#FFD700] equalizer-bar" style={{ height: '100%', animationDelay: '0.1s' }} />
                        <div className="w-0.5 bg-[#FFD700] equalizer-bar" style={{ height: '40%', animationDelay: '0.2s' }} />
                      </div>
                    ) : (
                      <span className={cn("font-pixel text-[10px]", isActive ? 'text-[#FFD700]' : 'text-[#E94560]')}>
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('font-retro text-base md:text-lg truncate', isActive ? 'text-white' : 'text-[#E94560]')}>
                      {song.title}
                    </p>
                    <p className="font-retro text-xs text-[#8B8B8B] truncate">
                      {song.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-retro text-xs text-[#8B8B8B]">
                      {song.duration}
                    </span>
                    {isHovered && !isActive && (
                      <PlayIcon size={14} className="text-[#FFD700] animate-bounce" />
                    )}
                    {isActive && (
                      <div className="w-1.5 h-1.5 bg-[#FFD700] animate-pulse rounded-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pb-6 text-center">
          <p className="font-retro text-[#8B8B8B] text-xs">
            Use <kbd className="bg-[#0F3460] px-1.5 py-0.5 border border-[#E94560] text-[#FFD700] font-pixel text-[8px]">←</kbd>
            <kbd className="bg-[#0F3460] px-1.5 py-0.5 border border-[#E94560] text-[#FFD700] font-pixel text-[8px] mx-1">→</kbd> 
            to navigate • 
            <kbd className="bg-[#0F3460] px-1.5 py-0.5 border border-[#E94560] text-[#FFD700] font-pixel text-[8px] mx-1">SPACE</kbd> 
            to play/pause • 
            <kbd className="bg-[#0F3460] px-1.5 py-0.5 border border-[#E94560] text-[#FFD700] font-pixel text-[8px] mx-1">↑</kbd>
            <kbd className="bg-[#0F3460] px-1.5 py-0.5 border border-[#E94560] text-[#FFD700] font-pixel text-[8px]">↓</kbd> 
            for volume
          </p>
        </div>
      </div>
    </div>
  );
};

export default Music;