import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle2, Star, ArrowRight } from 'lucide-react';
import { PixelButton } from '@/components/custom/PixelButton';
import { getChapters } from '@/lib/db';
import type { Chapter } from '@/types';

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

const getAchievementRarity = (
  index: number,
  total: number
): AchievementRarity => {
  const ratio = (index + 1) / Math.max(total, 1);

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

  const [chaptersList, setChaptersList] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getChapters();
      setChaptersList(data);
    } catch (err) {
      console.error('Error load achievements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const achievementItems: AchievementItem[] = useMemo(() => {
    return chaptersList.map((chapter, index) => ({
      id: chapter.id,
      month: chapter.month,
      title: chapter.title,
      date: chapter.date,
      description: chapter.description,
      achievement: chapter.achievement,
      image: chapter.image,
      unlocked: true,
      completed: true,
      rarity: getAchievementRarity(index, chaptersList.length),
      previousChapterTitle: index > 0 ? chaptersList[index - 1].title : null,
    }));
  }, [chaptersList]);

  const filteredItems = useMemo(() => {
    return achievementItems; // Semua achievement yang ada adalah unlocked/completed secara default karena buatan sendiri
  }, [achievementItems]);

  const totalCount = achievementItems.length;
  const unlockedCount = achievementItems.length;
  const completedCount = achievementItems.length;

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      {/* Header */}
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
              Koleksi pencapaian kisah petualangan kita
            </p>
          </div>

          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            MENU
          </PixelButton>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-20">
            <p className="font-['Press_Start_2P'] text-xs text-[#FF69B4] animate-pulse">
              MEMBUKA KOTAK PENCAPAIAN...
            </p>
          </div>
        ) : (
          <>
            <section className="mb-8 rounded-2xl border border-[#FF69B4]/25 bg-[#111327]/90 p-5 md:p-6 shadow-[0_0_24px_rgba(255,105,180,0.08)]">
              <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-1 mb-4">
                    <Trophy className="w-4 h-4 text-[#FFD700]" />
                    <span className="font-['VT323'] text-lg text-[#FFD700]">
                      Journey Rewards
                    </span>
                  </div>

                  <h2 className="font-['Press_Start_2P'] text-lg md:text-xl text-white leading-relaxed">
                    Setiap kisah manis adalah pencapaian berharga
                  </h2>

                  <p className="font-['VT323'] text-xl text-white/70 mt-4 leading-snug max-w-3xl">
                    Halaman ini menampilkan seluruh piala pencapaian (achievement) dari kisah petualangan yang telah kalian tulis bersama. Setiap kenangan berhak mendapatkan lencana cintanya masing-masing.
                  </p>
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
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-['Press_Start_2P'] ${rarity.badge}`}>
                          {rarity.label}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1 rounded-full border border-[#32CD32]/25 bg-[#32CD32]/10 px-3 py-1">
                          <CheckCircle2 className="w-4 h-4 text-[#32CD32]" />
                          <span className="font-['VT323'] text-base text-[#32CD32]">
                            Completed
                          </span>
                        </div>
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
                          PENCAPAIAN
                        </div>
                        <p className="font-['VT323'] text-xl text-white leading-snug">
                          {item.achievement}
                        </p>
                      </div>

                      <div className="mb-4">
                        <div className="font-['Press_Start_2P'] text-[10px] text-white/50 mb-2">
                          TANGGAL MENDAPATKAN
                        </div>
                        <p className="font-['VT323'] text-lg text-white/75">
                          {item.date}
                        </p>
                      </div>

                      <div className="mb-5">
                        <div className="font-['Press_Start_2P'] text-[10px] text-white/50 mb-2">
                          HIGHLIGHT MOMEN
                        </div>
                        <p className="font-['VT323'] text-lg text-white/75 leading-snug">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-[#FFD700]" />
                          <span className="font-['VT323'] text-lg text-white/70">
                            Reward Collected
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/chapter/${item.id}`)}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 transition-all duration-200 font-['Press_Start_2P'] text-[10px] bg-[#FF69B4] text-white hover:bg-[#ff58ae]"
                        >
                          BUKA
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
                <p className="font-['Press_Start_2P'] text-[9px] text-white/40 mb-2">
                  BELUM ADA PENCAPAIAN YAK ter-UNLOCK
                </p>
                <p className="font-['VT323'] text-xl text-white/30">
                  Tulis kisah petualangan cinta kalian di timeline untuk memunculkan lencana di sini!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Achievements;