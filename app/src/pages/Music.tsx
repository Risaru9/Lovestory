import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, ListMusic, Mic2, Heart, Share2, Download,
  Settings, Disc, Zap, Gamepad2
} from 'lucide-react';
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
  bpm?: number;
  genre?: string;
}

// Data lagu dengan tambahan metadata
const songs: Song[] = [
  {
    id: 1,
    title: "Last Son",
    artist: "David Fleming",
    album: "BGM Soundtrack",
    cover: "/covers/superman.jpg", 
    src: "/audio/bgm/Superman.mp3", 
    duration: "2:45",
    durationSeconds: 165,
    color: "#FF6B6B",
    bpm: 128,
    genre: "Epic",
  },
  {
    id: 2,
    title: "Five Nights at Freddy's 2",
    artist: "The Living Tombstone",
    album: "BGM Soundtrack",
    cover: "/covers/fnaf.jpg",
    src: "/audio/bgm/Fnaf.mp3",
    duration: "3:00",
    durationSeconds: 180,
    color: "#4ECDC4",
    bpm: 140,
    genre: "Electronic",
  },
  {
    id: 3,
    title: "love",
    artist: "wave to earth",
    album: "BGM Soundtrack",
    cover: "/covers/love.jpg",
    src: "/audio/bgm/Love.mp3",
    duration: "5:05",
    durationSeconds: 305,
    color: "#FFE66D",
    bpm: 95,
    genre: "Indie",
  }
];

type RepeatMode = 'none' | 'all' | 'one';
type ViewMode = 'player' | 'playlist' | 'lyrics' | 'visualizer';
type PixelTheme = 'retro' | 'neon' | 'pastel' | 'mono';

const Music: React.FC = () => {
  const navigate = useNavigate();
  
  // Audio refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
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
  const [playlist] = useState<Song[]>(songs);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [likedSongs, setLikedSongs] = useState<Set<number>>(new Set());
  const [pixelTheme, setPixelTheme] = useState<PixelTheme>('retro');
  const [showSettings, setShowSettings] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState<'circular' | 'wave' | 'bars' | 'particles'>('circular');
  const [comboCount, setComboCount] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, color: string}>>([]);

  // Pixel art patterns
  const pixelPatterns = useMemo(() => ({
    retro: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'],
    neon: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0080', '#80FF00'],
    pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA'],
    mono: ['#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333']
  }), []);

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
      setAudioInitialized(true);
    } catch (error) {
      console.error("Audio Context Error:", error);
    }
  }, []);

  // Handle ganti lagu
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = currentSong.src;
      audioRef.current.load();
      
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Playback prevented:", error);
          });
        }
      }
      // Reset combo on song change
      setComboCount(0);
    }
  }, [currentSong.src]);

  // Combo system - increases when user interacts
  const incrementCombo = useCallback(() => {
    setComboCount(prev => {
      const newCount = prev + 1;
      if (newCount > 5) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 2000);
      }
      return newCount;
    });
  }, []);

  // Particle effects
  const spawnParticles = useCallback((x: number, y: number) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 50,
      y: y + (Math.random() - 0.5) * 50,
      color: pixelPatterns[pixelTheme][Math.floor(Math.random() * 5)]
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  }, [pixelTheme, pixelPatterns]);

  // Enhanced Visualizers
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
      
      ctx.fillStyle = 'rgba(15, 15, 30, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      if (visualizerMode === 'circular') {
        // Circular pixelated visualizer
        const barCount = 32;
        const radius = Math.min(canvas.width, canvas.height) * 0.2;
        
        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength / barCount));
          const value = dataArray[dataIndex];
          const percent = value / 255;
          const barHeight = percent * (canvas.height * 0.3);
          
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);
          
          // Pixelated lines
          ctx.strokeStyle = currentSong.color;
          ctx.lineWidth = 4;
          ctx.lineCap = 'square';
          ctx.beginPath();
          ctx.moveTo(Math.floor(x1 / 4) * 4, Math.floor(y1 / 4) * 4);
          ctx.lineTo(Math.floor(x2 / 4) * 4, Math.floor(y2 / 4) * 4);
          ctx.stroke();
          
          // Glow effect
          if (percent > 0.7) {
            ctx.fillStyle = `${currentSong.color}40`;
            ctx.fillRect(Math.floor(x2 / 4) * 4 - 2, Math.floor(y2 / 4) * 4 - 2, 8, 8);
          }
        }
      } else if (visualizerMode === 'wave') {
        // Pixel wave
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(Math.floor(x / 4) * 4, Math.floor(y / 4) * 4);
          
          x += sliceWidth;
        }
        
        ctx.strokeStyle = currentSong.color;
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (visualizerMode === 'bars') {
        // Pixel bars
        const barWidth = 8;
        const gap = 4;
        const bars = Math.floor(canvas.width / (barWidth + gap));
        
        for (let i = 0; i < bars; i++) {
          const dataIndex = Math.floor(i * (bufferLength / bars));
          const value = dataArray[dataIndex];
          const percent = value / 255;
          const barHeight = percent * canvas.height * 0.8;
          
          const x = i * (barWidth + gap);
          const y = canvas.height - barHeight;
          
          // Draw pixelated bar
          ctx.fillStyle = percent > 0.8 ? '#FFFFFF' : currentSong.color;
          ctx.fillRect(Math.floor(x), Math.floor(y / 4) * 4, barWidth, Math.floor(barHeight / 4) * 4);
        }
      } else if (visualizerMode === 'particles') {
        // Particle system based on audio
        for (let i = 0; i < 20; i++) {
          const dataIndex = Math.floor(i * (bufferLength / 20));
          const value = dataArray[dataIndex];
          if (value > 150) {
            const angle = (i / 20) * Math.PI * 2;
            const px = centerX + Math.cos(angle) * 50;
            const py = centerY + Math.sin(angle) * 50;
            
            ctx.fillStyle = pixelPatterns[pixelTheme][i % 5];
            const size = Math.floor((value / 255) * 8);
            ctx.fillRect(Math.floor(px), Math.floor(py), size, size);
          }
        }
      }
      
      // Center pixel art disc
      const discSize = 60 + (dataArray[10] / 255) * 20;
      ctx.fillStyle = '#0f0f1e';
      ctx.fillRect(centerX - discSize/2, centerY - discSize/2, discSize, discSize);
      ctx.strokeStyle = currentSong.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(centerX - discSize/2, centerY - discSize/2, discSize, discSize);
    };
    
    draw();
  }, [isPlaying, currentSong.color, visualizerMode, pixelPatterns, pixelTheme]);

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
    
    if (currentLyric !== -1 && currentLyric !== currentLyricIndex) {
      setCurrentLyricIndex(currentLyric);
      if (lyricsRef.current) {
        const lyricElement = lyricsRef.current.children[currentLyric] as HTMLElement;
        if (lyricElement) lyricElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    incrementCombo();
    
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
  }, [isPlaying, audioInitialized, initAudioContext, incrementCombo]);

  const handleNext = useCallback(() => {
    incrementCombo();
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    let nextIndex = isShuffle 
      ? Math.floor(Math.random() * playlist.length)
      : (currentIndex + 1) % playlist.length;
    
    setCurrentSong(playlist[nextIndex]);
    setIsPlaying(true);
    setCurrentLyricIndex(0);
  }, [currentSong.id, playlist, isShuffle, incrementCombo]);

  const handlePrev = useCallback(() => {
    incrementCombo();
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentSong(playlist[prevIndex]);
    setIsPlaying(true);
    setCurrentLyricIndex(0);
  }, [currentSong.id, playlist, incrementCombo]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = percentage * audioRef.current.duration;
      spawnParticles(e.clientX, e.clientY);
    }
  }, [spawnParticles]);

  const toggleLike = useCallback((songId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLikedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
        if (e) spawnParticles(e.clientX, e.clientY);
      }
      return newSet;
    });
  }, [spawnParticles]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Pixel art background grid
  const PixelGrid = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, ${currentSong.color}20 1px, transparent 1px),
          linear-gradient(to bottom, ${currentSong.color}20 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }} />
    </div>
  );

  // Floating pixel decorations
  const FloatingPixels = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-4 h-4 rounded-sm"
          style={{
            backgroundColor: pixelPatterns[pixelTheme][i % 5],
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 90, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white overflow-hidden relative font-mono selection:bg-current selection:text-[#0f0f1e]">
      <audio
        ref={audioRef}
        src={currentSong.src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnd}
        crossOrigin="anonymous"
      />

      {/* Dynamic Background */}
      <PixelGrid />
      <FloatingPixels />
      
      {/* Theme-based gradient */}
      <motion.div 
        className="fixed inset-0 pointer-events-none"
        animate={{ 
          background: `radial-gradient(circle at 50% 50%, ${currentSong.color}10 0%, transparent 70%)` 
        }}
        transition={{ duration: 1 }}
      />

      {/* Scanlines effect */}
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />

      {/* Combo Display */}
      <AnimatePresence>
        {showCombo && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="text-6xl font-bold text-yellow-400 drop-shadow-[4px_4px_0_#000]" style={{ fontFamily: '"Press Start 2P", monospace' }}>
              {comboCount}x COMBO!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          initial={{ scale: 1, opacity: 1, x: particle.x, y: particle.y }}
          animate={{ 
            scale: 0, 
            opacity: 0, 
            x: particle.x + (Math.random() - 0.5) * 100,
            y: particle.y - 100
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="fixed w-3 h-3 pointer-events-none z-50"
          style={{ backgroundColor: particle.color }}
        />
      ))}

      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 flex justify-between items-center p-4 md:p-6"
      >
        <motion.button 
          onClick={() => navigate('/home')} 
          className="group flex items-center gap-2 px-4 py-2 bg-white/10 border-2 border-white/20 rounded-none hover:bg-white/20 hover:border-white/40 transition-all active:translate-y-1"
          style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-sm font-bold tracking-wider" style={{ fontFamily: '"Press Start 2P", monospace' }}>← BACK</span>
        </motion.button>
        
        <div className="flex gap-3">
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-3 border-2 rounded-none transition-all",
              showSettings ? "bg-white/20 border-white text-white" : "bg-white/5 border-white/20 text-white/60 hover:text-white hover:border-white/40"
            )}
            style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
          >
            <Settings size={20} />
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'lyrics' ? 'player' : 'lyrics')}
            className={cn(
              "p-3 border-2 rounded-none transition-all",
              viewMode === 'lyrics' ? "bg-white/20 border-white text-white" : "bg-white/5 border-white/20 text-white/60 hover:text-white hover:border-white/40"
            )}
            style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
          >
            <Mic2 size={20} />
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'playlist' ? 'player' : 'playlist')}
            className={cn(
              "p-3 border-2 rounded-none transition-all",
              viewMode === 'playlist' ? "bg-white/20 border-white text-white" : "bg-white/5 border-white/20 text-white/60 hover:text-white hover:border-white/40"
            )}
            style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
          >
            <ListMusic size={20} />
          </motion.button>
        </div>
      </motion.header>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-20 right-4 md:right-6 z-30 bg-[#1a1a2e] border-2 border-white/20 p-4 rounded-none"
            style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.5)' }}
          >
            <h3 className="text-xs font-bold mb-3 text-white/60" style={{ fontFamily: '"Press Start 2P", monospace' }}>THEME</h3>
            <div className="flex gap-2 mb-4">
              {(Object.keys(pixelPatterns) as PixelTheme[]).map(theme => (
                <button
                  key={theme}
                  onClick={() => setPixelTheme(theme)}
                  className={cn(
                    "w-8 h-8 border-2 transition-all",
                    pixelTheme === theme ? "border-white scale-110" : "border-white/20 hover:border-white/40"
                  )}
                  style={{ 
                    backgroundColor: pixelPatterns[theme][0],
                    boxShadow: pixelTheme === theme ? '2px 2px 0 rgba(0,0,0,0.5)' : 'none'
                  }}
                />
              ))}
            </div>
            
            <h3 className="text-xs font-bold mb-3 text-white/60" style={{ fontFamily: '"Press Start 2P", monospace' }}>VISUALIZER</h3>
            <div className="space-y-2">
              {(['circular', 'wave', 'bars', 'particles'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setVisualizerMode(mode)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs border-2 transition-all uppercase",
                    visualizerMode === mode 
                      ? "bg-white/20 border-white text-white" 
                      : "bg-transparent border-white/10 text-white/60 hover:border-white/30"
                  )}
                  style={{ fontFamily: '"VT323", monospace' }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {/* Album Art with Pixel Frame */}
              <div className="relative group">
                {/* Pixel border decoration */}
                <div className="absolute -inset-4 border-4 border-dashed border-white/20 rounded-none animate-spin-slow" />
                
                <motion.div
                  animate={{ 
                    rotate: isPlaying ? 360 : 0,
                    scale: isPlaying ? 1 : 0.95
                  }}
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 0.3 }
                  }}
                  className="relative w-48 h-48 md:w-72 md:h-72 overflow-hidden"
                  style={{ 
                    boxShadow: `8px 8px 0 ${currentSong.color}40`,
                    imageRendering: 'pixelated'
                  }}
                >
                  <img 
                    src={currentSong.cover} 
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x400/${currentSong.color.replace('#', '')}/ffffff?text=${encodeURIComponent(currentSong.title)}`;
                    }}
                  />
                  {/* Pixel overlay */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-30" />
                </motion.div>
                
                {/* Visualizer Canvas */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ 
                    transform: 'scale(1.5)',
                    imageRendering: 'pixelated'
                  }}
                />
                
                {/* Play indicator */}
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50"
                    >
                      <div className="w-16 h-16 border-4 border-white flex items-center justify-center">
                        <Play size={32} fill="white" className="ml-1" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Song Info */}
              <div className="text-center space-y-2 max-w-md">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 text-xs"
                  style={{ fontFamily: '"Press Start 2P", monospace' }}
                >
                  <Disc size={12} className={cn("animate-spin", isPlaying ? "opacity-100" : "opacity-50")} />
                  {currentSong.genre?.toUpperCase()} • {currentSong.bpm} BPM
                </motion.div>
                
                <motion.h1 
                  key={currentSong.title}
                  initial={{ y: 10, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }}
                  className="text-xl md:text-3xl text-white leading-tight drop-shadow-[2px_2px_0_#000]"
                  style={{ fontFamily: '"Press Start 2P", monospace' }}
                >
                  {currentSong.title}
                </motion.h1>
                <motion.p 
                  key={currentSong.artist}
                  initial={{ y: 10, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.1 }}
                  className="text-lg md:text-2xl text-white/60"
                  style={{ fontFamily: '"VT323", monospace' }}
                >
                  {currentSong.artist}
                </motion.p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => toggleLike(currentSong.id, e)}
                  className={cn(
                    "p-3 border-2 transition-all",
                    likedSongs.has(currentSong.id) 
                      ? "bg-red-500/20 border-red-500 text-red-400" 
                      : "bg-white/5 border-white/20 text-white/60 hover:border-white/40"
                  )}
                  style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
                >
                  <Heart size={20} fill={likedSongs.has(currentSong.id) ? "currentColor" : "none"} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-3 border-2 border-white/20 bg-white/5 text-white/60 hover:text-white hover:border-white/40 transition-all"
                  style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
                >
                  <Share2 size={20} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-3 border-2 border-white/20 bg-white/5 text-white/60 hover:text-white hover:border-white/40 transition-all"
                  style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
                >
                  <Download size={20} />
                </motion.button>
              </div>

              {/* Progress Bar - Pixel Style */}
              <div className="w-full max-w-lg space-y-2 px-4">
                <div 
                  className="h-6 bg-white/10 border-2 border-white/20 cursor-pointer relative overflow-hidden"
                  onClick={handleSeek}
                  style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)' }}
                >
                  <motion.div 
                    className="h-full relative"
                    style={{ 
                      backgroundColor: currentSong.color,
                      boxShadow: '2px 0 0 rgba(0,0,0,0.3)'
                    }}
                    animate={{ width: `${progress}%` }} 
                    transition={{ duration: 0.1 }}
                  >
                    {/* Pixel pattern on progress */}
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.1)_25%,rgba(0,0,0,0.1)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.1)_75%)] bg-[length:8px_8px]" />
                  </motion.div>
                  
                  {/* Pixel thumb */}
                  <motion.div 
                    className="absolute top-0 bottom-0 w-2 bg-white border-l-2 border-r-2 border-black/30"
                    style={{ left: `calc(${progress}% - 4px)` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-white/40" style={{ fontFamily: '"VT323", monospace' }}>
                  <span className="bg-black/30 px-2">{formatTime(currentTime)}</span>
                  <span className="bg-black/30 px-2">{currentSong.duration}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center gap-4 md:gap-6">
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: isShuffle ? 180 : 0 }}
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => { setIsShuffle(!isShuffle); incrementCombo(); }}
                  className={cn(
                    "p-3 border-2 transition-all",
                    isShuffle ? "bg-white/20 border-white text-white" : "bg-white/5 border-white/20 text-white/30 hover:text-white/60"
                  )}
                  style={{ boxShadow: isShuffle ? '3px 3px 0 rgba(0,0,0,0.5)' : 'none' }}
                >
                  <Shuffle size={22} />
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1, x: -2 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={handlePrev} 
                  className="p-3 text-white hover:text-white/80 transition-colors border-2 border-white/20 hover:border-white/40 bg-white/5"
                  style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
                >
                  <SkipBack size={28} fill="currentColor" />
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  onClick={togglePlay}
                  className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-[#0f0f1e] border-4 border-white"
                  style={{ 
                    backgroundColor: currentSong.color,
                    boxShadow: `6px 6px 0 ${currentSong.color}60, inset -2px -2px 0 rgba(0,0,0,0.2), inset 2px 2px 0 rgba(255,255,255,0.3)`
                  }}
                >
                  {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1, x: 2 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={handleNext} 
                  className="p-3 text-white hover:text-white/80 transition-colors border-2 border-white/20 hover:border-white/40 bg-white/5"
                  style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
                >
                  <SkipForward size={28} fill="currentColor" />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { 
                    setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none');
                    incrementCombo();
                  }}
                  className={cn(
                    "p-3 border-2 transition-all relative",
                    repeatMode !== 'none' ? "bg-white/20 border-white text-white" : "bg-white/5 border-white/20 text-white/30 hover:text-white/60"
                  )}
                  style={{ boxShadow: repeatMode !== 'none' ? '3px 3px 0 rgba(0,0,0,0.5)' : 'none' }}
                >
                  <Repeat size={22} />
                  {repeatMode === 'one' && (
                    <span 
                      className="absolute -top-2 -right-2 w-5 h-5 bg-current text-[#0f0f1e] text-[10px] font-bold flex items-center justify-center border-2 border-white"
                      style={{ fontFamily: '"Press Start 2P", monospace' }}
                    >
                      1
                    </span>
                  )}
                </motion.button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-4 bg-white/5 border-2 border-white/10 px-4 py-2">
                <button 
                  onClick={() => { 
                    setIsMuted(!isMuted); 
                    if (audioRef.current) audioRef.current.muted = !isMuted; 
                  }} 
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div className="w-32 h-4 bg-white/10 border border-white/20 relative cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const val = Math.max(0, Math.min(1, x / rect.width));
                    setVolume(val);
                    setIsMuted(val === 0);
                    if (audioRef.current) {
                      audioRef.current.volume = val;
                      audioRef.current.muted = val === 0;
                    }
                  }}
                >
                  <motion.div 
                    className="absolute top-0 bottom-0 bg-white/60"
                    animate={{ width: `${isMuted ? 0 : volume * 100}%` }}
                  />
                </div>
              </div>

              {/* Visualizer Mode Toggle */}
              <div className="flex gap-2">
                {(['circular', 'wave', 'bars', 'particles'] as const).map(mode => (
                  <motion.button
                    key={mode}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVisualizerMode(mode)}
                    className={cn(
                      "px-3 py-1 text-xs border-2 uppercase tracking-wider transition-all",
                      visualizerMode === mode
                        ? "bg-white text-[#0f0f1e] border-white"
                        : "bg-transparent text-white/40 border-white/20 hover:border-white/40"
                    )}
                    style={{ fontFamily: '"Press Start 2P", monospace' }}
                  >
                    {mode}
                  </motion.button>
                ))}
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
              <div className="max-w-2xl mx-auto space-y-6 text-center pb-32">
                {currentSong.lyrics ? (
                  currentSong.lyrics.map((line, index) => (
                    <motion.p
                      key={index}
                      initial={{ opacity: 0.3, scale: 0.9 }}
                      animate={{ 
                        opacity: index === currentLyricIndex ? 1 : 0.3, 
                        scale: index === currentLyricIndex ? 1.1 : 1,
                        color: index === currentLyricIndex ? currentSong.color : '#ffffff'
                      }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl md:text-4xl cursor-pointer py-2 transition-all hover:opacity-60 drop-shadow-[2px_2px_0_#000]"
                      style={{ fontFamily: '"VT323", monospace' }}
                      onClick={() => { 
                        if (audioRef.current) audioRef.current.currentTime = line.time;
                        incrementCombo();
                      }}
                    >
                      {line.text}
                    </motion.p>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-white/30">
                    <Gamepad2 size={48} className="mb-4 opacity-50" />
                    <p className="text-2xl" style={{ fontFamily: '"VT323", monospace' }}>No lyrics available</p>
                    <p className="text-sm mt-2" style={{ fontFamily: '"Press Start 2P", monospace' }}>INSERT COIN TO CONTINUE</p>
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
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="text-xs text-white/60" style={{ fontFamily: '"Press Start 2P", monospace' }}>
                    QUEUE [{playlist.length}]
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={cn(
                        "px-3 py-1 text-xs border-2 transition-all",
                        isShuffle ? "bg-white/20 border-white" : "border-white/20 text-white/40"
                      )}
                      style={{ fontFamily: '"Press Start 2P", monospace' }}
                    >
                      SHUFFLE
                    </button>
                  </div>
                </div>
                
                {playlist.map((song, index) => {
                  const isActive = currentSong.id === song.id;
                  return (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => { 
                        setCurrentSong(song); 
                        setIsPlaying(true); 
                        setCurrentLyricIndex(0);
                        incrementCombo();
                      }}
                      className={cn(
                        "group flex items-center gap-4 p-3 cursor-pointer transition-all border-2",
                        isActive 
                          ? "bg-white/10 border-white shadow-[4px_4px_0_rgba(0,0,0,0.5)]" 
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="relative w-12 h-12 md:w-16 md:h-16 overflow-hidden border-2 border-white/20 flex-shrink-0">
                        <img 
                          src={song.cover} 
                          alt={song.title} 
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => { 
                            (e.target as HTMLImageElement).src = `https://placehold.co/100x100/${song.color.replace('#', '')}/ffffff?text=${index + 1}`; 
                          }}
                        />
                        {isActive && isPlaying && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1">
                            {[1, 2, 3].map(i => (
                              <motion.div 
                                key={i} 
                                className="w-2 bg-white"
                                animate={{ height: [4, 16, 4] }}
                                transition={{ 
                                  repeat: Infinity, 
                                  duration: 0.5, 
                                  delay: i * 0.1,
                                  ease: "linear"
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <div className="absolute top-0 left-0 bg-black/50 text-[10px] px-1 text-white/60" style={{ fontFamily: '"Press Start 2P", monospace' }}>
                          {String(index + 1).padStart(2, '0')}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-lg md:text-xl truncate",
                          isActive ? "text-white" : "text-white/80"
                        )} style={{ fontFamily: '"VT323", monospace' }}>
                          {song.title}
                        </p>
                        <p className="text-white/40 text-sm truncate" style={{ fontFamily: '"VT323", monospace' }}>
                          {song.artist} • {song.genre}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-white/30 text-sm hidden md:block" style={{ fontFamily: '"VT323", monospace' }}>
                          {song.duration}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => toggleLike(song.id, e)}
                          className={cn(
                            "p-2 transition-colors",
                            likedSongs.has(song.id) ? "text-red-400" : "text-white/20 hover:text-white/60"
                          )}
                        >
                          <Heart size={16} fill={likedSongs.has(song.id) ? "currentColor" : "none"} />
                        </motion.button>
                      </div>
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
            className="fixed bottom-0 left-0 right-0 bg-[#0f0f1e]/95 border-t-4 border-white/10 p-3 md:p-4 z-50"
            style={{ boxShadow: '0 -4px 0 rgba(0,0,0,0.5)' }}
          >
            <div className="max-w-6xl mx-auto flex items-center gap-3 md:gap-4">
              <div className="relative w-12 h-12 md:w-14 md:h-14 overflow-hidden border-2 border-white/20 flex-shrink-0">
                <motion.img 
                  src={currentSong.cover} 
                  alt={currentSong.title} 
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  onError={(e) => { 
                    (e.target as HTMLImageElement).src = `https://placehold.co/100x100/${currentSong.color.replace('#', '')}/ffffff?text=♪`; 
                  }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-white text-lg truncate" style={{ fontFamily: '"VT323", monospace' }}>
                  {currentSong.title}
                </p>
                <p className="text-white/50 text-sm truncate" style={{ fontFamily: '"VT323", monospace' }}>
                  {currentSong.artist}
                </p>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4">
                <motion.button 
                  whileHover={{ scale: 1.1, x: -2 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={handlePrev} 
                  className="p-2 text-white/60 hover:text-white"
                >
                  <SkipBack size={24} fill="currentColor" />
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  onClick={togglePlay} 
                  className="w-12 h-12 flex items-center justify-center text-[#0f0f1e] border-2 border-white"
                  style={{ backgroundColor: currentSong.color }}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1, x: 2 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={handleNext} 
                  className="p-2 text-white/60 hover:text-white"
                >
                  <SkipForward size={24} fill="currentColor" />
                </motion.button>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
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

      {/* Retro Corner Decorations */}
      <div className="fixed bottom-4 left-4 text-[10px] text-white/20 pointer-events-none" style={{ fontFamily: '"Press Start 2P", monospace' }}>
        <div className="flex items-center gap-2">
          <Zap size={12} />
          <span>POWERED BY REACT</span>
        </div>
        <div className="mt-1">v1.0.0</div>
      </div>
    </div>
  );
};

export default Music;