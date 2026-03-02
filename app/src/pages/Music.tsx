import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { songs } from '@/lib/chapter-data';
import { cn } from '@/lib/utils';

// Types
type RepeatMode = 'none' | 'all' | 'one';

const Music: React.FC = () => {
  const navigate = useNavigate();

  // STATE
  const [currentSong, setCurrentSong] = useState<typeof songs[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [hoveredSong, setHoveredSong] = useState<number | string | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // REF
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visualizerRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const pixelParticlesRef = useRef<Array<{x: number, y: number, size: number, speed: number, color: string}>>([]);

  // Initialize shuffle
  useEffect(() => {
    if (isShuffle) {
      const indices = Array.from({ length: songs.length }, (_, i) => i);
      // Fisher-Yates shuffle
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

  // Volume control
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

  // --- CONTROLS ---
  const handlePlayToggle = () => {
    if (!currentSong) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSelectSong = (song: typeof songs[0]) => {
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
      const duration = audioRef.current.duration;
      if (duration && !isNaN(duration)) {
        setProgress((current / duration) * 100);
      }
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

    // Initialize pixel particles
    if (pixelParticlesRef.current.length === 0) {
      const colors = ['#FF69B4', '#FFD700', '#00CED1', '#FF6B6B', '#4ECDC4'];
      for (let i = 0; i < 50; i++) {
        pixelParticlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 2,
          speed: Math.random() * 2 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    let frameCount = 0;
    
    const animate = () => {
      if (!isPlaying) {
        // Static pixel art display when paused
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw static pixel pattern
        pixelParticlesRef.current.forEach(particle => {
          ctx.fillStyle = particle.color + '40'; // 25% opacity
          ctx.fillRect(
            Math.floor(particle.x / 8) * 8,
            Math.floor(particle.y / 8) * 8,
            particle.size,
            particle.size
          );
        });
        
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      frameCount++;
      // Only update every 3rd frame for retro feel (20fps effect)
      if (frameCount % 3 === 0) {
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw pixel bars with retro styling
        const bars = 16;
        const barWidth = Math.floor(canvas.width / bars / 4) * 4; // Pixel-aligned
        const gap = 4;

        for (let i = 0; i < bars; i++) {
          // Generate height based on pseudo-random but smooth animation
          const time = Date.now() / 1000;
          const height = Math.abs(Math.sin(time * 2 + i * 0.5)) * canvas.height * 0.7;
          const pixelHeight = Math.floor(height / 4) * 4; // Pixel-aligned height
          
          const x = i * (barWidth + gap) + gap;
          const y = canvas.height - pixelHeight;
          
          // Pixel art color palette
          const hue = 300 + (i / bars) * 60; // Pink to purple range
          ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
          
          // Draw pixelated bar
          ctx.fillRect(x, y, barWidth - 2, pixelHeight);
          
          // Add highlight for 3D pixel effect
          ctx.fillStyle = `hsl(${hue}, 100%, 80%)`;
          ctx.fillRect(x, y, 2, pixelHeight);
        }

        // Floating pixel particles
        pixelParticlesRef.current.forEach(particle => {
          particle.y -= particle.speed;
          if (particle.y < 0) {
            particle.y = canvas.height;
            particle.x = Math.random() * canvas.width;
          }
          
          // Snap to pixel grid
          const pixelX = Math.floor(particle.x / 4) * 4;
          const pixelY = Math.floor(particle.y / 4) * 4;
          
          ctx.fillStyle = particle.color;
          ctx.fillRect(pixelX, pixelY, particle.size, particle.size);
        });
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1A1A2E] relative overflow-hidden">
      {/* Animated Pixel Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #FF69B4 1px, transparent 1px),
            linear-gradient(to bottom, #FF69B4 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          animation: 'pixelGrid 20s linear infinite'
        }} />
      </div>

      <style>{`
        @keyframes pixelGrid {
          0% { transform: translate(0, 0); }
          100% { transform: translate(32px, 32px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 105, 180, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255, 105, 180, 0); }
        }
        .pixel-shadow {
          box-shadow: 
            4px 4px 0px 0px rgba(0,0,0,0.3),
            inset -2px -2px 0px 0px rgba(0,0,0,0.2),
            inset 2px 2px 0px 0px rgba(255,255,255,0.2);
        }
        .pixel-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 
            2px 2px 0px 0px rgba(0,0,0,0.3),
            inset -2px -2px 0px 0px rgba(0,0,0,0.2),
            inset 2px 2px 0px 0px rgba(255,255,255,0.2);
        }
      `}</style>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnd}
        onError={(e) => console.log("Audio Error:", e)}
      />

      {/* Header */}
      <div className="relative z-10 bg-[#16213E] border-b-4 border-[#FF69B4] p-4 pixel-shadow">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <PixelButton 
            onClick={() => navigate('/home')} 
            variant="secondary" 
            size="sm"
            className="pixel-btn"
          >
            ← MENU
          </PixelButton>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FF69B4] animate-pulse" />
            <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
              8-BIT JUKEBOX
            </h1>
            <div className="w-3 h-3 bg-[#FFD700] animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Main Player Box */}
        <div className="bg-[#16213E] border-4 border-[#0F3460] p-6 mb-8 pixel-shadow relative">
          {/* Corner Decorations */}
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-[#FF69B4]" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#FF69B4]" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#FF69B4]" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#FF69B4]" />

          <div className="flex flex-col md:flex-row items-center gap-6">
            
            {/* Pixel Art Vinyl */}
            <div className="relative group">
              <div 
                className={cn(
                  'w-36 h-36 md:w-48 md:h-48 relative transition-all duration-300',
                  isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                )}
                style={{
                  imageRendering: 'pixelated',
                }}
              >
                {/* Vinyl Record */}
                <div className="absolute inset-0 bg-[#1a1a2e] border-4 border-[#333] relative overflow-hidden">
                  {/* Grooves */}
                  <div className="absolute inset-2 border-2 border-[#333] rounded-full" />
                  <div className="absolute inset-4 border-2 border-[#333] rounded-full" />
                  <div className="absolute inset-6 border-2 border-[#333] rounded-full" />
                  <div className="absolute inset-8 border-2 border-[#333] rounded-full" />
                  
                  {/* Label */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-[#FF69B4] border-4 border-[#FFD700] flex items-center justify-center">
                      <div className="w-4 h-4 bg-[#1a1a2e] rounded-full" />
                    </div>
                  </div>

                  {/* Shine effect */}
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white opacity-20 rotate-45" />
                </div>
              </div>
              
              {/* Floating music notes when playing */}
              {isPlaying && (
                <div className="absolute -top-4 -right-4 text-[#FFD700] animate-[float_2s_ease-in-out_infinite]">
                  ♪
                </div>
              )}
            </div>

            {/* Song Info & Controls */}
            <div className="flex-1 text-center md:text-left w-full">
              {/* Now Playing Badge */}
              {isPlaying && (
                <div className="inline-flex items-center gap-2 bg-[#FF69B4] px-3 py-1 mb-3 border-2 border-[#FFD700]">
                  <div className="w-2 h-2 bg-white animate-pulse" />
                  <span className="font-['Press_Start_2P'] text-xs text-white">NOW PLAYING</span>
                </div>
              )}

              <h2 className="font-['Press_Start_2P'] text-base md:text-lg text-white mb-2 truncate leading-relaxed">
                {currentSong ? currentSong.title : 'SELECT A SONG'}
              </h2>
              <p className="font-['VT323'] text-2xl text-[#FFD700] mb-4">
                {currentSong ? currentSong.artist : '---'}
              </p>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div 
                  className="h-6 bg-[#0F3460] border-2 border-[#E94560] cursor-pointer relative overflow-hidden pixel-shadow"
                  onClick={handleProgressBarClick}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-[#FF69B4] to-[#E94560] transition-all duration-100 relative"
                    style={{ width: `${progress}%` }}
                  >
                    {/* Pixelated progress indicator */}
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white" />
                  </div>
                </div>
                <div className="flex justify-between mt-2 font-['VT323'] text-sm text-[#E94560]">
                  <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}</span>
                  <span>{currentSong?.duration || '0:00'}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center md:justify-start gap-3 items-center flex-wrap">
                {/* Shuffle */}
                <button 
                  onClick={toggleShuffle}
                  className={cn(
                    "w-10 h-10 border-2 flex items-center justify-center pixel-btn transition-all",
                    isShuffle 
                      ? 'bg-[#FF69B4] border-[#FFD700] text-white' 
                      : 'bg-[#0F3460] border-[#E94560] text-[#E94560] hover:text-white'
                  )}
                  title="Shuffle"
                >
                  <span className="text-lg">🔀</span>
                </button>

                {/* Previous */}
                <button 
                  onClick={() => changeSong('prev')}
                  className="w-12 h-12 bg-[#0F3460] border-2 border-[#E94560] text-white flex items-center justify-center pixel-btn hover:bg-[#E94560] transition-colors"
                >
                  <span className="text-xl">⏮</span>
                </button>

                {/* Play/Pause */}
                <button 
                  onClick={handlePlayToggle}
                  className={cn(
                    "w-16 h-16 border-4 flex items-center justify-center pixel-btn transition-all",
                    isPlaying 
                      ? 'bg-[#E94560] border-[#FF69B4] animate-[pulse-glow_2s_infinite]' 
                      : 'bg-[#FF69B4] border-[#FFD700]'
                  )}
                >
                  <span className="text-3xl text-white">{isPlaying ? '⏸' : '▶'}</span>
                </button>

                {/* Next */}
                <button 
                  onClick={() => changeSong('next')}
                  className="w-12 h-12 bg-[#0F3460] border-2 border-[#E94560] text-white flex items-center justify-center pixel-btn hover:bg-[#E94560] transition-colors"
                >
                  <span className="text-xl">⏭</span>
                </button>

                {/* Repeat */}
                <button 
                  onClick={toggleRepeat}
                  className={cn(
                    "w-10 h-10 border-2 flex items-center justify-center pixel-btn transition-all relative",
                    repeatMode !== 'none'
                      ? 'bg-[#FF69B4] border-[#FFD700] text-white' 
                      : 'bg-[#0F3460] border-[#E94560] text-[#E94560] hover:text-white'
                  )}
                  title={`Repeat: ${repeatMode}`}
                >
                  <span className="text-lg">🔁</span>
                  {repeatMode === 'one' && (
                    <span className="absolute -top-1 -right-1 bg-[#FFD700] text-black text-xs w-4 h-4 flex items-center justify-center font-bold">1</span>
                  )}
                </button>

                {/* Volume Control */}
                <div className="relative">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    className="w-10 h-10 bg-[#0F3460] border-2 border-[#E94560] text-white flex items-center justify-center pixel-btn hover:bg-[#E94560] transition-colors"
                  >
                    <span className="text-lg">{isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
                  </button>
                  
                  {/* Volume Slider */}
                  {showVolumeSlider && (
                    <div 
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#16213E] border-2 border-[#E94560] p-2 pixel-shadow"
                      onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-24 h-2 bg-[#0F3460] appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `linear-gradient(to right, #FF69B4 ${volume * 100}%, #0F3460 ${volume * 100}%)`
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pixel Art Visualizer */}
          <div className="mt-6 relative">
            <div className="absolute -top-2 left-0 right-0 h-1 bg-[#E94560]" />
            <canvas 
              ref={visualizerRef}
              width={400}
              height={80}
              className="w-full h-20 bg-[#0F3460] border-2 border-[#E94560] image-pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-[#E94560]" />
          </div>
        </div>

        {/* Playlist */}
        <div className="bg-[#16213E] border-4 border-[#0F3460] p-4 pixel-shadow">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#E94560] pb-2">
            <h3 className="font-['Press_Start_2P'] text-sm text-[#FFD700]">
              PLAYLIST ({songs.length} TRACKS)
            </h3>
            {isShuffle && (
              <span className="font-['VT323'] text-sm text-[#FF69B4] animate-pulse">
                SHUFFLE ON
              </span>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {songs.map((song, index) => {
              const isActive = currentSong?.id === song.id;
              const isHovered = hoveredSong === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  onMouseEnter={() => setHoveredSong(song.id)}
                  onMouseLeave={() => setHoveredSong(null)}
                  className={cn(
                    'flex items-center gap-4 p-3 cursor-pointer transition-all border-2 pixel-btn',
                    isActive
                      ? 'bg-[#E94560] border-[#FFD700] shadow-lg'
                      : 'bg-[#0F3460] border-[#1A1A2E] hover:border-[#E94560] hover:bg-[#16213E]'
                  )}
                >
                  {/* Track Number / Playing Indicator */}
                  <div className="w-10 h-10 flex items-center justify-center bg-[#1A1A2E] border-2 border-[#E94560]">
                    {isActive && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-4">
                        <div className="w-1 bg-[#FFD700] animate-[bounce_0.5s_infinite]" style={{ height: '60%' }} />
                        <div className="w-1 bg-[#FFD700] animate-[bounce_0.5s_infinite_0.1s]" style={{ height: '100%' }} />
                        <div className="w-1 bg-[#FFD700] animate-[bounce_0.5s_infinite_0.2s]" style={{ height: '40%' }} />
                      </div>
                    ) : (
                      <span className={cn(
                        "font-['Press_Start_2P'] text-xs",
                        isActive ? 'text-[#FFD700]' : 'text-[#E94560]'
                      )}>
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-["VT323"] text-xl truncate',
                      isActive ? 'text-white' : 'text-[#E94560]'
                    )}>
                      {song.title}
                    </p>
                    <p className="font-['VT323'] text-sm text-[#8B8B8B] truncate">
                      {song.artist}
                    </p>
                  </div>

                  {/* Duration & Hover Actions */}
                  <div className="flex items-center gap-2">
                    <span className="font-['VT323'] text-sm text-[#8B8B8B]">
                      {song.duration}
                    </span>
                    
                    {isHovered && !isActive && (
                      <span className="text-[#FFD700] animate-bounce">▶</span>
                    )}
                    
                    {isActive && (
                      <div className="w-2 h-2 bg-[#FFD700] animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="font-['VT323'] text-[#8B8B8B] text-sm">
            Use arrow keys ← → to navigate • Space to play/pause
          </p>
        </div>
      </div>
    </div>
  );
};

export default Music;