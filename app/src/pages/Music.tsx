import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, Heart, ListMusic, Mic2
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
      { time: 15, text: "Oh, I never knew you were the someone waiting for me" },
      { time: 22, text: "'Cause we were just kids when we fell in love" },
      { time: 27, text: "Not knowing what it was" },
      { time: 30, text: "I will not give you up this time" },
      { time: 35, text: "But darling, just kiss me slow, your heart is all I own" },
      { time: 42, text: "And in your eyes you're holding mine" },
      { time: 48, text: "Baby, I'm dancing in the dark with you between my arms" },
      { time: 55, text: "Barefoot on the grass, listening to our favourite song" },
      { time: 62, text: "When you said you looked a mess, I whispered underneath my breath" },
      { time: 69, text: "But you heard it, darling, you look perfect tonight" },
    ]
  },
  {
    id: 2,
    title: "Photograph",
    artist: "Ed Sheeran",
    album: "x (Multiply)",
    cover: "/covers/photograph.jpg",
    src: "/music/photograph.mp3",
    duration: "4:18",
    durationSeconds: 258,
    color: "#4ECDC4",
    lyrics: [
      { time: 0, text: "Loving can hurt, loving can hurt sometimes" },
      { time: 5, text: "But it's the only thing that I know" },
      { time: 10, text: "When it gets hard, you know it can get hard sometimes" },
      { time: 15, text: "It is the only thing that makes us feel alive" },
    ]
  },
  {
    id: 3,
    title: "Thinking Out Loud",
    artist: "Ed Sheeran",
    album: "x (Multiply)",
    cover: "/covers/thinking.jpg",
    src: "/music/thinking.mp3",
    duration: "4:41",
    durationSeconds: 281,
    color: "#FFE66D",
  },
  {
    id: 4,
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    cover: "/covers/shape.jpg",
    src: "/music/shape.mp3",
    duration: "3:53",
    durationSeconds: 233,
    color: "#FF6B9D",
  },
  {
    id: 5,
    title: "All of Me",
    artist: "John Legend",
    album: "Love in the Future",
    cover: "/covers/allofme.jpg",
    src: "/music/allofme.mp3",
    duration: "4:29",
    durationSeconds: 269,
    color: "#C44569",
    lyrics: [
      { time: 0, text: "What would I do without your smart mouth?" },
      { time: 4, text: "Drawing me in, and you kicking me out" },
      { time: 8, text: "You've got my head spinning, no kidding, I can't pin you down" },
      { time: 14, text: "What's going on in that beautiful mind" },
      { time: 18, text: "I'm on your magical mystery ride" },
      { time: 23, text: "And I'm so dizzy, don't know what hit me, but I'll be alright" },
    ]
  }
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
  const lyricsRef = useRef<HTMLDivElement>(null);
  
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
  const [playlist] = useState<Song[]>(songs);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
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
      
      ctx.fillStyle = 'rgba(15, 15, 30, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barCount = 64;
      const radius = Math.min(canvas.width, canvas.height) * 0.25;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (bufferLength / barCount));
        const value = dataArray[dataIndex];
        const percent = value / 255;
        const barHeight = percent * (canvas.height * 0.35);
        
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, currentSong.color);
        gradient.addColorStop(1, `${currentSong.color}40`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 0.6
      );
      glowGradient.addColorStop(0, `${currentSong.color}30`);
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

  // Lyrics sync dengan auto-scroll
  useEffect(() => {
    if (!currentSong.lyrics || viewMode !== 'lyrics') return;
    
    const currentLyric = currentSong.lyrics.findIndex((lyric, index) => {
      const nextLyric = currentSong.lyrics?.[index + 1];
      return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
    });
    
    if (currentLyric !== -1 && currentLyric !== currentLyricIndex) {
      setCurrentLyricIndex(currentLyric);
      
      // Auto-scroll ke lyric yang aktif
      if (lyricsRef.current) {
        const lyricElement = lyricsRef.current.children[currentLyric] as HTMLElement;
        if (lyricElement) {
          lyricElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, currentSong.lyrics, viewMode, currentLyricIndex]);

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
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
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
      const playPromise = audioRef.current?.play();
      if (playPromise) {
        playPromise.then(() => {
          setIsPlaying(true);
          if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
          }
        }).catch(console.error);
      }
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
    setCurrentLyricIndex(0);
  }, [currentSong.id, playlist, isShuffle]);

  const handlePrev = useCallback(() => {
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentSong(playlist[prevIndex]);
    setIsPlaying(true);
    setCurrentLyricIndex(0);
  }, [currentSong.id, playlist]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
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
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic background gradient
  const bgGradient = useMemo(() => {
    return `radial-gradient(circle at 50% 30%, ${currentSong.color}15 0%, transparent 60%)`;
  }, [currentSong.color]);

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white overflow-hidden relative font-sans">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong.src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnd}
        crossOrigin="anonymous"
      />

      {/* Dynamic Background */}
      <motion.div 
        className="fixed inset-0 pointer-events-none transition-all duration-1000"
        animate={{ background: bgGradient }}
      />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none" />

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
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'lyrics' ? 'player' : 'lyrics')}
            className={cn(
              "p-3 rounded-full transition-all backdrop-blur-md",
              viewMode === 'lyrics' 
                ? "bg-white/20 text-white shadow-lg" 
                : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <Mic2 size={20} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'playlist' ? 'player' : 'playlist')}
            className={cn(
              "p-3 rounded-full transition-all backdrop-blur-md",
              viewMode === 'playlist' 
                ? "bg-white/20 text-white shadow-lg" 
                : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <ListMusic size={20} />
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 h-[calc(100vh-100px)] flex flex-col">
        <AnimatePresence mode="wait">
          {viewMode === 'player' && (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 pb-20"
            >
              {/* Album Art with Visualizer */}
              <div className="relative group">
                <motion.div
                  animate={{ 
                    rotate: isPlaying ? 360 : 0,
                  }}
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  }}
                  className="relative w-48 h-48 md:w-72 md:h-72 rounded-full overflow-hidden shadow-2xl"
                  style={{
                    boxShadow: `0 20px 60px -10px ${currentSong.color}50`
                  }}
                >
                  <img 
                    src={currentSong.cover} 
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x400/${currentSong.color.replace('#', '')}/ffffff?text=${encodeURIComponent(currentSong.title)}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent rounded-full" />
                  
                  {/* Center hole */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0f0f1e] rounded-full border-4 border-white/10 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white/30 rounded-full" />
                    </div>
                  </div>
                </motion.div>
                
                {/* Visualizer Canvas - Overlay */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
                  style={{ transform: 'scale(1.4)' }}
                />
              </div>

              {/* Song Info */}
              <div className="text-center space-y-1 md:space-y-2 max-w-md">
                <motion.h1 
                  key={currentSong.title}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-['Press_Start_2P'] text-lg md:text-2xl text-white leading-tight"
                >
                  {currentSong.title}
                </motion.h1>
                <motion.p 
                  key={currentSong.artist}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="font-['VT323'] text-xl md:text-2xl text-white/60"
                >
                  {currentSong.artist}
                </motion.p>
                <motion.p 
                  key={currentSong.album}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="font-['VT323'] text-sm md:text-base text-white/40"
                >
                  {currentSong.album}
                </motion.p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-lg space-y-2 px-4">
                <div 
                  className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group relative"
                  onClick={handleSeek}
                >
                  <motion.div 
                    className="h-full rounded-full relative"
                    style={{ backgroundColor: currentSong.color }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 scale-0 group-hover:scale-100" />
                  </motion.div>
                </div>
                <div className="flex justify-between font-['VT323'] text-sm text-white/40">
                  <span>{formatTime(currentTime)}</span>
                  <span>{currentSong.duration}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center gap-4 md:gap-8">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={cn(
                    "p-3 rounded-full transition-all",
                    isShuffle ? "text-white bg-white/20" : "text-white/30 hover:text-white/60"
                  )}
                >
                  <Shuffle size={22} />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrev}
                  className="p-3 text-white hover:text-white/80 transition-colors"
                >
                  <SkipBack size={32} fill="currentColor" />
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlay}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-[#0f0f1e] shadow-xl transition-shadow hover:shadow-2xl"
                  style={{ backgroundColor: currentSong.color }}
                >
                  {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="p-3 text-white hover:text-white/80 transition-colors"
                >
                  <SkipForward size={32} fill="currentColor" />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRepeatMode(
                    repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none'
                  )}
                  className={cn(
                    "p-3 rounded-full transition-all relative",
                    repeatMode !== 'none' ? "text-white bg-white/20" : "text-white/30 hover:text-white/60"
                  )}
                >
                  <Repeat size={22} />
                  {repeatMode === 'one' && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-current text-[#0f0f1e] rounded-full text-[10px] font-bold flex items-center justify-center">
                      1
                    </span>
                  )}
                </motion.button>
              </div>

              {/* Volume & Like */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2">
                  <button 
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (audioRef.current) audioRef.current.muted = !isMuted;
                    }}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
                      if (audioRef.current) {
                        audioRef.current.volume = val;
                        audioRef.current.muted = val === 0;
                      }
                      setIsMuted(val === 0);
                    }}
                    className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleLike(currentSong.id)}
                  className={cn(
                    "p-3 rounded-full transition-all",
                    isLiked.has(currentSong.id) 
                      ? "text-red-500 bg-red-500/20" 
                      : "text-white/40 hover:text-white bg-white/5"
                  )}
                >
                  <Heart size={22} fill={isLiked.has(currentSong.id) ? "currentColor" : "none"} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {viewMode === 'lyrics' && (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 overflow-y-auto py-8 px-4"
              ref={lyricsRef}
            >
              <div className="max-w-2xl mx-auto space-y-8 text-center pb-32">
                {currentSong.lyrics ? (
                  currentSong.lyrics.map((line, index) => (
                    <motion.p
                      key={index}
                      initial={{ opacity: 0.3 }}
                      animate={{
                        opacity: index === currentLyricIndex ? 1 : 0.3,
                        scale: index === currentLyricIndex ? 1.05 : 1,
                        color: index === currentLyricIndex ? currentSong.color : '#ffffff'
                      }}
                      transition={{ duration: 0.3 }}
                      className="font-['VT323'] text-2xl md:text-4xl cursor-pointer py-2 transition-all hover:opacity-60"
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
                  <div className="flex flex-col items-center justify-center h-64 text-white/30">
                    <Mic2 size={48} className="mb-4 opacity-50" />
                    <p className="font-['VT323'] text-2xl">No lyrics available for this song</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {viewMode === 'playlist' && (
            <motion.div
              key="playlist"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 overflow-y-auto py-4 px-2 pb-24"
            >
              <div className="max-w-2xl mx-auto space-y-2">
                <h3 className="font-['Press_Start_2P'] text-sm text-white/60 mb-6 px-2">
                  PLAYLIST ({playlist.length} songs)
                </h3>
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
                        setCurrentLyricIndex(0);
                      }}
                      className={cn(
                        "group flex items-center gap-4 p-3 md:p-4 rounded-xl cursor-pointer transition-all border",
                        isActive 
                          ? "bg-white/10 border-white/20 shadow-lg" 
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={song.cover} 
                          alt={song.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/100x100/${song.color.replace('#', '')}/ffffff?text=${index + 1}`;
                          }}
                        />
                        {isActive && isPlaying && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-0.5">
                            {[1, 2, 3].map(i => (
                              <motion.div
                                key={i}
                                className="w-1 bg-white rounded-full"
                                animate={{ height: [4, 16, 4] }}
                                transition={{ 
                                  repeat: Infinity, 
                                  duration: 0.5, 
                                  delay: i * 0.1,
                                  ease: "easeInOut"
                                }}
                              />
                            ))}
                          </div>
                        )}
                        {isActive && !isPlaying && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Pause size={16} fill="white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-['VT323'] text-lg md:text-xl truncate",
                          isActive ? "text-white" : "text-white/80"
                        )}>
                          {song.title}
                        </p>
                        <p className="text-white/40 text-sm md:text-base truncate font-['VT323']">{song.artist}</p>
                      </div>
                      
                      <span className="text-white/30 text-sm font-['VT323'] hidden md:block">{song.duration}</span>
                      
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(song.id);
                        }}
                        className={cn(
                          "p-2 rounded-full transition-all opacity-0 group-hover:opacity-100",
                          isLiked.has(song.id) ? "text-red-500 opacity-100" : "text-white/40 hover:text-white"
                        )}
                      >
                        <Heart size={18} fill={isLiked.has(song.id) ? "currentColor" : "none"} />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mini Player */}
      <AnimatePresence>
        {viewMode !== 'player' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0f0f1e]/95 backdrop-blur-xl border-t border-white/10 p-3 md:p-4 z-50"
          >
            <div className="max-w-6xl mx-auto flex items-center gap-3 md:gap-4">
              <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={currentSong.cover} 
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/100x100/${currentSong.color.replace('#', '')}/ffffff?text=♪`;
                  }}
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-['VT323'] text-white text-lg truncate">{currentSong.title}</p>
                <p className="text-white/50 text-sm truncate font-['VT323']">{currentSong.artist}</p>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrev}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  <SkipBack size={24} fill="currentColor" />
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[#0f0f1e]"
                  style={{ backgroundColor: currentSong.color }}
                >
                  {isPlaying ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" className="ml-0.5" />
                  )}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  <SkipForward size={24} fill="currentColor" />
                </motion.button>
              </div>
            </div>
            
            {/* Progress bar mini */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
              <motion.div 
                className="h-full"
                style={{ backgroundColor: currentSong.color }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Music;