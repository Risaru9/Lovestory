import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { chapters } from '@/lib/chapter-data';
import {
  getCompletedChapterIds,
  getUnlockedChapterIdsInOrder,
  JOURNEY_PROGRESS_EVENT,
} from '@/lib/progress';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
}

const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>(() => getCompletedChapterIds());

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
  }, []);

  const orderedChapterIds = useMemo(() => chapters.map((chapter) => chapter.id), []);
  const unlockedIds = useMemo(
    () => getUnlockedChapterIdsInOrder(orderedChapterIds, completedIds),
    [orderedChapterIds, completedIds]
  );

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const timelineChapters = useMemo(
    () =>
      chapters.map((chapter) => ({
        ...chapter,
        completed: completedSet.has(chapter.id),
        unlocked: unlockedSet.has(chapter.id),
      })),
    [completedSet, unlockedSet]
  );

  const completedCount = timelineChapters.filter((chapter) => chapter.completed).length;
  const completionProgress =
    timelineChapters.length > 0 ? completedCount / timelineChapters.length : 0;

  const activeChapterIndex = Math.min(
    timelineChapters.length - 1,
    Math.round(scrollProgress * Math.max(timelineChapters.length - 1, 0))
  );

  const nextTargetChapter =
    timelineChapters.find((chapter) => chapter.unlocked && !chapter.completed) ?? null;

  const lastCompletedChapter =
    [...timelineChapters].reverse().find((chapter) => chapter.completed) ?? null;

  const continueTarget = nextTargetChapter ?? lastCompletedChapter ?? timelineChapters[0] ?? null;

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
    chapter: (typeof timelineChapters)[number],
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const element = event.currentTarget;

    if (!chapter.unlocked) {
      element.classList.add('shake');
      window.setTimeout(() => element.classList.remove('shake'), 450);
      return;
    }

    spawnConfettiFromElement(element);

    window.setTimeout(() => {
      navigate(`/chapter/${chapter.id}`);
    }, 220);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col">
      <div className="bg-[#1A1A2E]/90 backdrop-blur-sm border-b-4 border-[#FF69B4] p-4 z-30">
        <div className="flex justify-between items-center max-w-6xl mx-auto gap-4">
          <div>
            <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
              JOURNEY MAP
            </h1>
            <p className="font-['VT323'] text-sm text-white/70 mt-1">
              {completedCount}/{timelineChapters.length} chapter selesai
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0F1020]/80 border border-[#FFD700]/40 rounded-md">
              <span className="font-['VT323'] text-[#FFD700] text-sm md:text-base">
                Progress
              </span>
              <span className="font-['Press_Start_2P'] text-[10px] text-white">
                {Math.round(completionProgress * 100)}%
              </span>
            </div>

            {continueTarget && (
              <PixelButton onClick={() => navigate(`/chapter/${continueTarget.id}`)} size="sm">
                {nextTargetChapter ? 'CONTINUE' : 'REPLAY'}
              </PixelButton>
            )}

            <PixelButton onClick={() => navigate('/achievements')} variant="secondary" size="sm">
              ACHIEVE
            </PixelButton>

            <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
              MENU
            </PixelButton>
          </div>
        </div>
      </div>

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

        <div className="relative z-10 min-h-[200vh] py-10 md:py-12 px-4">
          <div className="max-w-4xl mx-auto relative">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="font-['Press_Start_2P'] text-lg md:text-2xl text-[#FFD700] mb-3">
                OUR ADVENTURE
              </h2>
              <p className="font-['VT323'] text-lg text-white/85">
                {timelineChapters.length} bab perjalanan kita
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-10">
              <div className="bg-[#111327]/80 border border-[#FF69B4]/40 rounded-xl px-4 py-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#FFD700] mb-2">
                  COMPLETED
                </div>
                <div className="font-['VT323'] text-2xl text-white">
                  {completedCount} / {timelineChapters.length}
                </div>
              </div>

              <div className="bg-[#111327]/80 border border-[#00FFFF]/30 rounded-xl px-4 py-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#00FFFF] mb-2">
                  NEXT TARGET
                </div>
                <div className="font-['VT323'] text-lg text-white leading-tight">
                  {nextTargetChapter ? nextTargetChapter.title : 'Semua chapter sudah selesai'}
                </div>
              </div>

              <div className="bg-[#111327]/80 border border-[#32CD32]/30 rounded-xl px-4 py-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#32CD32] mb-2">
                  CURRENT ERA
                </div>
                <div className="font-['VT323'] text-lg text-white leading-tight">
                  {timelineChapters[activeChapterIndex]?.title ?? 'Perjalanan dimulai'}
                </div>
              </div>

              <div className="bg-[#111327]/80 border border-[#FFD700]/30 rounded-xl px-4 py-3">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#FFD700] mb-2">
                  ACHIEVEMENTS
                </div>
                <div className="font-['VT323'] text-2xl text-white">
                  {completedCount}
                </div>
              </div>
            </div>

            <div className="absolute left-1/2 top-[17rem] md:top-[15rem] bottom-28 w-[6px] bg-white/10 rounded-full -translate-x-1/2" />
            <div
              className="absolute left-1/2 top-[17rem] md:top-[15rem] w-[6px] bg-gradient-to-b from-[#FFD700] via-[#FF69B4] to-[#00FFFF] rounded-full -translate-x-1/2 transition-all duration-300"
              style={{ height: progressHeight }}
            />

            <div
              className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-300"
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
              {timelineChapters.map((chapter, index) => {
                const isReached = index <= activeChapterIndex;
                const isEven = index % 2 === 0;
                const isNextTarget = nextTargetChapter?.id === chapter.id;

                return (
                  <div
                    key={chapter.id}
                    className={`flex items-center gap-5 md:gap-8 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div className={`flex-1 ${isEven ? 'text-right' : 'text-left'}`}>
                      <div
                        className={[
                          'inline-block w-full max-w-[280px] md:max-w-sm rounded-xl px-4 py-4 cursor-pointer transition-all duration-300',
                          chapter.unlocked
                            ? 'bg-[#111327]/82 border-2 border-[#FF69B4]/75 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(255,105,180,0.35)]'
                            : 'bg-[#161616]/70 border-2 border-gray-600 cursor-not-allowed opacity-80',
                          isReached ? 'ring-2 ring-[#FFD700]/30' : '',
                          isNextTarget ? 'shadow-[0_0_20px_rgba(0,255,255,0.15)]' : '',
                        ].join(' ')}
                        onClick={(event) => handleChapterClick(chapter, event)}
                      >
                        <div
                          className={`flex items-center gap-2 mb-2 ${isEven ? 'justify-end' : 'justify-start'}`}
                        >
                          <span className="font-['Press_Start_2P'] text-[10px] text-[#FFD700]">
                            MONTH {chapter.month}
                          </span>

                          {isNextTarget && (
                            <span className="font-['VT323'] text-sm text-[#00FFFF]">
                              • next target
                            </span>
                          )}

                          {!isNextTarget && isReached && (
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

                        <div className={`mt-3 flex ${isEven ? 'justify-end' : 'justify-start'}`}>
                          {chapter.completed ? (
                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-[#32CD32]/15 border border-[#32CD32]/40">
                              <span className="text-[#32CD32] text-sm">✓</span>
                              <span className="font-['VT323'] text-sm text-[#32CD32]">
                                Completed
                              </span>
                            </div>
                          ) : chapter.unlocked ? (
                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/5 border border-white/10">
                              <span className="text-white/70 text-sm">○</span>
                              <span className="font-['VT323'] text-sm text-white/70">
                                Siap dimainkan
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/5 border border-white/10">
                              <span className="text-white/70 text-sm">🔒</span>
                              <span className="font-['VT323'] text-sm text-white/70">
                                Terkunci
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={[
                        'relative w-14 h-14 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300 shrink-0',
                        chapter.unlocked
                          ? chapter.completed
                            ? 'bg-[#FFD700] border-[#FFD700] shadow-[0_0_22px_rgba(255,215,0,0.55)]'
                            : isNextTarget
                              ? 'bg-[#00B7FF] border-[#00FFFF] shadow-[0_0_24px_rgba(0,255,255,0.35)]'
                              : 'bg-[#FF69B4] border-[#FF69B4]'
                          : 'bg-gray-700 border-gray-600',
                        isReached ? 'scale-110' : 'scale-100',
                      ].join(' ')}
                    >
                      {isReached && chapter.unlocked && (
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
                      )}

                      {chapter.unlocked ? (
                        chapter.completed ? (
                          <span className="text-[#1A1A2E] text-xl">★</span>
                        ) : (
                          <span className="text-white text-base font-bold">{chapter.month}</span>
                        )
                      ) : (
                        <img
                          src="/images/ui/lock-icon.png"
                          alt="Locked"
                          className="w-6 h-6 pixel-art"
                        />
                      )}
                    </div>

                    <div className="flex-1" />
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFD700] rounded-full shadow-[0_0_35px_rgba(255,215,0,0.4)] animate-pulse">
                <span className="text-4xl">🏆</span>
              </div>
              <p className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#FFD700] mt-4">
                TO BE CONTINUED...
              </p>
            </div>
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
    </div>
  );
};

export default Timeline;