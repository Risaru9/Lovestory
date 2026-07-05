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
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] text-[#ffffff] flex flex-col relative overflow-hidden">
      {/* Background overlay */}
      <div className="fixed inset-0 pointer-events-none bg-black/[0.05]" />

      {/* Header Sticky */}
      <header className="relative z-20 border-b-4 border-[#000000] bg-[#121224] px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              DATE PLANNER
            </h1>
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider hidden sm:block font-bold">
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
        <section className="mb-6 rounded-xl border-4 border-[#000000] bg-[#121224] p-4 shadow-[4px_4px_0_#000000] text-[#ffffff]">
          <div className="flex items-center gap-4">
            <div className="text-3xl animate-bounce shrink-0 select-none">📅</div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] mb-1.5 leading-relaxed tracking-wider font-bold">
                TENTUKAN PETUALANGAN BERIKUTNYA!
              </h2>
              <p className="font-['VT323'] text-sm sm:text-base text-[#a0a0b0] leading-normal font-semibold">
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
                ? 'border-[#000000] bg-[#ff69b4] text-[#000000] shadow-[3px_3px_0_#000000] translate-x-0.5 translate-y-0.5 font-bold'
                : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3e]'
            }`}
          >
            📋 QUEST AKTIF ({activePlans.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-2 border-2 rounded-xl text-center transition-all duration-100 font-['Press_Start_2P'] text-[9px] ${
              activeTab === 'history'
                ? 'border-[#000000] bg-[#4caf50] text-white shadow-[3px_3px_0_#000000] translate-x-0.5 translate-y-0.5 font-bold'
                : 'border-transparent bg-[#222230] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3e]'
            }`}
          >
            🏆 MEMORI SELESAI ({completedPlans.length})
          </button>
        </section>

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] animate-pulse font-bold">
              MEMUAT DATA QUEST...
            </p>
          </div>
        ) : (
          <>
            {/* Tab: Rencana Aktif */}
            {activeTab === 'planned' && (
              <div className="space-y-4">
                {activePlans.length === 0 ? (
                  <div className="text-center py-16 bg-[#121224] border-4 border-dashed border-[#000000] rounded-2xl p-6 shadow-[4px_4px_0_#000000]">
                    <p className="font-['Press_Start_2P'] text-[9px] text-[#a0a0b0]/50 mb-2.5 font-bold">
                      BELUM ADA RENCANA AKTIF
                    </p>
                    <p className="font-['VT323'] text-base text-[#a0a0b0] mb-5 font-semibold">
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
                      className="bg-[#121224] border-4 border-[#000000] rounded-xl p-5 hover:border-[#ff69b4] transition-all duration-150 shadow-[4px_4px_0_#000000] relative overflow-hidden text-[#ffffff]"
                    >
                      {/* Top-right quest badge */}
                      <div className="absolute top-0 right-0 bg-[#ff69b4] border-l-2 border-b-2 border-[#000000] px-3 py-1 text-[7px] font-['Press_Start_2P'] text-[#000000] uppercase tracking-wider select-none rounded-bl-xl font-bold">
                        Quest
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="space-y-3">
                          <h3 className="font-['Press_Start_2P'] text-xs text-white leading-normal pr-16 tracking-wide select-text font-bold">
                            {plan.title}
                          </h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-['VT323'] text-base text-[#a0a0b0] font-semibold">
                            <div className="flex items-center gap-2 bg-[#1a1a2e]/60 border border-[#000000]/30 rounded-lg p-2 min-w-0">
                              <Clock className="w-4 h-4 text-[#ff69b4] shrink-0" />
                              <span className="truncate">{plan.date_time}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-[#1a1a2e]/60 border border-[#000000]/30 rounded-lg p-2 min-w-0">
                              <MapPin className="w-4 h-4 text-[#00ffff] shrink-0" />
                              <span className="truncate">{plan.location}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-[#1a1a2e]/60 border border-[#000000]/30 rounded-lg p-2 min-w-0">
                              <MessageSquare className="w-4 h-4 text-[#00ff00] shrink-0" />
                              <span className="truncate">Aktivitas: {plan.activity}</span>
                            </div>
                          </div>

                          {plan.notes && (
                            <div className="mt-3 p-3 bg-[#1a1a2e]/45 border border-[#000000]/30 rounded-xl text-sm font-['VT323'] text-[#a0a0b0] leading-snug font-bold">
                              📌 Catatan: {plan.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2.5 pt-3.5 border-t border-[#000000]/40 justify-end">
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
                            className="text-[9px] px-3 py-2 text-red-500/90"
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
                  <div className="text-center py-16 bg-[#121224] border-4 border-dashed border-[#000000] rounded-2xl p-6 shadow-[4px_4px_0_#000000]">
                    <p className="font-['Press_Start_2P'] text-[9px] text-[#a0a0b0]/50 mb-2.5 font-bold">
                      BELUM ADA MEMORI KENCAN
                    </p>
                    <p className="font-['VT323'] text-base text-[#a0a0b0] font-semibold">
                      Selesaikan rencana kencan kalian untuk menjadikannya memori manis di sini!
                    </p>
                  </div>
                ) : (
                  completedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-[#121224] border-4 border-[#000000] rounded-xl p-5 shadow-[4px_4px_0_#000000] relative overflow-hidden text-[#ffffff]"
                    >
                      {/* Top-right completed badge */}
                      <div className="absolute top-0 right-0 bg-[#4caf50] border-l-2 border-b-2 border-[#000000] px-3 py-1 text-[7px] font-['Press_Start_2P'] text-white uppercase tracking-wider select-none rounded-bl-xl font-bold">
                        Completed
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 select-none">
                            <span className="text-lg">🏆</span>
                            <h3 className="font-['Press_Start_2P'] text-xs text-[#ffffff] leading-normal tracking-wide pr-16 font-bold">
                              {plan.title}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-['VT323'] text-base text-[#a0a0b0] font-semibold">
                            <div className="flex items-center gap-2 bg-[#1a1a2e]/60 border border-[#000000]/30 rounded-lg p-2 min-w-0">
                              <Clock className="w-4 h-4 text-[#a0a0b0] shrink-0" />
                              <span className="truncate">{plan.date_time}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-[#1a1a2e]/60 border border-[#000000]/30 rounded-lg p-2 min-w-0">
                              <MapPin className="w-4 h-4 text-[#a0a0b0] shrink-0" />
                              <span className="truncate">{plan.location}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-[#1a1a2e]/60 border border-[#000000]/30 rounded-lg p-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 text-[#4caf50] shrink-0" />
                              <span className="truncate">Aktivitas: {plan.activity}</span>
                            </div>
                          </div>

                          {plan.notes && (
                            <div className="mt-3 p-3 bg-[#1a1a2e]/45 border border-[#000000]/30 rounded-xl text-sm font-['VT323'] text-[#a0a0b0] leading-snug font-bold">
                              📌 Catatan: {plan.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2.5 pt-3.5 border-t border-[#000000]/40 justify-end">
                          <PixelButton
                            onClick={() => handleDelete(plan.id)}
                            variant="secondary"
                            size="sm"
                            className="text-[9px] px-3 py-2 text-red-500/90"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121224] border-4 border-[#000000] rounded-xl w-full max-w-md p-5 shadow-[6px_6px_0_#000000] max-h-[85vh] overflow-y-auto text-[#ffffff]">
            <div className="flex justify-between items-center border-b-2 border-[#000000] pb-3 mb-4 select-none">
              <h3 className="font-['Press_Start_2P'] text-[#ff69b4] text-[9px] tracking-wide uppercase font-bold">
                ⚔️ CREATE NEW QUEST
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError(null);
                }}
                className="font-['Press_Start_2P'] text-[#a0a0b0]/50 text-[9px] hover:text-[#ff69b4] transition-colors"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 tracking-wide font-bold">
                  NAMA RENCANA / JUDUL
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Piknik di Taman, Dinner Romantis, dll..."
                  className="w-full px-3.5 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-[#ffffff] font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] transition-colors placeholder-[#a0a0b0]/40"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 tracking-wide font-bold">
                  TANGGAL & WAKTU
                </label>
                <input
                  type="text"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  placeholder="Minggu, 10 Juli 2026 pukul 15:00"
                  className="w-full px-3.5 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-[#ffffff] font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] transition-colors placeholder-[#a0a0b0]/40"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 tracking-wide font-bold">
                  LOKASI KENCAN
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Taman Hutan Raya, Cafe Cinta, dll..."
                  className="w-full px-3.5 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-[#ffffff] font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] transition-colors placeholder-[#a0a0b0]/40"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 tracking-wide font-bold">
                  AKTIVITAS UTAMA
                </label>
                <input
                  type="text"
                  required
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="Jalan-jalan sore, main sepeda, makan es krim..."
                  className="w-full px-3.5 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-[#ffffff] font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] transition-colors placeholder-[#a0a0b0]/40"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 tracking-wide font-bold">
                  CATATAN TAMBAHAN (OPSIONAL)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jangan lupa bawa kamera, payung, atau dresscode..."
                  className="w-full px-3.5 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-[#ffffff] font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] resize-none transition-colors placeholder-[#a0a0b0]/40"
                />
              </div>

              {error && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl px-3 py-2">
                  <p className="font-['VT323'] text-red-400 text-sm font-bold">⚠ {error}</p>
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
