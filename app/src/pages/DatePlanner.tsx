import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { PixelButton } from '@/components/custom/PixelButton';
import { getDatePlans, addDatePlan, updateDatePlanStatus, deleteDatePlan } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { DatePlan } from '@/types';

const DatePlanner: React.FC = () => {
  const navigate = useNavigate();

  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [activeTab, setActiveTab] = useState<'planned' | 'history'>('planned');
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [activity, setActivity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch plans
  const loadPlans = async () => {
    try {
      const data = await getDatePlans();
      setPlans(data);
    } catch (err) {
      console.error('Error load date plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Supabase Realtime sync
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('public:date_plans:realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'date_plans',
        },
        async () => {
          console.log('[Realtime] Perubahan plans terdeteksi, memuat ulang...');
          const data = await getDatePlans();
          setPlans(data);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  // Tambah Rencana Baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !dateTime.trim() || !location.trim() || !activity.trim()) {
      setError('Semua kolom utama wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDatePlan(title, dateTime, location, activity, notes || undefined);
      
      // Reset form
      setTitle('');
      setDateTime('');
      setLocation('');
      setActivity('');
      setNotes('');
      setIsModalOpen(false);

      // Refresh list
      await loadPlans();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan rencana kencan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selesaikan kencan (Pindah ke riwayat)
  const handleComplete = async (id: number) => {
    try {
      await updateDatePlanStatus(id, 'completed');
      await loadPlans();
    } catch (err) {
      console.error('Gagal update status rencana:', err);
      alert('Gagal menyelesaikan rencana kencan.');
    }
  };

  // Hapus rencana kencan
  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah kamu yakin ingin menghapus rencana/memori kencan ini? 😢')) {
      return;
    }

    try {
      await deleteDatePlan(id);
      await loadPlans();
    } catch (err) {
      console.error('Gagal menghapus rencana:', err);
      alert('Gagal menghapus rencana kencan.');
    }
  };

  // Filter plans based on active tab
  const activePlans = plans.filter((p) => p.status === 'planned');
  const completedPlans = plans.filter((p) => p.status === 'completed');

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] text-white flex flex-col relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.06),transparent_40%),linear-gradient(to_bottom,rgba(12,10,24,0.4),rgba(12,10,24,0.7))]" />

      {/* Header Sticky */}
      <header className="relative z-20 border-b border-[#1A1A2E] bg-[#080b18]/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-white leading-none">
              DATE PLANNER
            </h1>
            <p className="font-['VT323'] text-xs text-[#FF69B4] mt-1 tracking-wider hidden sm:block">
              Rencana Kencan & Pelacak Memori
            </p>
          </div>

          <PixelButton onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="text-[9px] shrink-0">
            + BUAT
          </PixelButton>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto">
        
        {/* Banner Motivasi RPG */}
        <section className="mb-6 rounded-2xl border border-white/[0.06] bg-[#111327]/80 p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="text-3xl animate-bounce shrink-0 select-none">📅</div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-1.5 leading-relaxed tracking-wider">
                TENTUKAN PETUALANGAN BERIKUTNYA!
              </h2>
              <p className="font-['VT323'] text-sm sm:text-base text-white/60 leading-normal">
                Gunakan halaman ini untuk merencana kencan indah bersama pasanganmu, lalu simpan sebagai memori manis untuk dikenang selamanya.
              </p>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <section className="grid grid-cols-2 gap-2 mb-6 font-['Press_Start_2P'] text-[8px] sm:text-[9px]">
          <button
            onClick={() => setActiveTab('planned')}
            className={`py-3 px-2 border-2 rounded-xl text-center transition-all duration-100 ${
              activeTab === 'planned'
                ? 'border-[#FF69B4] bg-[#FF69B4]/15 text-[#FF69B4] shadow-[2px_2px_0_#1a1a2e]'
                : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            📋 QUEST AKTIF ({activePlans.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-2 border-2 rounded-xl text-center transition-all duration-100 ${
              activeTab === 'history'
                ? 'border-[#00FFFF] bg-[#00FFFF]/15 text-[#00FFFF] shadow-[2px_2px_0_#1a1a2e]'
                : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            🏆 MEMORI SELESAI ({completedPlans.length})
          </button>
        </section>

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="font-['Press_Start_2P'] text-[10px] text-[#FF69B4] animate-pulse">
              MEMUAT DATA QUEST...
            </p>
          </div>
        ) : (
          <>
            {/* Tab: Rencana Aktif */}
            {activeTab === 'planned' && (
              <div className="space-y-4">
                {activePlans.length === 0 ? (
                  <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-6">
                    <p className="font-['Press_Start_2P'] text-[9px] text-white/35 mb-2.5">
                      BELUM ADA RENCANA AKTIF
                    </p>
                    <p className="font-['VT323'] text-base text-white/50 mb-5">
                      Yuk rencanakan kencan indah berikutnya bersama pasanganmu!
                    </p>
                    <PixelButton onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="text-[9px]">
                      ✨ Buat Rencana
                    </PixelButton>
                  </div>
                ) : (
                  activePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-[#090b1e]/85 backdrop-blur-md border-2 border-white/10 rounded-2xl p-5 hover:border-[#FF69B4]/40 transition-all duration-200 shadow-lg relative overflow-hidden"
                    >
                      {/* Top-right quest badge */}
                      <div className="absolute top-0 right-0 bg-[#FF69B4]/20 border-l border-b border-[#FF69B4]/30 px-3 py-1 text-[8px] font-['Press_Start_2P'] text-[#FF69B4] rounded-bl-xl uppercase tracking-wider select-none">
                        Quest
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="space-y-3">
                          <h3 className="font-['Press_Start_2P'] text-xs text-[#FFD700] leading-normal pr-16 tracking-wide">
                            {plan.title}
                          </h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-['VT323'] text-base text-white/70">
                            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2 min-w-0">
                              <Clock className="w-4 h-4 text-[#FF69B4] shrink-0" />
                              <span className="truncate">{plan.date_time}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2 min-w-0">
                              <MapPin className="w-4 h-4 text-[#00FFFF] shrink-0" />
                              <span className="truncate">{plan.location}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2 min-w-0">
                              <MessageSquare className="w-4 h-4 text-green-400 shrink-0" />
                              <span className="truncate">Aktivitas: {plan.activity}</span>
                            </div>
                          </div>

                          {plan.notes && (
                            <div className="mt-3 p-3 bg-black/30 border border-white/[0.05] rounded-xl text-sm font-['VT323'] text-white/50 leading-snug">
                              📌 Catatan: {plan.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2.5 pt-3.5 border-t border-white/[0.06] justify-end">
                          <PixelButton
                            onClick={() => handleComplete(plan.id)}
                            variant="primary"
                            size="sm"
                            className="text-[9px] px-4 py-2"
                          >
                            ✓ QUEST SELESAI
                          </PixelButton>
                          <PixelButton
                            onClick={() => handleDelete(plan.id)}
                            variant="secondary"
                            size="sm"
                            className="text-[9px] px-3 py-2 border-red-500/30 hover:border-red-500/70 hover:bg-red-500/10 text-red-400/90"
                          >
                            🗑 HAPUS
                          </PixelButton>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Memori Selesai */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {completedPlans.length === 0 ? (
                  <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-6">
                    <p className="font-['Press_Start_2P'] text-[9px] text-white/35 mb-2.5">
                      BELUM ADA MEMORI KENCAN
                    </p>
                    <p className="font-['VT323'] text-base text-white/50">
                      Selesaikan rencana kencan kalian untuk menjadikannya memori manis di sini!
                    </p>
                  </div>
                ) : (
                  completedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-[#090b1e]/60 backdrop-blur-md border-2 border-white/5 rounded-2xl p-5 shadow-sm relative overflow-hidden opacity-80"
                    >
                      {/* Top-right completed badge */}
                      <div className="absolute top-0 right-0 bg-[#00FFFF]/10 border-l border-b border-[#00FFFF]/20 px-3 py-1 text-[8px] font-['Press_Start_2P'] text-[#00FFFF] rounded-bl-xl uppercase tracking-wider select-none">
                        Completed
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg select-none">🏆</span>
                            <h3 className="font-['Press_Start_2P'] text-xs text-[#FFD700] leading-normal tracking-wide pr-16">
                              {plan.title}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-['VT323'] text-base text-white/60">
                            <div className="flex items-center gap-2 bg-white/[0.01] border border-white/[0.03] rounded-lg p-2 min-w-0">
                              <Clock className="w-4 h-4 text-white/30 shrink-0" />
                              <span className="truncate">{plan.date_time}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/[0.01] border border-white/[0.03] rounded-lg p-2 min-w-0">
                              <MapPin className="w-4 h-4 text-white/30 shrink-0" />
                              <span className="truncate">{plan.location}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/[0.01] border border-white/[0.03] rounded-lg p-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 text-green-500/80 shrink-0" />
                              <span className="truncate">Aktivitas: {plan.activity}</span>
                            </div>
                          </div>

                          {plan.notes && (
                            <div className="mt-3 p-3 bg-black/20 border border-white/[0.03] rounded-xl text-sm font-['VT323'] text-white/40 leading-snug">
                              📌 Catatan: {plan.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2.5 pt-3.5 border-t border-white/[0.04] justify-end">
                          <PixelButton
                            onClick={() => handleDelete(plan.id)}
                            variant="secondary"
                            size="sm"
                            className="text-[9px] px-3 py-2 border-red-500/20 hover:border-red-500/60 hover:bg-red-500/10 text-red-400/80"
                          >
                            🗑 HAPUS
                          </PixelButton>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal: Buat Rencana Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#090b1e]/98 border-4 border-[#1a1a2e] rounded-2xl w-full max-w-md p-5 shadow-[4px_4px_0_#FF69B4,inset_-4px_-4px_0_rgba(0,0,0,0.2)] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3 mb-4">
              <h3 className="font-['Press_Start_2P'] text-[#FFD700] text-[9px] tracking-wide uppercase">
                ⚔️ CREATE NEW QUEST
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError(null);
                }}
                className="font-['Press_Start_2P'] text-white/40 text-[9px] hover:text-[#FF69B4] transition-colors"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                  NAMA RENCANA / JUDUL
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Piknik di Taman, Dinner Romantis, dll..."
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                  TANGGAL & WAKTU
                </label>
                <input
                  type="text"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  placeholder="Minggu, 10 Juli 2026 pukul 15:00"
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                  LOKASI KENCAN
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Taman Hutan Raya, Cafe Cinta, dll..."
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FF69B4] mb-2 tracking-wide">
                  AKTIVITAS UTAMA
                </label>
                <input
                  type="text"
                  required
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="Jalan-jalan sore, main sepeda, makan es krim..."
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4] transition-colors"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#FFD700] mb-2 tracking-wide">
                  CATATAN TAMBAHAN (OPSIONAL)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jangan lupa bawa kamera, payung, atau dresscode..."
                  className="w-full px-3.5 py-2.5 bg-black/40 border-2 border-white/10 rounded-xl text-white font-['VT323'] text-base focus:outline-none focus:border-[#FFD700] resize-none transition-colors"
                />
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
                {isSubmitting ? 'MENYIMPAN RENCANA...' : '▶ MULAI QUEST BARU'}
              </PixelButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePlanner;
