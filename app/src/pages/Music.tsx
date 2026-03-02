import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { songs } from '@/lib/chapter-data';
import { cn } from '@/lib/utils';

const Music: React.FC = () => {
  const navigate = useNavigate();

  // STATE
  const [currentSong, setCurrentSong] = useState<typeof songs[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // REF
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visualizerRef = useRef<HTMLCanvasElement | null>(null);

  // --- 1. HANDLE GANTI LAGU (CORE LOGIC) ---
  useEffect(() => {
    if (currentSong && audioRef.current) {
      // Step 1: Pause lagu lama
      audioRef.current.pause();
      
      // Step 2: Ganti Source
      audioRef.current.src = currentSong.src;
      audioRef.current.load();

      // Step 3: Jika statusnya "Playing", mainkan lagu baru
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Playback interrupted/prevented:", error);
            // Jangan ubah isPlaying jadi false disini agar UI tetap responsif
          });
        }
      }
    }
  }, [currentSong]); // Hanya jalan kalau currentSong berubah (Ganti Lagu)

  // --- 2. HANDLE TOMBOL PLAY/PAUSE ---
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.error("Play error:", e));
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]); // Hanya jalan kalau tombol Play/Pause ditekan


  // --- 3. NAVIGASI (NEXT & PREV) - LOGIKA MATEMATIKA ---
  const changeSong = (direction: 'next' | 'prev') => {
    // Jika belum ada lagu, mainkan yang pertama
    if (!currentSong) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
      return;
    }

    // Cari index lagu saat ini
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    
    let newIndex;
    if (direction === 'next') {
      // Logic Circular Next: (0 -> 1 -> 2 -> 0)
      newIndex = (currentIndex + 1) % songs.length;
    } else {
      // Logic Circular Prev: (0 -> 2 -> 1 -> 0)
      newIndex = (currentIndex - 1 + songs.length) % songs.length;
    }

    // Set Lagu Baru
    setCurrentSong(songs[newIndex]);
    setIsPlaying(true); // Otomatis play saat ganti
  };

  // --- 4. PLAYER CONTROLS ---
  const handlePlayToggle = () => {
    if (!currentSong) {
      // Jika belum pilih lagu, pilih lagu pertama
      setCurrentSong(songs[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSelectSong = (song: typeof songs[0]) => {
    if (currentSong?.id === song.id) {
      // Jika klik lagu yang SAMA, toggle play/pause
      setIsPlaying(!isPlaying);
    } else {
      // Jika klik lagu BEDA, ganti lagu & play
      setCurrentSong(song);
      setIsPlaying(true);
    }
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

  // --- 5. VISUALIZER (Tetap Sama) ---
  useEffect(() => {
    if (!isPlaying || !visualizerRef.current) return;
    const canvas = visualizerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bars = 20;
    const barWidth = canvas.width / bars;
    let animationId: number;
    
    const animate = () => {
      if (!isPlaying) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < bars; i++) {
        const height = Math.random() * canvas.height * 0.8;
        const hue = (i / bars) * 60 + 300; 
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 2, height);
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      {/* Audio Element Hidden */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => changeSong('next')} // Auto next saat habis
        onError={(e) => console.log("Audio Error:", e)}
      />

      {/* Header */}
      <div className="bg-[#1A1A2E]/90 border-b-4 border-[#FF69B4] p-4">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            ← MENU
          </PixelButton>
          <h1 className="font-['Press_Start_2P'] text-lg text-white">
            OUR SOUNDTRACK
          </h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="pixel-box p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            
            {/* Vinyl Animation */}
            <div 
              className={cn(
                'w-32 h-32 md:w-48 md:h-48 rounded-full border-8 border-[#1A1A2E] relative transition-all duration-1000',
                isPlaying ? 'animate-spin' : ''
              )}
              style={{
                background: 'repeating-radial-gradient(circle at center, #1a1a2e 0px, #1a1a2e 3px, #333 3px, #333 6px)',
                animationDuration: '3s',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-[#FF69B4] rounded-full" />
              </div>
            </div>

            {/* Song Info */}
            <div className="flex-1 text-center md:text-left w-full">
              <h2 className="font-['Press_Start_2P'] text-lg text-black mb-2 truncate">
                {currentSong ? currentSong.title : 'Select a Song'}
              </h2>
              <p className="font-['VT323'] text-xl text-[#FFD700]">
                {currentSong ? currentSong.artist : '---'}
              </p>
              
              {/* Progress Bar */}
              <div className="mt-4 w-full">
                <div 
                  className="pixel-progress h-4 cursor-pointer relative group" 
                  onClick={handleProgressBarClick}
                >
                  <div 
                    className="pixel-progress-fill h-full transition-all duration-100 relative"
                    style={{ width: `${progress}%` }}
                  >
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-['VT323'] text-sm text-black/50">
                    {audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}
                  </span>
                  <span className="font-['VT323'] text-sm text-black/50">
                    {currentSong?.duration || '0:00'}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center md:justify-start gap-6 mt-4 items-center">
                <button 
                  onClick={() => changeSong('prev')}
                  className="text-3xl text-white hover:text-[#FF69B4] hover:scale-110 transition-transform active:scale-95"
                >
                  ⏮
                </button>
                
                <button 
                  className="text-5xl text-white hover:text-[#FF69B4] hover:scale-110 transition-transform active:scale-95"
                  onClick={handlePlayToggle}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                
                <button 
                  onClick={() => changeSong('next')}
                  className="text-3xl text-white hover:text-[#FF69B4] hover:scale-110 transition-transform active:scale-95"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          <canvas 
            ref={visualizerRef}
            width={400}
            height={100}
            className="w-full mt-6 rounded opacity-80"
          />
        </div>

        {/* Playlist List */}
        <div className="space-y-2">
          <h3 className="font-['Press_Start_2P'] text-sm text-white mb-4">
            PLAYLIST
          </h3>
          {songs.map((song, index) => {
            // Logic pengecekan aktif/tidak
            const isActive = currentSong?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => handleSelectSong(song)}
                className={cn(
                  'flex items-center gap-4 p-4 cursor-pointer transition-all',
                  'border-2 hover:scale-[1.01] active:scale-[0.99]',
                  // Kondisional Class: Hanya yang aktif yang warnanya Pink
                  isActive
                    ? 'bg-[#FF69B4]/30 border-[#FF69B4]'
                    : 'bg-[#1A1A2E] border-white/20 hover:border-white/50'
                )}
              >
                <span className="font-['Press_Start_2P'] text-xs text-white/50 w-8">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <p className={cn(
                    'font-["VT323"] text-lg',
                    isActive ? 'text-[#FF69B4]' : 'text-white'
                  )}>
                    {song.title}
                  </p>
                  <p className="font-['VT323'] text-sm text-white/50">
                    {song.artist}
                  </p>
                </div>
                <span className="font-['VT323'] text-sm text-white/50">
                  {song.duration}
                </span>
                {isActive && isPlaying && (
                  <span className="text-[#FF69B4] animate-pulse">♪</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Music;