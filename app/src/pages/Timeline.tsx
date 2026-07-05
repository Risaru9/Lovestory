import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { getChapters, addChapter } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { Chapter } from '@/types';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
}

const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chaptersList, setChaptersList] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  // State Modal Tambah Cerita
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');
  const [achievement, setAchievement] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chapters awal
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getChapters();
      setChaptersList(data);
    } catch (err) {
      console.error('Error load chapters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Realtime subscription agar sinkronisasi dua arah instan
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('public:chapters:realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chapters',
        },
        async () => {
          console.log('[Realtime] Perubahan tabel chapters terdeteksi, memuat ulang...');
          const data = await getChapters();
          setChaptersList(data);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const maxScroll = Math.max(scrollHeight - clientHeight, 1);
      const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      setScrollProgress(progress);
    };

    handleScroll();
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [chaptersList]); // Pemicu scroll ulang jika panjang list berubah

  const completedCount = chaptersList.length; // Semua chapter buatan sendiri terhitung complete secara instan

  const activeChapterIndex = Math.min(
    chaptersList.length - 1,
    Math.round(scrollProgress * Math.max(chaptersList.length - 1, 0))
  );

  const currentActiveChapter = chaptersList[activeChapterIndex] ?? null;

  const characterY = 10 + scrollProgress * 78;
  const progressHeight = `${Math.max(scrollProgress * 100, 4)}%`;

  const spawnConfettiFromElement = (target: HTMLElement) => {
    const container = scrollRef.current;
    if (!container) return;

    const rect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const baseX = rect.left - containerRect.left + rect.width / 2;
    const baseY = rect.top - containerRect.top + container.scrollTop + rect.height / 2;

    const colors = ['#FF69B4', '#FFD700', '#00FFFF', '#32CD32', '#FF8C00'];
    const particles: ConfettiParticle[] = [];

    for (let i = 0; i < 20; i += 1) {
      particles.push({
        id: Date.now() + i,
        x: baseX + (Math.random() - 0.5) * 90,
        y: baseY + (Math.random() - 0.5) * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setConfetti((prev) => [...prev, ...particles]);

    window.setTimeout(() => {
      setConfetti((prev) =>
        prev.filter((particle) => !particles.some((item) => item.id === particle.id))
      );
    }, 1800);
  };

  const handleChapterClick = (
    chapter: Chapter,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const element = event.currentTarget;
    spawnConfettiFromElement(element);

    window.setTimeout(() => {
      navigate(`/chapter/${chapter.id}`);
    }, 220);
  };

  // Preview Gambar
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Submit Cerita Baru
  const handleAddChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !dateStr.trim() || !description.trim() || !story.trim() || !imageFile) {
      setError('Semua kolom formulir dan gambar wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await addChapter(
        title,
        dateStr,
        description,
        story,
        achievement || 'Petualangan Baru Terbuka!',
        imageFile
      );

      // Reset form
      setTitle('');
      setDateStr('');
      setDescription('');
      setStory('');
      setAchievement('');
      setImageFile(null);
      setImagePreview(null);
      setIsModalOpen(false);

      // Refresh list
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menambahkan petualangan baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#1A1A2E] bg-[#080b18]/90 backdrop-blur-md px-4 py-3">
        <div className="flex justify-between items-center max-w-6xl mx-auto gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-white leading-none">
              JOURNEY MAP
            </h1>
            <p className="font-['VT323'] text-xs text-white/50 mt-1 tracking-wider hidden sm:block">
              {completedCount} bab selesai
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <PixelButton onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="text-[9px]">
              + KISAH
            </PixelButton>
            <PixelButton onClick={() => navigate('/achievements')} variant="secondary" size="sm" className="text-[9px] hidden sm:inline-block">
              ACHIEVE
            </PixelButton>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-[#0c0a18]">
          <p className="font-['Press_Start_2P'] text-[10px] text-[#FF69B4] animate-pulse">
            LOADING MAP...
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto relative"
          style={{
            backgroundImage: 'url(/images/backgrounds/timeline-bg.png)',
            backgroundSize: 'cover',
            backgroundAttachment: 'fixed',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/65 z-0" />

          {confetti.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 pointer-events-none rounded-[2px] z-20"
              style={{
                left: particle.x,
                top: particle.y,
                backgroundColor: particle.color,
                animation: 'confetti-fall 1.8s ease-out forwards',
              }}
            />
          ))}

          <div className="relative z-10 min-h-[140vh] py-8 px-4">
            <div className="max-w-4xl mx-auto relative">
              <div className="text-center mb-8">
                <h2 className="font-['Press_Start_2P'] text-xs md:text-sm text-[#FFD700] mb-2 drop-shadow-[1.5px_1.5px_0_#FF69B4] tracking-wider">
                  OUR ADVENTURE
                </h2>
                <p className="font-['VT323'] text-sm sm:text-base text-white/60 tracking-widest uppercase">
                  {chaptersList.length} bab kisah petualangan kita
                </p>
              </div>              {/* Status bar */}
              <div className="grid grid-cols-3 gap-2.5 mb-8">
                <div className="rounded-xl border-2 border-[#1a1a2e] bg-[#12121c] p-3 text-center shadow-[2px_2px_0_#000000] select-none">
                  <div className="font-['Press_Start_2P'] text-[7px] text-white/40">KISAH KITA</div>
                  <div className="mt-1.5 font-['VT323'] text-2xl text-[#FF69B4] leading-none">{chaptersList.length} Bab</div>
                </div>
                <div className="rounded-xl border-2 border-[#1a1a2e] bg-[#12121c] p-3 text-center shadow-[2px_2px_0_#000000] min-w-0 select-none">
                  <div className="font-['Press_Start_2P'] text-[7px] text-white/40">KERAJAAN AKTIF</div>
                  <div className="mt-1.5 font-['VT323'] text-xs text-[#32CD32] leading-none truncate uppercase tracking-wider">
                    {currentActiveChapter ? currentActiveChapter.title : 'Petualangan'}
                  </div>
                </div>
                <div className="rounded-xl border-2 border-[#1a1a2e] bg-[#12121c] p-3 text-center shadow-[2px_2px_0_#000000] select-none">
                  <div className="font-['Press_Start_2P'] text-[7px] text-white/40">ACHIEVEMENTS</div>
                  <div className="mt-1.5 font-['VT323'] text-2xl text-[#FFD700] leading-none">{chaptersList.length}</div>
                </div>
              </div>

              {chaptersList.length === 0 ? (
                <div className="text-center py-20 bg-[#12121c] border-4 border-[#1a1a2e] rounded-xl p-6 shadow-[4px_4px_0_#000000]">
                  <p className="font-['Press_Start_2P'] text-[9px] text-white/35 mb-3">
                    MAP MASIH KOSONG...
                  </p>
                  <p className="font-['VT323'] text-base text-white/50 mb-6">
                    Kalian belum menulis kisah perjalanan cinta kalian.<br />
                    Klik tombol di atas untuk memulai petualangan pertama!
                  </p>
                </div>
              ) : (
                <>
                  {/* Timeline bar */}
                  <div className="absolute md:left-1/2 left-8 top-[10%] bottom-[12%] w-[6px] bg-white/10 rounded-full -translate-x-1/2 z-0" />
                  <div
                    className="absolute md:left-1/2 left-8 top-[10%] w-[6px] bg-[#FFD700] border border-[#1a1a2e] rounded-full -translate-x-1/2 transition-all duration-300 z-0"
                    style={{ height: progressHeight, maxHeight: '78%' }}
                  />

                  {/* Character sprite */}
                  <div
                    className="absolute md:left-1/2 left-8 -translate-x-1/2 z-20 transition-all duration-300 select-none"
                    style={{ top: `${characterY}%` }}
                  >
                    <div className="relative">
                      <img
                        src="/images/sprites/char-boy.png"
                        alt="Player"
                        className="relative w-12 h-12 md:w-14 md:h-14 pixel-art animate-float"
                      />
                    </div>
                  </div>

                  <div className="space-y-12 relative z-10">
                    {chaptersList.map((chapter, index) => {
                      const isReached = index <= activeChapterIndex;
                      const isEven = index % 2 === 0;

                      return (
                        <div
                          key={chapter.id}
                          className={`flex items-center gap-4 md:gap-8 flex-row-reverse md:flex-row ${
                            isEven ? '' : 'md:flex-row-reverse'
                          }`}
                        >
                          <div className={`flex-1 ${isEven ? 'md:text-right' : 'md:text-left'} text-left`}>
                            <div
                              className={[
                                'inline-block w-full max-w-[280px] md:max-w-sm rounded-xl px-4 py-4 cursor-pointer transition-all duration-150 bg-[#12121c] border-4 border-[#1a1a2e] hover:border-[#FF69B4]/65 shadow-[4px_4px_0_#000000] relative overflow-hidden',
                                isReached ? 'border-[#FFD700]/70' : '',
                              ].join(' ')}
                              onClick={(event) => handleChapterClick(chapter, event)}
                            >
                              <div
                                className={`flex items-center gap-2 mb-2 ${isEven ? 'md:justify-end' : 'md:justify-start'} justify-start select-none`}
                              >
                                <span className="font-['Press_Start_2P'] text-[7px] text-[#FFD700] tracking-wider font-bold">
                                  MONTH {chapter.month}
                                </span>
                                {isReached && (
                                  <span className="font-['Press_Start_2P'] text-[6px] text-[#00FFFF] tracking-wider uppercase border border-[#00FFFF] px-1 rounded-sm">
                                    aktif
                                  </span>
                                )}
                              </div>

                              <h3 className="font-['Press_Start_2P'] text-[9px] text-white leading-normal mb-1.5 tracking-wide uppercase">
                                {chapter.title}
                              </h3>

                              <div className="font-['VT323'] text-sm text-white/40 tracking-wider">
                                {chapter.date}
                              </div>

                              {chapter.description && (
                                <p className="font-['VT323'] text-base text-white/60 mt-2 leading-relaxed">
                                  {chapter.description}
                                </p>
                              )}

                              <div className={`mt-3 flex ${isEven ? 'md:justify-end' : 'md:justify-start'} justify-start select-none`}>
                                <div className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 bg-[#32CD32]/10 border border-[#32CD32]/30">
                                  <span className="text-[#32CD32] text-xs font-bold">✓</span>
                                  <span className="font-['VT323'] text-xs text-[#32CD32] uppercase tracking-wider">
                                    Completed
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Center Node Star */}
                          <div className="w-16 md:w-28 flex justify-center items-center shrink-0 select-none">
                            <div
                              className={[
                                'relative w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-150 shrink-0 cursor-pointer',
                                isReached
                                  ? 'bg-[#FFD700] border-2 border-[#1a1a2e] text-[#1a1a2e] shadow-[2px_2px_0_#000000] font-bold'
                                  : 'bg-[#12121c] border-2 border-[#1a1a2e] text-white/30 hover:text-white',
                              ].join(' ')}
                              onClick={(event) => handleChapterClick(chapter, event)}
                            >
                              <span className="text-sm font-bold">★</span>
                            </div>
                          </div>

                          <div className="hidden md:block flex-1" />
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center mt-16 select-none z-10 relative">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFD700] border-2 border-[#1a1a2e] rounded-full shadow-[3px_3px_0_#000000] animate-pulse">
                      <span className="text-2xl">🏆</span>
                    </div>
                    <p className="font-['Press_Start_2P'] text-[8px] text-[#FFD700] mt-4 tracking-widest">
                      KISAH KITA BERLANJUT...
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          <style>{`
            @keyframes confetti-fall {
              0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
              100% { transform: translateY(180px) rotate(720deg) scale(0.7); opacity: 0; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
            .animate-float { animation: float 2s ease-in-out infinite; }
          `}</style>
        </div>
      )}

      {/* Modal Tambah Kisah Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121c] border-4 border-[#1a1a2e] rounded-xl w-full max-w-md p-5 shadow-[6px_6px_0_#000000] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-[#1a1a2e] pb-3 mb-4 select-none">
              <h3 className="font-['Press_Start_2P'] text-[#FFD700] text-[9px] tracking-wide uppercase">
                ⚔️ ADD NEW ADVENTURE
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError(null);
                  setImagePreview(null);
                  setImageFile(null);
                }}
                className="font-['Press_Start_2P'] text-white/45 text-[9px] hover:text-[#FF69B4]"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleAddChapterSubmit} className="space-y-4">
              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                  JUDUL PETUALANGAN
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kencan Pertama, Berjalan di Taman, dll..."
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                    TANGGAL
                  </label>
                  <input
                    type="text"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    placeholder="Juni 2024"
                    className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-['Press_Start_2P'] text-[8px] text-[#FFD700] mb-2 tracking-wide">
                    ACHIEVEMENT
                  </label>
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => setAchievement(e.target.value)}
                    placeholder="First Date Unlocked!"
                    className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FFD700] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                  DESKRIPSI SINGKAT
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Hari di mana kita pertama kali bertemu..."
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FFD700] mb-2 tracking-wide">
                  CERITA DETAIL
                </label>
                <textarea
                  rows={3}
                  required
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Ceritakan momen indah ini secara lengkap..."
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FFD700] resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                  FOTO MEMORI (OPSIONAL)
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-4 bg-black/20 hover:border-[#FF69B4]/50 transition-colors relative min-h-[100px]">
                  {imagePreview ? (
                    <div className="relative w-full h-32">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl mb-1 select-none">📸</span>
                      <span className="font-['VT323'] text-sm text-white/40 mb-1 select-none">Klik untuk upload foto highlight</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl px-3 py-2">
                  <p className="font-['VT323'] text-red-400 text-sm">⚠ {error}</p>
                </div>
              )}

              <PixelButton
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                size="sm"
                className="w-full text-[9px] py-3.5 mt-2"
              >
                {isSubmitting ? 'MENYIMPAN KISAH...' : '▶ TAMBAH PETUALANGAN'}
              </PixelButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;