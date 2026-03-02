import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, Heart, ListMusic, Mic2, Maximize2,
  Share2, Download, MoreHorizontal
} from 'lucide-react';
import { PixelButton } from '@/components/custom/PixelButton';
import { cn } from '@/lib/utils';

// Extended song type dengan lyrics support
interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  src: string;
  duration: string;
  durationSeconds: number;
  color: string;
  lyrics?: { time: number; text: string }[];
}

// Mock data yang lebih lengkap
const songs: Song[] = [
  {
    id: 1,
    title: "Perfect",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    cover: "/covers/perfect.jpg",
    src: "/music/perfect.mp3",
    duration: "4:23",
    durationSeconds: 263,
    color: "#FF6B6B",
    lyrics: [
      { time: 0, text: "I found a love for me" },
      { time: 4, text: "Darling, just dive right in and follow my lead" },
      { time: 10, text: "Well, I found a girl, beautiful and sweet" },
      // ... more lyrics
    ]
  },
  // Add more songs...
];

type RepeatMode = 'none' | 'all' | 'one';
type ViewMode = 'player' | 'playlist' | 'lyrics';

const Music: React.FC = () => {
  const navigate = useNavigate();
  
  // Audio refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // State
  const [currentSong, setCurrentSong] = useState<Song>(songs[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('player');
  const [isLiked, setIsLiked] = useState<Set<number>>(new Set());
  const [playlist, setPlaylist] = useState<Song[]>(songs);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Initialize Web Audio API
  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setAudioInitialized(true);
    } catch (error) {
      console.error("Audio Context Error:", error);
    }
  }, []);

  // Real Visualizer
  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current || !isPlaying) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isPlaying) return;
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Clear with fade effect
      ctx.fillStyle = 'rgba(26, 26, 46, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barCount = 64;
      const barWidth = canvas.width / barCount;
      const radius = Math.min(canvas.width, canvas.height) * 0.3;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw circular visualizer
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (bufferLength / barCount));
        const value = dataArray[dataIndex];
        const percent = value / 255;
        const barHeight = percent * (canvas.height * 0.4);
        
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        
        // Gradient based on song color
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, currentSong.color);
        gradient.addColorStop(1, `${currentSong.color}80`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = barWidth * 0.8;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Mirror effect
        ctx.beginPath();
        ctx.moveTo(centerX - (x1 - centerX), y1);
        ctx.lineTo(centerX - (x2 - centerX), y2);
        ctx.stroke();
      }
      
      // Center glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 0.5
      );
      glowGradient.addColorStop(0, `${currentSong.color}40`);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    draw();
  }, [isPlaying, currentSong.color]);

  useEffect(() => {
    if (isPlaying && audioInitialized) {
      drawVisualizer();
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, audioInitialized, drawVisualizer]);

  // Lyrics sync
  useEffect(() => {
    if (!currentSong.lyrics || viewMode !== 'lyrics') return;
    
    const currentLyric = currentSong.lyrics.findIndex((lyric, index) => {
      const nextLyric = currentSong.lyrics?.[index + 1];
      return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
    });
    
    if (currentLyric !== -1) {
      setCurrentLyricIndex(currentLyric);
    }
  }, [currentTime, currentSong.lyrics, viewMode]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setCurrentTime(time);
      setProgress((time / duration) * 100);
    }
  }, []);

  const handleSongEnd = useCallback(() => {
    if (repeatMode === 'one') {
      audioRef.current?.play();
    } else {
      handleNext();
    }
  }, [repeatMode]);

  const togglePlay = useCallback(() => {
    if (!audioInitialized) initAudioContext();
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play().then(() => {
        setIsPlaying(true);
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }).catch(console.error);
    }
  }, [isPlaying, audioInitialized, initAudioContext]);

  const handleNext = useCallback(() => {
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    let nextIndex: number;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    setCurrentSong(playlist[nextIndex]);
    setIsPlaying(true);
  }, [currentSong.id, playlist, isShuffle]);

  const handlePrev = useCallback(() => {
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentSong(playlist[prevIndex]);
    setIsPlaying(true);
  }, [currentSong.id, playlist]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percentage * audioRef.current.duration;
    }
  }, []);

  const toggleLike = useCallback((songId: number) => {
    setIsLiked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) newSet.delete(songId);
      else newSet.add(songId);
      return newSet;
    });
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic background gradient based on song color
  const bgGradient = useMemo(() => {
    return `radial-gradient(circle at 50% 50%, ${currentSong.color}20 0%, transparent 70%)`;
  }, [currentSong.color]);

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white overflow-hidden relative">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong.src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnd}
        onLoadedMetadata={() => {
          if (isPlaying) audioRef.current?.play();
        }}
      />

      {/* Dynamic Background */}
      <div 
        className="fixed inset-0 transition-all duration-1000 pointer-events-none"
        style={{ background: bgGradient }}
      />
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none mix-blend-overlay" />

      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 flex justify-between items-center p-4 md:p-6"
      >
        <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
          ← BACK
        </PixelButton>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode(viewMode === 'lyrics' ? 'player' : 'lyrics')}
            className={cn(
              "p-2 rounded-full transition-all",
              viewMode === 'lyrics' ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
            )}
          >
            <Mic2 size={20} />
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'playlist' ? 'player' : 'playlist')}
            className={cn(
              "p-2 rounded-full transition-all",
              viewMode === 'playlist' ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
            )}
          >
            <ListMusic size={20} />
          </button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 h-[calc(100vh-80px)] flex flex-col">
        <AnimatePresence mode="wait">
          {viewMode === 'player' && (
            <motion.div
              key="player"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center gap-8"
            >
              {/* Album Art with Visualizer */}
              <div className="relative group">
                <motion.div
                  animate={{ 
                    rotate: isPlaying ? 360 : 0,
                    scale: isPlaying ? 1 : 0.95
                  }}
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 0.3 }
                  }}
                  className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden shadow-2xl"
                  style={{
                    boxShadow: `0 0 60px ${currentSong.color}40`
                  }}
                >
                  <img 
                    src={currentSong.cover} 
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
                </motion.div>
                
                {/* Visualizer Canvas */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-screen"
                />
                
                {/* Play Button Overlay */}
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
                  </div>
                </button>
              </div>

              {/* Song Info */}
              <div className="text-center space-y-2">
                <motion.h1 
                  key={currentSong.title}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-['Press_Start_2P'] text-2xl md:text-3xl text-white"
                >
                  {currentSong.title}
                </motion.h1>
                <motion.p 
                  key={currentSong.artist}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="font-['VT323'] text-xl text-white/70"
                >
                  {currentSong.artist} • {currentSong.album}
                </motion.p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md space-y-2">
                <div 
                  className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
                  onClick={handleSeek}
                >
                  <motion.div 
                    className="h-full rounded-full relative"
                    style={{ backgroundColor: currentSong.color }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100" />
                  </motion.div>
                </div>
                <div className="flex justify-between font-['VT323'] text-sm text-white/50">
                  <span>{formatTime(currentTime)}</span>
                  <span>{currentSong.duration}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={cn(
                    "p-3 rounded-full transition-all",
                    isShuffle ? "text-white bg-white/20" : "text-white/40 hover:text-white"
                  )}
                >
                  <Shuffle size={20} />
                </button>

                <button 
                  onClick={handlePrev}
                  className="p-4 text-white hover:scale-110 transition-transform active:scale-95"
                >
                  <SkipBack size={28} fill="currentColor" />
                </button>

                <button 
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform active:scale-95 shadow-lg"
                  style={{ backgroundColor: currentSong.color }}
                >
                  {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button 
                  onClick={handleNext}
                  className="p-4 text-white hover:scale-110 transition-transform active:scale-95"
                >
                  <SkipForward size={28} fill="currentColor" />
                </button>

                <button 
                  onClick={() => setRepeatMode(
                    repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none'
                  )}
                  className={cn(
                    "p-3 rounded-full transition-all relative",
                    repeatMode !== 'none' ? "text-white bg-white/20" : "text-white/40 hover:text-white"
                  )}
                >
                  <Repeat size={20} />
                  {repeatMode === 'one' && (
                    <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>
                  )}
                </button>
              </div>

              {/* Volume & Actions */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (audioRef.current) audioRef.current.muted = !isMuted;
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (audioRef.current) audioRef.current.volume = val;
                    setIsMuted(val === 0);
                  }}
                  className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                />
                
                <div className="w-px h-6 bg-white/20 mx-2" />
                
                <button 
                  onClick={() => toggleLike(currentSong.id)}
                  className={cn(
                    "transition-all hover:scale-110",
                    isLiked.has(currentSong.id) ? "text-red-500" : "text-white/40 hover:text-white"
                  )}
                >
                  <Heart size={22} fill={isLiked.has(currentSong.id) ? "currentColor" : "none"} />
                </button>
                
                <button className="text-white/40 hover:text-white transition-colors">
                  <Share2 size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {viewMode === 'lyrics' && (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 overflow-y-auto py-8 space-y-8 text-center"
            >
              {currentSong.lyrics ? (
                currentSong.lyrics.map((line, index) => (
                  <motion.p
                    key={index}
                    animate={{
                      opacity: index === currentLyricIndex ? 1 : 0.3,
                      scale: index === currentLyricIndex ? 1.1 : 1,
                      color: index === currentLyricIndex ? currentSong.color : '#ffffff'
                    }}
                    className="font-['VT323'] text-2xl md:text-3xl transition-all duration-300 cursor-pointer hover:opacity-80"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = line.time;
                      }
                    }}
                  >
                    {line.text}
                  </motion.p>
                ))
              ) : (
                <p className="text-white/50 font-['VT323'] text-xl">No lyrics available</p>
              )}
            </motion.div>
          )}

          {viewMode === 'playlist' && (
            <motion.div
              key="playlist"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 overflow-y-auto py-4 space-y-2"
            >
              {playlist.map((song, index) => {
                const isActive = currentSong.id === song.id;
                return (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setCurrentSong(song);
                      setIsPlaying(true);
                    }}
                    className={cn(
                      "group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                      isActive 
                        ? "bg-white/10 border border-white/20" 
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                      <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                      {isActive && isPlaying && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-0.5">
                          {[1, 2, 3].map(i => (
                            <motion.div
                              key={i}
                              className="w-1 bg-white rounded-full"
                              animate={{ height: [4, 16, 4] }}
                              transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-['VT323'] text-lg truncate",
                        isActive ? "text-white" : "text-white/70"
                      )}>
                        {song.title}
                      </p>
                      <p className="text-white/40 text-sm truncate">{song.artist}</p>
                    </div>
                    
                    <span className="text-white/40 text-sm font-['VT323']">{song.duration}</span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-all",
                        isLiked.has(song.id) ? "text-red-500 opacity-100" : "text-white/40 hover:text-white"
                      )}
                    >
                      <Heart size={18} fill={isLiked.has(song.id) ? "currentColor" : "none"} />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mini Player (when scrolled) */}
      <AnimatePresence>
        {viewMode !== 'player' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e]/95 backdrop-blur-lg border-t border-white/10 p-4 z-50"
          >
            <div className="max-w-6xl mx-auto flex items-center gap-4">
              <img 
                src={currentSong.cover} 
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-['VT323'] text-white truncate">{currentSong.title}</p>
                <p className="text-white/50 text-sm truncate">{currentSong.artist}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handlePrev} className="text-white/60 hover:text-white">
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-black"
                  style={{ backgroundColor: currentSong.color }}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                <button onClick={handleNext} className="text-white/60 hover:text-white">
                  <SkipForward size={20} fill="currentColor" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Music;