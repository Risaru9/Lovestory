import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Lock,
  Sparkles,
  CheckCircle2,
  Star,
  ArrowRight,
} from 'lucide-react';

import { PixelButton } from '@/components/custom/PixelButton';
import { chapters } from '@/lib/chapter-data';
import {
  getCompletedChapterIds,
  getUnlockedChapterIdsInOrder,
  JOURNEY_PROGRESS_EVENT,
} from '@/lib/progress';

type AchievementFilter = 'all' | 'unlocked' | 'locked' | 'completed';
type AchievementRarity = 'common' | 'rare' | 'legendary';

interface AchievementItem {
  id: number;
  month: number;
  title: string;
  date: string;
  description: string;
  achievement: string;
  image: string;
  unlocked: boolean;
  completed: boolean;
  rarity: AchievementRarity;
  previousChapterTitle: string | null;
}

const FILTERS: Array<{
  value: AchievementFilter;
  label: string;
}> = [
  { value: 'all', label: 'ALL' },
  { value: 'unlocked', label: 'UNLOCKED' },
  { value: 'completed', label: 'COMPLETED' },
  { value: 'locked', label: 'LOCKED' },
];

const getAchievementRarity = (
  index: number,
  total: number
): AchievementRarity => {
  const ratio = (index + 1) / total;

  if (ratio <= 0.35) return 'common';
  if (ratio <= 0.75) return 'rare';
  return 'legendary';
};

const rarityStyles: Record<
  AchievementRarity,
  {
    border: string;
    glow: string;
    badge: string;
    label: string;
  }
> = {
  common: {
    border: 'border-white/15',
    glow: 'shadow-[0_0_18px_rgba(255,255,255,0.04)]',
    badge: 'bg-white/10 text-white/80 border border-white/10',
    label: 'COMMON',
  },
  rare: {
    border: 'border-[#00FFFF]/30',
    glow: 'shadow-[0_0_22px_rgba(0,255,255,0.10)]',
    badge: 'bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20',
    label: 'RARE',
  },
  legendary: {
    border: 'border-[#FFD700]/35',
    glow: 'shadow-[0_0_24px_rgba(255,215,0,0.12)]',
    badge: 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20',
    label: 'LEGENDARY',
  },
};

const Achievements: React.FC = () => {
  const navigate = useNavigate();

  const [completedIds, setCompletedIds] = useState<number[]>(() => getCompletedChapterIds());
  const [activeFilter, setActiveFilter] = useState<AchievementFilter>('all');

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

  const orderedChapterIds = useMemo(() => chapters.map((chapter) => chapter.id), []);
  const unlockedIds = useMemo(
    () => getUnlockedChapterIdsInOrder(orderedChapterIds, completedIds),
    [orderedChapterIds, completedIds]
  );

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const achievementItems: AchievementItem[] = useMemo(() => {
    return chapters.map((chapter, index) => ({
      id: chapter.id,
      month: chapter.month,
      title: chapter.title,
      date: chapter.date,
      description: chapter.description,
      achievement: chapter.achievement,
      image: chapter.image,
      unlocked: unlockedSet.has(chapter.id),
      completed: completedSet.has(chapter.id),
      rarity: getAchievementRarity(index, chapters.length),
      previousChapterTitle: index > 0 ? chapters[index - 1].title : null,
    }));
  }, [completedSet, unlockedSet]);

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'unlocked':
        return achievementItems.filter((item) => item.unlocked);
      case 'completed':
        return achievementItems.filter((item) => item.completed);
      case 'locked':
        return achievementItems.filter((item) => !item.unlocked);
      default:
        return achievementItems;
    }
  }, [achievementItems, activeFilter]);

  const totalCount = achievementItems.length;
  const unlockedCount = achievementItems.filter((item) => item.unlocked).length;
  const completedCount = achievementItems.filter((item) => item.completed).length;

  const nextTarget =
    achievementItems.find((item) => item.unlocked && !item.completed) ?? null;

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      <div className="sticky top-0 z-30 bg-[#1A1A2E]/90 backdrop-blur-sm border-b-4 border-[#FF69B4] p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/timeline')} variant="secondary" size="sm">
            ← TIMELINE
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-sm md:text-lg text-white">
              ACHIEVEMENTS
            </h1>
            <p className="font-['VT323'] text-sm md:text-base text-white/60 mt-1">
              Koleksi pencapaian perjalanan kita
            </p>
          </div>

          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            MENU
          </PixelButton>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <section className="mb-8 rounded-2xl border border-[#FF69B4]/25 bg-[#111327]/90 p-5 md:p-6 shadow-[0_0_24px_rgba(255,105,180,0.08)]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-1 mb-4">
                <Trophy className="w-4 h-4 text-[#FFD700]" />
                <span className="font-['VT323'] text-lg text-[#FFD700]">
                  Journey Rewards
                </span>
              </div>

              <h2 className="font-['Press_Start_2P'] text-lg md:text-2xl text-white leading-relaxed">
                Setiap chapter punya pencapaiannya sendiri
              </h2>

              <p className="font-['VT323'] text-xl text-white/70 mt-4 leading-snug max-w-3xl">
                Halaman ini menampilkan semua achievement yang sudah kamu buka,
                yang sudah selesai, dan yang masih terkunci. Semakin jauh perjalananmu,
                semakin spesial pencapaiannya.
              </p>

              {nextTarget && (
                <div className="mt-5 rounded-xl border border-[#00FFFF]/20 bg-[#00FFFF]/8 px-4 py-3">
                  <div className="font-['Press_Start_2P'] text-[10px] text-[#00FFFF] mb-2">
                    NEXT TARGET
                  </div>
                  <div className="font-['VT323'] text-xl text-white">
                    {nextTarget.achievement}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="font-['Press_Start_2P'] text-[10px] text-white/50 mb-2">
                  TOTAL
                </div>
                <div className="font-['VT323'] text-3xl text-white">
                  {totalCount}
                </div>
              </div>

              <div className="rounded-xl border border-[#00FFFF]/20 bg-[#00FFFF]/8 px-4 py-4">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#00FFFF] mb-2">
                  UNLOCKED
                </div>
                <div className="font-['VT323'] text-3xl text-white">
                  {unlockedCount}
                </div>
              </div>

              <div className="rounded-xl border border-[#32CD32]/20 bg-[#32CD32]/8 px-4 py-4">
                <div className="font-['Press_Start_2P'] text-[10px] text-[#32CD32] mb-2">
                  COMPLETED
                </div>
                <div className="font-['VT323'] text-3xl text-white">
                  {completedCount}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 flex flex-wrap gap-3">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={[
                  'px-4 py-3 rounded-xl border transition-all duration-200',
                  'font-["Press_Start_2P"] text-[10px] md:text-xs',
                  isActive
                    ? 'bg-[#FF69B4] border-[#FF69B4] text-white shadow-[0_0_16px_rgba(255,105,180,0.18)]'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                {filter.label}
              </button>
            );
          })}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const rarity = rarityStyles[item.rarity];

            return (
              <div
                key={item.id}
                className={[
                  'rounded-2xl border bg-[#111327]/90 overflow-hidden transition-all duration-300',
                  rarity.border,
                  rarity.glow,
                ].join(' ')}
              >
                <div className="relative h-52 overflow-hidden border-b border-white/10 bg-black">
                  <img
                    src={item.image}
                    alt={item.title}
                    className={[
                      'w-full h-full object-cover transition-all duration-500',
                      item.unlocked ? 'opacity-100 scale-100' : 'opacity-40 scale-[1.02] grayscale',
                    ].join(' ')}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-['Press_Start_2P'] ${rarity.badge}`}>
                      {rarity.label}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    {item.completed ? (
                      <div className="flex items-center gap-1 rounded-full border border-[#32CD32]/25 bg-[#32CD32]/10 px-3 py-1">
                        <CheckCircle2 className="w-4 h-4 text-[#32CD32]" />
                        <span className="font-['VT323'] text-base text-[#32CD32]">
                          Completed
                        </span>
                      </div>
                    ) : item.unlocked ? (
                      <div className="flex items-center gap-1 rounded-full border border-[#00FFFF]/25 bg-[#00FFFF]/10 px-3 py-1">
                        <Sparkles className="w-4 h-4 text-[#00FFFF]" />
                        <span className="font-['VT323'] text-base text-[#00FFFF]">
                          Unlocked
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/35 px-3 py-1">
                        <Lock className="w-4 h-4 text-white/75" />
                        <span className="font-['VT323'] text-base text-white/75">
                          Locked
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="font-['Press_Start_2P'] text-[10px] text-[#FFD700] mb-2">
                      MONTH {item.month}
                    </div>
                    <h3 className="font-['VT323'] text-2xl text-white leading-tight">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-3">
                    <div className="font-['Press_Start_2P'] text-[10px] text-white/50 mb-2">
                      ACHIEVEMENT
                    </div>
                    <p className="font-['VT323'] text-xl text-white leading-snug">
                      {item.achievement}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="font-['Press_Start_2P'] text-[10px] text-white/50 mb-2">
                      DATE
                    </div>
                    <p className="font-['VT323'] text-lg text-white/75">
                      {item.date}
                    </p>
                  </div>

                  <div className="mb-5">
                    <div className="font-['Press_Start_2P'] text-[10px] text-white/50 mb-2">
                      DETAIL
                    </div>
                    {item.unlocked ? (
                      <p className="font-['VT323'] text-lg text-white/75 leading-snug">
                        {item.description || 'Achievement ini terbuka sebagai bagian dari perjalananmu.'}
                      </p>
                    ) : (
                      <p className="font-['VT323'] text-lg text-white/55 leading-snug">
                        Selesaikan{' '}
                        <span className="text-[#FFD700]">
                          {item.previousChapterTitle ?? 'chapter sebelumnya'}
                        </span>{' '}
                        untuk membuka achievement ini.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#FFD700]" />
                      <span className="font-['VT323'] text-lg text-white/70">
                        {item.completed ? 'Reward collected' : item.unlocked ? 'Ready to claim' : 'Still locked'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!item.unlocked}
                      onClick={() => navigate(`/chapter/${item.id}`)}
                      className={[
                        'inline-flex items-center gap-2 rounded-xl px-4 py-2 transition-all duration-200',
                        'font-["Press_Start_2P"] text-[10px]',
                        item.unlocked
                          ? 'bg-[#FF69B4] text-white hover:bg-[#ff58ae]'
                          : 'bg-white/5 text-white/30 cursor-not-allowed',
                      ].join(' ')}
                    >
                      OPEN
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="w-14 h-14 text-white/20 mx-auto mb-4" />
            <p className="font-['Press_Start_2P'] text-sm text-white/40 mb-2">
              NO ACHIEVEMENTS FOUND
            </p>
            <p className="font-['VT323'] text-xl text-white/30">
              Coba ubah filternya
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;