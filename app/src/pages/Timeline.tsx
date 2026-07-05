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
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col relative">
      {/* Header */}
      <div className="bg-[#1A1A2E]/90 backdrop-blur-sm border-b-4 border-[#FF69B4] p-4 z-30">
        <div className="flex justify-between items-center max-w-6xl mx-auto gap-4">
          <div>
            <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
              JOURNEY MAP
            </h1>
            <p className="font-['VT323'] text-sm text-white/70 mt-1">
              {completedCount} chapter selesai
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
            <PixelButton onClick={() => setIsModalOpen(true)} size="sm">
              ✨ TAMBAH KISAH
            </PixelButton>

            <PixelButton onClick={() => navigate('/achievements')} variant="secondary" size="sm">
              ACHIEVE
            </PixelButton>

            <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
              MENU
            </PixelButton>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-[#1A1A2E]">
          <p className="font-['Press_Start_2P'] text-xs text-[#FF69B4] animate-pulse">
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
          <div className="absolute inset-0 bg-black/60" />

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

          <div className="relative z-10 min-h-[150vh] py-10 md:py-12 px-4">
            <div className="max-w-4xl mx-auto relative">
              <div className="text-center mb-10 md:mb-14">
                <h2 className="font-['Press_Start_2P'] text-lg md:text-2xl text-[#FFD700] mb-3">
                  OUR ADVENTURE
                </h2>
                <p className="font-['VT323'] text-lg text-white/85">
                  {chaptersList.length} bab kisah petualangan kita
                </p>
              </div>

              {/* Status bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
                <div className="bg-[#111327]/80 border border-[#FF69B4]/40 rounded-xl px-4 py-3">
                  <div className="font-['Press_Start_2P'] text-[10px] text-[#FFD700] mb-2">
                    KISAH KITA
                  </div>
                  <div className="font-['VT323'] text-2xl text-white">
                    {chaptersList.length} Bab Selesai
                  </div>
                </div>

                <div className="bg-[#111327]/80 border border-[#32CD32]/30 rounded-xl px-4 py-3">
                  <div className="font-['Press_Start_2P'] text-[10px] text-[#32CD32] mb-2">
                    KERAJAAN AKTIF
                  </div>
                  <div className="font-['VT323'] text-lg text-white leading-tight">
                    {currentActiveChapter ? currentActiveChapter.title : 'Petualangan Baru'}
                  </div>
                </div>

                <div className="bg-[#111327]/80 border border-[#FFD700]/30 rounded-xl px-4 py-3">
                  <div className="font-['Press_Start_2P'] text-[10px] text-[#FFD700] mb-2">
                    ACHIEVEMENTS UNLOCKED
                  </div>
                  <div className="font-['VT323'] text-2xl text-white">
                    {chaptersList.length}
                  </div>
                </div>
              </div>

              {chaptersList.length === 0 ? (
                <div className="text-center py-20 bg-[#111327]/60 border border-dashed border-white/20 rounded-2xl p-6">
                  <p className="font-['Press_Start_2P'] text-xs text-white/50 mb-4">
                    MAP MASIH KOSONG...
                  </p>
                  <p className="font-['VT323'] text-xl text-white/70 mb-6">
                    Kalian belum menulis kisah perjalanan cinta kalian. <br />
                    Klik tombol di bawah ini untuk memulai petualangan pertama!
                  </p>
                  <PixelButton onClick={() => setIsModalOpen(true)}>
                    ✨ BUAT KISAH PERTAMA
                  </PixelButton>
                </div>
              ) : (
                <>
                  {/* Timeline bar */}
                  <div className="absolute md:left-1/2 left-8 top-[17rem] md:top-[15rem] bottom-28 w-[6px] bg-white/10 rounded-full -translate-x-1/2" />
                  <div
                    className="absolute md:left-1/2 left-8 top-[17rem] md:top-[15rem] w-[6px] bg-gradient-to-b from-[#FFD700] via-[#FF69B4] to-[#00FFFF] rounded-full -translate-x-1/2 transition-all duration-300"
                    style={{ height: progressHeight }}
                  />

                  {/* Character sprite */}
                  <div
                    className="absolute md:left-1/2 left-8 -translate-x-1/2 z-20 transition-all duration-300"
                    style={{ top: `${characterY}%` }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#FFD700]/30 blur-xl rounded-full scale-125" />
                      <img
                        src="/images/sprites/char-boy.png"
                        alt="Player"
                        className="relative w-12 h-12 md:w-14 md:h-14 pixel-art animate-float"
                      />
                    </div>
                  </div>

                  <div className="space-y-14 relative">
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
                                'inline-block w-full max-w-[280px] md:max-w-sm rounded-xl px-4 py-4 cursor-pointer transition-all duration-300 bg-[#111327]/82 border-2 border-[#FF69B4]/75 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(255,105,180,0.35)]',
                                isReached ? 'ring-2 ring-[#FFD700]/30' : '',
                              ].join(' ')}
                              onClick={(event) => handleChapterClick(chapter, event)}
                            >
                              <div
                                className={`flex items-center gap-2 mb-2 ${isEven ? 'md:justify-end' : 'md:justify-start'} justify-start`}
                              >
                                <span className="font-['Press_Start_2P'] text-[10px] text-[#FFD700]">
                                  MONTH {chapter.month}
                                </span>
                                {isReached && (
                                  <span className="font-['VT323'] text-sm text-[#00FFFF]">
                                    • aktif
                                  </span>
                                )}
                              </div>

                              <div className="font-['VT323'] text-xl text-white leading-tight">
                                {chapter.title}
                              </div>

                              <div className="font-['VT323'] text-sm text-white/60 mt-1">
                                {chapter.date}
                              </div>

                              {chapter.description && (
                                <p className="font-['VT323'] text-base text-white/75 mt-2 leading-snug">
                                  {chapter.description}
                                </p>
                              )}

                              <div className={`mt-3 flex ${isEven ? 'md:justify-end' : 'md:justify-start'} justify-start`}>
                                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-[#32CD32]/15 border border-[#32CD32]/40">
                                  <span className="text-[#32CD32] text-sm">✓</span>
                                  <span className="font-['VT323'] text-sm text-[#32CD32]">
                                    Completed
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div
                            className={[
                              'relative w-14 h-14 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300 shrink-0 bg-[#FFD700] border-[#FFD700] shadow-[0_0_22px_rgba(255,215,0,0.55)]',
                              isReached ? 'scale-110' : 'scale-100',
                            ].join(' ')}
                          >
                            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
                            <span className="text-[#1A1A2E] text-xl">★</span>
                          </div>

                          <div className="hidden md:block flex-1" />
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center mt-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFD700] rounded-full shadow-[0_0_35px_rgba(255,215,0,0.4)] animate-pulse">
                      <span className="text-4xl">🏆</span>
                    </div>
                    <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#FFD700] mt-4">
                      KISAH KITA BERLANJUT...
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <style>{`
            @keyframes confetti-fall {
              0% {
                transform: translateY(0) rotate(0deg) scale(1);
                opacity: 1;
              }
              100% {
                transform: translateY(180px) rotate(720deg) scale(0.7);
                opacity: 0;
              }
            }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20% { transform: translateX(-6px); }
              40% { transform: translateX(6px); }
              60% { transform: translateX(-4px); }
              80% { transform: translateX(4px); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
            .shake {
              animation: shake 0.45s ease-in-out;
            }
            .animate-float {
              animation: float 2s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}

      {/* Modal Tambah Kisah Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111327] border-4 border-[#FF69B4] rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(255,105,180,0.4)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Press_Start_2P'] text-[#FFD700] text-[10px] md:text-xs">
                ✨ TAMBAH KISAH PETUALANGAN
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError(null);
                  setImagePreview(null);
                  setImageFile(null);
                }}
                className="font-['Press_Start_2P'] text-[#FF69B4] text-xs hover:brightness-125"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleAddChapterSubmit} className="space-y-4">
              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  JUDUL PETUALANGAN
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kencan Pertama, Berjalan di Taman, dll..."
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                    TANGGAL
                  </label>
                  <input
                    type="text"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    placeholder="Juni 2024"
                    className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4]"
                  />
                </div>

                <div>
                  <label className="block font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-2">
                    ACHIEVEMENT
                  </label>
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => setAchievement(e.target.value)}
                    placeholder="First Kiss Unlocked!"
                    className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FFD700]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  HIGHLIGHT RINGKAS (DESKRIPSI)
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan singkat tentang momen indah ini..."
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  CERITA LENGKAP (STORY MODE)
                </label>
                <textarea
                  required
                  rows={4}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Tulis detail momen manis yang kalian lewati..."
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4] resize-none"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  FOTO MEMORY
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl p-4 bg-black/20 hover:border-[#FF69B4]/50 transition-colors relative">
                  {imagePreview ? (
                    <div className="relative w-full h-40">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border-2 border-[#FF69B4]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl mb-2">📸</span>
                      <span className="font-['VT323'] text-lg text-white/50 mb-2">Klik untuk upload foto highlight</span>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2">
                  <p className="font-['VT323'] text-red-400 text-base">⚠ {error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#FF69B4] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-['Press_Start_2P'] text-[10px] text-white transition-all duration-200 shadow-[0_4px_0px_#c0486f] hover:shadow-[0_2px_0px_#c0486f] hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
              >
                {isSubmitting ? 'MENYIMPAN KISAH...' : '▶ SIMPAN PETUALANGAN'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;