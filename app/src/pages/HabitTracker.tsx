import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

// --- Types ---
interface HabitDay {
  date: string; // YYYY-MM-DD
  done: boolean;
}

interface Habit {
  id: string;
  name: string;
  days: HabitDay[];
}

interface HabitData {
  habits: Habit[];
}

const STORAGE_KEY = 'lovestory-habit-tracker';

const PRESET_HABITS = [
  'Minum Air 2L 💧',
  'Tidur Jam 10 🌙',
  'Olahraga 30min 🏃',
  'Baca Buku 📚',
  'Makan Sehat 🥗',
  'Meditasi 5min 🧘',
];

// --- Helpers ---
const getToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getLast7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
};

const getDayLabel = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
};

const getStreak = (habit: Habit): number => {
  let streak = 0;
  const today = getToday();
  const d = new Date(today + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const day = habit.days.find(dd => dd.date === dateStr);
    if (day && day.done) {
      streak++;
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

const getStreakBadge = (streak: number): { label: string; color: string } | null => {
  if (streak >= 7) return { label: '★ GOLD', color: '#ffb300' };
  if (streak >= 5) return { label: '★ SILVER', color: '#c0c0c0' };
  if (streak >= 3) return { label: '★ BRONZE', color: '#cd7f32' };
  return null;
};

const createDefaultData = (): HabitData => ({
  habits: PRESET_HABITS.map((name, i) => ({
    id: `habit-${i}`,
    name,
    days: [],
  })),
});

const loadData = (): HabitData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : createDefaultData();
};

const saveData = (data: HabitData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// --- Sound ---
const playSound = (freq: number = 440, duration: number = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

const HabitTracker: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HabitData>(loadData);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const last7Days = getLast7Days();
  const today = getToday();

  useEffect(() => {
    saveData(data);
  }, [data]);

  const totalStars = data.habits.reduce((sum, h) => sum + h.days.filter(d => d.done).length, 0);

  const toggleDay = async (habitId: string, date: string) => {
    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return;

    const existingDay = habit.days.find(d => d.date === date);
    const wasDone = existingDay?.done || false;

    const updatedDays = existingDay
      ? habit.days.map(d => d.date === date ? { ...d, done: !d.done } : d)
      : [...habit.days, { date, done: true }];

    const updatedHabits = data.habits.map(h =>
      h.id === habitId ? { ...h, days: updatedDays } : h
    );

    setData({ habits: updatedHabits });

    if (!wasDone) {
      playSound(880, 0.1);
      try {
        await addRelationshipXP(5, 'trust');
      } catch (e) {}
    } else {
      playSound(330, 0.08);
    }
  };

  const addCustomHabit = () => {
    if (!newHabitName.trim()) return;
    playSound(660, 0.12);
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name: newHabitName.trim(),
      days: [],
    };
    setData({ habits: [...data.habits, newHabit] });
    setNewHabitName('');
    setShowAddForm(false);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>
          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              HABIT TRACKER
            </h1>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-5">
        {/* Total stars */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 flex items-center justify-between">
          <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">TOTAL STARS</p>
          <p className="font-['Press_Start_2P'] text-[10px] text-[#ffb300]">⭐ {totalStars}</p>
        </div>

        {/* Day labels header */}
        <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3">
          <div className="flex items-center gap-1 justify-end mb-2">
            <div className="flex-1" />
            {last7Days.map(day => (
              <div key={day} className="w-8 text-center">
                <span className={`font-['VT323'] text-xs ${day === today ? 'text-[#ff69b4]' : 'text-[#a0a0b0]'}`}>
                  {getDayLabel(day)}
                </span>
              </div>
            ))}
            <div className="w-12" />
          </div>
        </div>

        {/* Habit rows */}
        {data.habits.map((habit) => {
          const streak = getStreak(habit);
          const badge = getStreakBadge(streak);

          return (
            <div
              key={habit.id}
              className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="font-['VT323'] text-lg text-[#ffffff] flex-1 truncate">{habit.name}</p>
                {badge && (
                  <span className="font-['Press_Start_2P'] text-[8px] ml-2" style={{ color: badge.color }}>
                    {badge.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 justify-end">
                <div className="flex-1">
                  <span className="font-['VT323'] text-sm text-[#a0a0b0]">
                    Streak: <span className="text-[#ffb300]">{streak}</span>
                  </span>
                </div>
                {last7Days.map(day => {
                  const dayEntry = habit.days.find(d => d.date === day);
                  const isDone = dayEntry?.done || false;
                  const isToday = day === today;

                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(habit.id, day)}
                      className={`w-8 h-8 flex items-center justify-center border-2 transition-colors ${
                        isToday ? 'border-[#ff69b4]' : 'border-[#000000]'
                      } ${isDone ? 'bg-[#1a1a2a]' : 'bg-[#0c0a18]'}`}
                    >
                      <span className="text-lg select-none">{isDone ? '⭐' : '⚫'}</span>
                    </button>
                  );
                })}
                <div className="w-12 text-center">
                  <span className="font-['VT323'] text-sm text-[#ffb300]">
                    {habit.days.filter(d => d.done).length}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add custom habit */}
        {!showAddForm ? (
          <PixelButton onClick={() => { setShowAddForm(true); playSound(440, 0.08); }} variant="secondary" size="sm" className="text-[9px] w-full">
            + ADD CUSTOM HABIT
          </PixelButton>
        ) : (
          <div className="bg-[#121224] border-4 border-[#000000] shadow-[4px_4px_0_#000000] p-4 space-y-3">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4]">NEW HABIT</p>
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Enter habit name..."
              maxLength={40}
              className="w-full bg-[#1a1a2a] border-4 border-[#000000] text-[#ffffff] font-['VT323'] text-lg p-2 focus:outline-none placeholder-[#a0a0b0]"
            />
            <div className="flex gap-2">
              <PixelButton onClick={addCustomHabit} disabled={!newHabitName.trim()} size="sm" className="text-[9px]">
                ADD
              </PixelButton>
              <PixelButton onClick={() => { setShowAddForm(false); setNewHabitName(''); }} variant="secondary" size="sm" className="text-[9px]">
                CANCEL
              </PixelButton>
            </div>
          </div>
        )}

        {/* XP info */}
        <div className="text-center">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">+5 Trust XP for each habit completed</p>
        </div>
      </div>
    </div>
  );
};

export default HabitTracker;
