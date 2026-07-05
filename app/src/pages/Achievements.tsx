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
    emoji: string;
  }
> = {
  common: {
    border: 'border-white/10',
    glow: 'hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:border-white/20',
    badge: 'bg-white/10 text-white/80 border border-white/10',
    label: 'COMMON',
    emoji: '🥉',
  },
  rare: {
    border: 'border-[#00FFFF]/20',
    glow: 'hover:shadow-[0_0_20px_rgba(0,255,255,0.08)] hover:border-[#00FFFF]/40',
    badge: 'bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20',
    label: 'RARE',
    emoji: '🥈',
  },
  legendary: {
    border: 'border-[#FFD700]/30',
    glow: 'hover:shadow-[0_0_25px_rgba(255,215,0,0.12)] hover:border-[#FFD700]/50',
    badge: 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20',
    label: 'LEGENDARY',
    emoji: '🥇',
  },
};

const playUnlockSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn("AudioContext blocked or not supported:", e);
  }
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
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] text-white flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-black/60" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#1A1A2E] bg-[#080b18]/90 backdrop-blur-md px-4 py-3 w-full">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/timeline')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← TIMELINE
          </PixelButton>

          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-white leading-none">
              ACHIEVEMENTS
            </h1>
            <p className="font-['VT323'] text-xs text-white/50 mt-1 tracking-wider hidden sm:block">
              Koleksi pencapaian kisah petualangan kita
            </p>
          </div>

          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            MENU
          </PixelButton>
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 overflow-y-auto z-10">
        {isLoading ? (
          <div className="text-center py-20">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#FF69B4] animate-pulse">
              MEMUKAL KOTAK PENCAPAIAN...
            </p>
          </div>
        ) : (
          <>
            {/* Banner Section */}
            <section className="mb-6 rounded-xl border-4 border-[#1a1a2e] bg-[#12121c] p-4 sm:p-5 shadow-[4px_4px_0_#000000]">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-lg border-2 border-[#FFD700] bg-[#FFD700]/10 px-3 py-0.5 mb-2 select-none">
                    <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span className="font-['VT323'] text-sm text-[#FFD700] uppercase tracking-wider font-bold">
                      Journey Rewards
                    </span>
                  </div>

                  <h2 className="font-['Press_Start_2P'] text-[10px] sm:text-xs leading-relaxed text-white tracking-wide">
                    Setiap kisah manis adalah pencapaian berharga
                  </h2>

                  <p className="font-['VT323'] text-sm sm:text-base text-white/60 mt-2 leading-relaxed">
                    Halaman ini menampilkan seluruh piala pencapaian dari kisah petualangan yang telah kalian tulis bersama. Setiap kenangan memiliki lencana cintanya masing-masing. Ketuk piala untuk detail petualangan lengkap.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border-2 border-[#1a1a2e] bg-black/40 p-3 text-center shadow-[2px_2px_0_#000000] select-none">
                    <div className="font-['Press_Start_2P'] text-[7px] text-white/40">TOTAL</div>
                    <div className="mt-1 font-['VT323'] text-2xl text-white leading-none">{totalCount}</div>
                  </div>

                  <div className="rounded-xl border-2 border-[#1a1a2e] bg-black/40 p-3 text-center shadow-[2px_2px_0_#000000] select-none">
                    <div className="font-['Press_Start_2P'] text-[7px] text-white/40">UNLOCKED</div>
                    <div className="mt-1 font-['VT323'] text-2xl text-[#00FFFF] leading-none">{unlockedCount}</div>
                  </div>

                  <div className="rounded-xl border-2 border-[#1a1a2e] bg-black/40 p-3 text-center shadow-[2px_2px_0_#000000] select-none">
                    <div className="font-['Press_Start_2P'] text-[7px] text-white/40">COMPLETED</div>
                    <div className="mt-1 font-['VT323'] text-2xl text-[#32CD32] leading-none">{completedCount}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const rarity = rarityStyles[item.rarity];

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      playUnlockSound();
                      navigate(`/chapter/${item.id}`);
                    }}
                    className={[
                      'rounded-xl border-4 bg-[#12121c] overflow-hidden transition-all duration-150 hover:-translate-y-0.5 cursor-pointer relative shadow-[4px_4px_0_#000000]',
                      rarity.border,
                    ].join(' ')}
                  >
                    <div className="relative h-44 overflow-hidden border-b-4 border-[#1a1a2e] bg-black/40">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-2 select-none">
                        <span className={`rounded-lg px-2 py-0.5 text-[7px] font-['Press_Start_2P'] tracking-wider ${rarity.badge}`}>
                          {rarity.emoji} {rarity.label}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 select-none">
                        <div className="flex items-center gap-1.5 rounded-lg border border-[#32CD32]/30 bg-[#32CD32]/10 px-2 py-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#32CD32]" />
                          <span className="font-['VT323'] text-xs text-[#32CD32] uppercase tracking-wider">
                            Unlocked
                          </span>
                        </div>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-3 select-none">
                        <div className="font-['Press_Start_2P'] text-[7px] text-[#FFD700] mb-1">
                          MONTH {item.month}
                        </div>
                        <h3 className="font-['Press_Start_2P'] text-[10px] text-white leading-normal uppercase tracking-wide truncate">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-2">
                        <div className="font-['Press_Start_2P'] text-[7px] text-white/40 mb-1 select-none">
                          PENCAPAIAN
                        </div>
                        <p className="font-['VT323'] text-lg text-[#FFD700] leading-snug line-clamp-1">
                          {item.achievement}
                        </p>
                      </div>

                      <div className="mb-3">
                        <div className="font-['Press_Start_2P'] text-[7px] text-white/40 mb-1 select-none">
                          HIGHLIGHT MOMEN
                        </div>
                        <p className="font-['VT323'] text-base text-white/60 leading-snug line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
                        <div className="flex items-center gap-1.5 select-none">
                          <Star className="w-3.5 h-3.5 text-[#FFD700] fill-current animate-pulse" />
                          <span className="font-['VT323'] text-base text-white/50">
                            Reward Collected
                          </span>
                        </div>

                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-100 font-['Press_Start_2P'] text-[8px] bg-[#FF69B4] text-white hover:brightness-110 active:scale-95 shadow-sm"
                        >
                          BUKA
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {filteredItems.length === 0 && (
              <div className="text-center py-20">
                <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3 animate-pulse" />
                <p className="font-['Press_Start_2P'] text-[9px] text-white/35 mb-2">
                  BELUM ADA PENCAPAIAN TERBUKA
                </p>
                <p className="font-['VT323'] text-lg text-white/40">
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