import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DialogBox } from '@/components/custom/DialogBox';
import { PixelButton } from '@/components/custom/PixelButton';
import { chapters, getChapterById } from '@/lib/chapter-data';
import {
  getCompletedChapterIds,
  getUnlockedChapterIdsInOrder,
  isChapterUnlocked,
  JOURNEY_PROGRESS_EVENT,
  markChapterAsCompleted,
} from '@/lib/progress';

const ChapterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const chapter = getChapterById(Number(id));

  const [completedIds, setCompletedIds] = useState<number[]>(() => getCompletedChapterIds());
  const [showAchievement, setShowAchievement] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const orderedChapterIds = useMemo(() => chapters.map((item) => item.id), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    const syncProgress = () => {
      setCompletedIds(getCompletedChapterIds());
    };

    window.addEventListener('focus', syncProgress);
    window.addEventListener('storage', syncProgress);
    window.addEventListener(JOURNEY_PROGRESS_EVENT, syncProgress as EventListener);

    return () => {
      window.removeEventListener('focus', syncProgress);
      window.removeEventListener('storage', syncProgress);
      window.removeEventListener(JOURNEY_PROGRESS_EVENT, syncProgress as EventListener);
    };
  }, []);

  const unlockedIds = useMemo(
    () => getUnlockedChapterIdsInOrder(orderedChapterIds, completedIds),
    [orderedChapterIds, completedIds]
  );

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const photos = useMemo(() => chapter?.photos ?? [], [chapter]);

  useEffect(() => {
    if (!chapter) return;

    const currentCompletedIds = getCompletedChapterIds();
    const unlocked = isChapterUnlocked(orderedChapterIds, chapter.id, currentCompletedIds);

    if (!unlocked) return;
    if (currentCompletedIds.includes(chapter.id)) return;

    markChapterAsCompleted(chapter.id);
  }, [chapter?.id, orderedChapterIds]);

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

  if (!chapter) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-['Press_Start_2P'] text-lg md:text-2xl text-white mb-4">
            Chapter Not Found
          </h1>
          <PixelButton onClick={() => navigate('/timeline')}>
            BACK TO TIMELINE
          </PixelButton>
        </div>
      </div>
    );
  }

  const currentIndex = chapters.findIndex((item) => item.id === chapter.id);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const chapterUnlocked = unlockedSet.has(chapter.id);
  const chapterCompleted = completedSet.has(chapter.id);
  const nextChapterUnlocked = nextChapter ? unlockedSet.has(nextChapter.id) : false;

  const currentPhoto = activePhotoIndex !== null ? photos[activePhotoIndex] : null;
  const previousRequiredChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;

  if (!chapterUnlocked) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center px-4">
        <div className="max-w-xl w-full text-center bg-[#111327]/90 border-2 border-[#FF69B4]/40 rounded-2xl p-6 md:p-8 shadow-[0_0_24px_rgba(255,105,180,0.15)]">
          <div className="text-5xl mb-4">🔒</div>

          <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white leading-relaxed mb-4">
            CHAPTER MASIH TERKUNCI
          </h1>

          <p className="font-['VT323'] text-xl text-white/75 leading-snug mb-6">
            Selesaikan chapter sebelumnya terlebih dahulu untuk membuka{' '}
            <span className="text-[#FFD700]">{chapter.title}</span>.
          </p>

          {previousRequiredChapter && (
            <div className="mb-6 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div className="font-['Press_Start_2P'] text-[10px] text-[#00FFFF] mb-2">
                REQUIRED CHAPTER
              </div>
              <div className="font-['VT323'] text-xl text-white">
                {previousRequiredChapter.title}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <PixelButton onClick={() => navigate('/timeline')} size="sm">
              BACK TO TIMELINE
            </PixelButton>
          </div>
        </div>
      </div>
    );
  }

  const openPhoto = (index: number) => {
    setActivePhotoIndex(index);
  };

  const closePhoto = () => {
    setActivePhotoIndex(null);
  };

  const showPrevPhoto = () => {
    if (photos.length === 0) return;
    setActivePhotoIndex((prev) => {
      if (prev === null) return 0;
      return prev === 0 ? photos.length - 1 : prev - 1;
    });
  };

  const showNextPhoto = () => {
    if (photos.length === 0) return;
    setActivePhotoIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % photos.length;
    });
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      <div className="bg-[#1A1A2E]/90 backdrop-blur-sm border-b-4 border-[#FF69B4] p-4 sticky top-0 z-30">
        <div className="flex justify-between items-center max-w-6xl mx-auto gap-4">
          <PixelButton onClick={() => navigate('/timeline')} variant="secondary" size="sm">
            ← BACK
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-sm text-white">
              MONTH {chapter.month}
            </h1>
            <p className="font-['VT323'] text-sm text-white/60 mt-1">
              {currentIndex + 1} / {chapters.length}
            </p>
          </div>

          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="font-['Press_Start_2P'] text-lg md:text-2xl text-[#FFD700] mb-2 leading-relaxed">
            {chapter.title}
          </h2>
          <p className="font-['VT323'] text-lg text-white/75">
            {chapter.date}
          </p>
        </div>

        <div className="relative mb-8 group">
          <div className="relative border-4 border-[#FF69B4] overflow-hidden rounded-xl shadow-[0_0_30px_rgba(255,105,180,0.25)]">
            <img
              src={chapter.image}
              alt={chapter.title}
              className="w-full h-72 md:h-[30rem] object-cover pixel-art transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5">
              <div className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#FFD700] mb-2">
                CHAPTER HIGHLIGHT
              </div>
              <p className="font-['VT323'] text-lg md:text-xl text-white leading-snug">
                {chapter.description || 'Satu lagi potongan kisah dari perjalanan kita.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={[
              'absolute -top-4 -right-3 md:-right-4',
              'bg-[#FFD700] border-4 border-[#1A1A2E]',
              'p-3 rounded-full cursor-pointer transition-transform hover:scale-110',
              showAchievement ? 'animate-bounce' : '',
            ].join(' ')}
            onClick={() => setShowAchievement((prev) => !prev)}
          >
            <img
              src="/images/ui/star-icon.png"
              alt="Achievement"
              className="w-8 h-8 pixel-art"
            />
          </button>
        </div>

        {showAchievement && (
          <div className="mb-6 p-4 bg-[#FFD700]/15 border-2 border-[#FFD700] rounded-xl shadow-[0_0_18px_rgba(255,215,0,0.12)]">
            <div className="flex items-center gap-3">
              <img
                src="/images/ui/star-icon.png"
                alt="Star"
                className="w-8 h-8 pixel-art"
              />
              <div>
                <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#FFD700] mb-1">
                  ACHIEVEMENT
                </p>
                <p className="font-['VT323'] text-white text-lg leading-snug">
                  {chapter.achievement}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-8">
          <div className="bg-[#111327]/85 border-2 border-[#FF69B4]/40 rounded-xl p-4 md:p-5 shadow-[0_0_22px_rgba(255,105,180,0.12)]">
            <div className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#FFD700] mb-4">
              STORY MODE
            </div>
            <DialogBox text={chapter.story} />
          </div>

          <div className="bg-[#111327]/85 border-2 border-white/10 rounded-xl p-4 md:p-5">
            <div className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#00FFFF] mb-4">
              CHAPTER INFO
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-white/60 mb-2">
                  STATUS
                </div>
                <p className="font-['VT323'] text-xl text-white">
                  {chapterCompleted ? 'Completed' : 'Unlocked'}
                </p>
              </div>

              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-white/60 mb-2">
                  DATE
                </div>
                <p className="font-['VT323'] text-xl text-white">
                  {chapter.date}
                </p>
              </div>

              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-white/60 mb-2">
                  MOMENT
                </div>
                <p className="font-['VT323'] text-lg text-white/85 leading-snug">
                  {chapter.description || 'Bagian penting dari perjalanan kita.'}
                </p>
              </div>

              {nextChapter && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="font-['Press_Start_2P'] text-[10px] text-white/60 mb-2">
                    NEXT CHAPTER
                  </div>
                  <p className="font-['VT323'] text-lg text-white leading-snug">
                    {nextChapter.title}
                  </p>
                  <p className="font-['VT323'] text-base mt-1 text-white/60">
                    {nextChapterUnlocked ? 'Sudah terbuka' : 'Akan terbuka setelah chapter ini selesai'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-['Press_Start_2P'] text-xs md:text-sm text-white">
                MEMORIES
              </h3>
              <span className="font-['VT323'] text-base text-white/60">
                {photos.length} foto
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className="group relative overflow-hidden rounded-xl border-4 border-[#FF69B4]/55 bg-[#111327] shadow-[0_0_18px_rgba(255,105,180,0.15)]"
                  onClick={() => openPhoto(index)}
                >
                  <img
                    src={photo.src}
                    alt={photo.caption || `${chapter.title} ${index + 1}`}
                    className="w-full aspect-square object-cover pixel-art transition-transform duration-500 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300" />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3">
                    <p className="font-['VT323'] text-white text-base leading-snug text-left">
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
          onClick={closePhoto}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePhoto}
              className="absolute -top-12 right-0 font-['Press_Start_2P'] text-xs text-white/80 hover:text-white"
            >
              CLOSE ✕
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrevPhoto}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 border border-white/20 text-white text-xl"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={showNextPhoto}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 border border-white/20 text-white text-xl"
                >
                  ›
                </button>
              </>
            )}

            <div className="rounded-2xl overflow-hidden border-4 border-[#FF69B4] bg-[#111327] shadow-[0_0_35px_rgba(255,105,180,0.25)]">
              <img
                src={currentPhoto.src}
                alt={currentPhoto.caption || chapter.title}
                className="w-full max-h-[72vh] object-contain bg-[#0b0d18]"
              />

              <div className="px-4 md:px-6 py-4 border-t border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#FFD700] mb-2">
                      MEMORY {activePhotoIndex !== null ? activePhotoIndex + 1 : 1}
                    </p>
                    <p className="font-['VT323'] text-lg md:text-xl text-white leading-snug">
                      {currentPhoto.caption || chapter.title}
                    </p>
                  </div>

                  <div className="hidden md:block font-['VT323'] text-lg text-white/60">
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