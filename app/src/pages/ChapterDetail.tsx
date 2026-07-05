import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DialogBox } from '@/components/custom/DialogBox';
import { PixelButton } from '@/components/custom/PixelButton';
import { getChapterById, deleteChapter, getChapters } from '@/lib/db';
import type { Chapter } from '@/types';

const ChapterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chaptersList, setChaptersList] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAchievement, setShowAchievement] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Chapter dan List Chapters
  const loadChapterData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const allChapters = await getChapters();
      setChaptersList(allChapters);

      const ch = await getChapterById(Number(id));
      setChapter(ch);
    } catch (err) {
      console.error('Error load chapter detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadChapterData();
  }, [id]);

  const photos = useMemo(() => chapter?.photos ?? [], [chapter]);

  useEffect(() => {
    if (activePhotoIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePhotoIndex(null);
      }

      if (event.key === 'ArrowRight' && photos.length > 0) {
        setActivePhotoIndex((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % photos.length;
        });
      }

      if (event.key === 'ArrowLeft' && photos.length > 0) {
        setActivePhotoIndex((prev) => {
          if (prev === null) return 0;
          return prev === 0 ? photos.length - 1 : prev - 1;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, photos.length]);

  useEffect(() => {
    if (activePhotoIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [activePhotoIndex]);

  // Hapus Chapter
  const handleDelete = async () => {
    if (!chapter) return;
    if (!window.confirm('Apakah kamu yakin ingin menghapus kisah petualangan ini dari ingatan kita? 😢')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteChapter(chapter.id);
      navigate('/timeline');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus kisah. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0a18] flex items-center justify-center">
        <p className="font-['Press_Start_2P'] text-xs text-[#ff69b4] animate-pulse font-bold">
          MEMBACA CATATAN KISAH...
        </p>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-[#0c0a18] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-['Press_Start_2P'] text-lg md:text-2xl text-white mb-4 font-bold">
            Kisah Tidak Ditemukan
          </h1>
          <PixelButton onClick={() => navigate('/timeline')}>
            KEMBALI KE TIMELINE
          </PixelButton>
        </div>
      </div>
    );
  }

  const currentIndex = chaptersList.findIndex((item) => item.id === chapter.id);
  const prevChapter = currentIndex > 0 ? chaptersList[currentIndex - 1] : null;
  const nextChapter = currentIndex < chaptersList.length - 1 ? chaptersList[currentIndex + 1] : null;

  const currentPhoto = activePhotoIndex !== null ? photos[activePhotoIndex] : null;

  return (
    <div className="min-h-screen bg-[#0c0a18] text-white">
      {/* Header Sticky */}
      <div className="bg-[#121224]/90 backdrop-blur-sm border-b-4 border-[#000000] p-4 sticky top-0 z-30">
        <div className="flex justify-between items-center max-w-6xl mx-auto gap-4">
          <PixelButton onClick={() => navigate('/timeline')} variant="secondary" size="sm">
            ← TIMELINE
          </PixelButton>

          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-sm text-white font-bold">
              MONTH {chapter.month}
            </h1>
            <p className="font-['VT323'] text-sm text-[#a0a0b0] mt-1 font-semibold">
              {currentIndex + 1} / {chaptersList.length}
            </p>
          </div>

          <PixelButton
            onClick={handleDelete}
            variant="secondary"
            size="sm"
            disabled={isDeleting}
            className="hover:bg-red-600/20 border-[#000000] text-red-500/90"
          >
            {isDeleting ? 'MENGHAPUS...' : '🗑 HAPUS'}
          </PixelButton>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8 select-none">
          <h2 className="font-['Press_Start_2P'] text-lg md:text-2xl text-white mb-2 leading-relaxed drop-shadow-[2px_2px_0_#ff69b4] font-bold">
            {chapter.title}
          </h2>
          <p className="font-['VT323'] text-lg text-[#a0a0b0] font-semibold">
            {chapter.date}
          </p>
        </div>

        <div className="relative mb-8 group">
          <div className="relative border-4 border-[#000000] overflow-hidden rounded-xl shadow-[4px_4px_0_#000000]">
            <img
              src={chapter.image}
              alt={chapter.title}
              className="w-full h-72 md:h-[30rem] object-cover pixel-art transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-x-0 bottom-0 bg-black/75 p-5">
              <div className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffb300] mb-2 font-bold">
                KISAH UTAMA
              </div>
              <p className="font-['VT323'] text-lg md:text-xl text-white leading-snug font-semibold">
                {chapter.description || 'Satu lagi potongan kisah dari perjalanan kita.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={[
              'absolute -top-4 -right-3 md:-right-4',
              'bg-[#ffb300] border-4 border-[#000000]',
              'p-3 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-[2.5px_2.5px_0_#000000]',
              showAchievement ? 'animate-bounce' : '',
            ].join(' ')}
            onClick={() => setShowAchievement((prev) => !prev)}
          >
            <img
              src="/images/sprites/star.png"
              alt="Achievement"
              className="w-8 h-8 pixel-art"
              onError={(e) => {
                // Fallback if sprite not found
                e.currentTarget.src = "/images/ui/star-icon.png";
              }}
            />
          </button>
        </div>

        {showAchievement && (
          <div className="mb-6 p-4 bg-[#ffb300]/15 border-2 border-[#000000] rounded-xl shadow-[3px_3px_0_#000000]">
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">⭐</span>
              <div>
                <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffb300] mb-1 font-bold">
                  PENCAPAIAN KITA
                </p>
                <p className="font-['VT323'] text-white text-lg leading-snug font-semibold">
                  {chapter.achievement}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-8">
          <div className="bg-[#121224] border-4 border-[#000000] rounded-xl p-4 md:p-5 shadow-[4px_4px_0_#000000]">
            <div className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ff69b4] mb-4 font-bold">
              STORY MODE
            </div>
            <DialogBox text={chapter.story} />
          </div>

          <div className="bg-[#121224] border-4 border-[#000000] rounded-xl p-4 md:p-5 shadow-[4px_4px_0_#000000] text-white">
            <div className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#00ffff] mb-4 font-bold">
              CHAPTER INFO
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-[#1a1a2e]/60 border border-[#000000]/30 p-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#a0a0b0]/60 mb-2 font-bold">
                  STATUS
                </div>
                <p className="font-['VT323'] text-xl text-white font-semibold">
                  Completed
                </p>
              </div>

              <div className="rounded-lg bg-[#1a1a2e]/60 border border-[#000000]/30 p-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#a0a0b0]/60 mb-2 font-bold">
                  DATE
                </div>
                <p className="font-['VT323'] text-xl text-white font-semibold">
                  {chapter.date}
                </p>
              </div>

              <div className="rounded-lg bg-[#1a1a2e]/60 border border-[#000000]/30 p-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#a0a0b0]/60 mb-2 font-bold">
                  MOMENT
                </div>
                <p className="font-['VT323'] text-lg text-white/85 leading-snug font-semibold">
                  {chapter.description || 'Bagian penting dari perjalanan kita.'}
                </p>
              </div>

              {nextChapter && (
                <div className="rounded-lg bg-[#1a1a2e]/60 border border-[#000000]/30 p-3">
                  <div className="font-['Press_Start_2P'] text-[10px] text-[#a0a0b0]/60 mb-2 font-bold">
                    NEXT CHAPTER
                  </div>
                  <p className="font-['VT323'] text-lg text-white leading-snug font-semibold">
                    {nextChapter.title}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4 select-none">
              <h3 className="font-['Press_Start_2P'] text-xs md:text-sm text-white font-bold">
                MEMORIES
              </h3>
              <span className="font-['VT323'] text-base text-[#a0a0b0]">
                {photos.length} foto
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className="group relative overflow-hidden rounded-xl border-4 border-[#000000] bg-[#121224] shadow-[4px_4px_0_#000000]"
                  onClick={() => setActivePhotoIndex(index)}
                >
                  <img
                    src={photo.src}
                    alt={photo.caption || `${chapter.title} ${index + 1}`}
                    className="w-full aspect-square object-cover pixel-art transition-transform duration-500 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300" />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3">
                    <p className="font-['VT323'] text-white text-base leading-snug text-left font-semibold">
                      {photo.caption || 'Klik untuk melihat lebih besar'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-4 pt-2">
          {prevChapter ? (
            <PixelButton
              onClick={() => navigate(`/chapter/${prevChapter.id}`)}
              variant="secondary"
              size="sm"
            >
              ← PREV
            </PixelButton>
          ) : (
            <div className="w-24" />
          )}

          <PixelButton
            onClick={() => navigate('/timeline')}
            variant="secondary"
            size="sm"
          >
            TIMELINE
          </PixelButton>

          {nextChapter ? (
            <PixelButton
              onClick={() => navigate(`/chapter/${nextChapter.id}`)}
              size="sm"
            >
              NEXT →
            </PixelButton>
          ) : (
            <div className="w-24" />
          )}
        </div>
      </div>

      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          onClick={() => setActivePhotoIndex(null)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhotoIndex(null)}
              className="absolute -top-12 right-0 font-['Press_Start_2P'] text-xs text-white/80 hover:text-white font-bold"
            >
              CLOSE ✕
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActivePhotoIndex((prev) => (prev === null ? 0 : prev === 0 ? photos.length - 1 : prev - 1))}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 border border-white/20 text-white text-xl"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => setActivePhotoIndex((prev) => (prev === null ? 0 : (prev + 1) % photos.length))}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 border border-white/20 text-white text-xl"
                >
                  ›
                </button>
              </>
            )}

            <div className="rounded-2xl overflow-hidden border-4 border-[#000000] bg-[#121224] shadow-[6px_6px_0_#000000]">
              <img
                src={currentPhoto.src}
                alt={currentPhoto.caption || chapter.title}
                className="w-full max-h-[72vh] object-contain bg-[#0c0a18]"
              />

              <div className="px-4 md:px-6 py-4 border-t border-white/10">
                <div className="flex items-center justify-between gap-4 select-none">
                  <div>
                    <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffb300] mb-2 font-bold">
                      MEMORY {activePhotoIndex !== null ? activePhotoIndex + 1 : 1}
                    </p>
                    <p className="font-['VT323'] text-lg md:text-xl text-white leading-snug font-semibold">
                      {currentPhoto.caption || chapter.title}
                    </p>
                  </div>

                  <div className="hidden md:block font-['VT323'] text-lg text-[#a0a0b0]">
                    ESC untuk tutup
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterDetail;