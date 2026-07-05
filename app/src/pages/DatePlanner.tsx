import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle2, Plus, Clock, MessageSquare } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0c0a18] text-white flex flex-col relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.06),transparent_40%),linear-gradient(to_bottom,rgba(12,10,24,0.4),rgba(12,10,24,0.7))]" />

      {/* Header Sticky */}
      <header className="relative z-20 border-b-4 border-[#FF69B4] bg-[#1a172e]/90 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-sm text-white">
              DATE PLANNER
            </h1>
            <p className="font-['VT323'] text-sm md:text-base text-[#FF69B4] mt-1">
              Rencana Kencan & Pelacak Memori
            </p>
          </div>

          <PixelButton onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5 inline mr-1" /> BUAT
          </PixelButton>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 py-8 overflow-y-auto">
        
        {/* Banner Motivasi RPG */}
        <section className="mb-6 rounded-2xl border border-[#FF69B4]/25 bg-[#17142d]/85 p-5 shadow-[0_0_24px_rgba(255,105,180,0.08)]">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="text-4xl animate-bounce">📅</div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs md:text-sm text-[#FFD700] mb-2 leading-relaxed">
                TENTUKAN PETUALANGAN BERIKUTNYA!
              </h2>
              <p className="font-['VT323'] text-lg md:text-xl text-white/70">
                Gunakan halaman ini untuk merencanakan kencan kalian ke depan, dan simpan kisah yang sudah selesai sebagai memori manis untuk dikenang selamanya.
              </p>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <section className="flex border-b-2 border-white/10 mb-6 font-['Press_Start_2P'] text-[9px] md:text-[10px]">
          <button
            onClick={() => setActiveTab('planned')}
            className={`flex-1 py-3 text-center border-b-4 transition-all duration-200 ${
              activeTab === 'planned'
                ? 'border-[#FF69B4] text-[#FF69B4]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            📋 RENCANA AKTIF ({activePlans.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-center border-b-4 transition-all duration-200 ${
              activeTab === 'history'
                ? 'border-[#00FFFF] text-[#00FFFF]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            💖 MEMORI SELESAI ({completedPlans.length})
          </button>
        </section>

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="font-['Press_Start_2P'] text-xs text-[#FF69B4] animate-pulse">
              MEMUAT RENCANA KENCAN...
            </p>
          </div>
        ) : (
          <>
            {/* Tab: Rencana Aktif */}
            {activeTab === 'planned' && (
              <div className="space-y-4">
                {activePlans.length === 0 ? (
                  <div className="text-center py-16 bg-[#111327]/60 border border-dashed border-white/10 rounded-2xl p-6">
                    <p className="font-['Press_Start_2P'] text-[10px] text-white/40 mb-3">
                      BELUM ADA RENCANA AKTIF
                    </p>
                    <p className="font-['VT323'] text-lg text-white/60 mb-5">
                      Yuk rencanakan kencan indah berikutnya bersama pasanganmu!
                    </p>
                    <PixelButton onClick={() => setIsModalOpen(true)} size="sm">
                      ✨ Buat Rencana Kencan
                    </PixelButton>
                  </div>
                ) : (
                  activePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-[#111327]/90 border-2 border-[#FF69B4]/40 rounded-xl p-5 hover:border-[#FF69B4]/80 transition-all duration-300 shadow-[0_0_20px_rgba(255,105,180,0.06)]"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="font-['VT323'] text-2xl text-[#FFD700] leading-tight">
                            {plan.title}
                          </h3>
                          
                          <div className="flex flex-col space-y-1 font-['VT323'] text-lg text-white/75">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#FF69B4] shrink-0" />
                              <span>{plan.date_time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#00FFFF] shrink-0" />
                              <span>{plan.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-green-400 shrink-0" />
                              <span>Aktivitas: {plan.activity}</span>
                            </div>
                          </div>

                          {plan.notes && (
                            <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg text-base font-['VT323'] text-white/60">
                              📌 Catatan: {plan.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0 justify-end md:flex-col">
                          <PixelButton
                            onClick={() => handleComplete(plan.id)}
                            className="bg-green-600 hover:bg-green-500 text-xs py-2 px-3 flex-1 md:flex-initial"
                          >
                            ✓ SELESAI
                          </PixelButton>
                          <PixelButton
                            onClick={() => handleDelete(plan.id)}
                            variant="secondary"
                            className="hover:bg-red-600/20 border-red-500/50 text-red-400 text-xs py-2 px-3 flex-1 md:flex-initial"
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
                  <div className="text-center py-16 bg-[#111327]/60 border border-dashed border-white/10 rounded-2xl p-6">
                    <p className="font-['Press_Start_2P'] text-[10px] text-white/40 mb-3">
                      BELUM ADA MEMORI KENCAN
                    </p>
                    <p className="font-['VT323'] text-lg text-white/60">
                      Selesaikan rencana kencan kalian untuk menjadikannya memori manis di sini!
                    </p>
                  </div>
                ) : (
                  completedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-[#111327]/70 border-2 border-[#00FFFF]/30 rounded-xl p-5 shadow-[0_0_20px_rgba(0,255,255,0.03)]"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🏆</span>
                            <h3 className="font-['VT323'] text-2xl text-[#FFD700] leading-tight">
                              {plan.title}
                            </h3>
                          </div>
                          
                          <div className="flex flex-col space-y-1 font-['VT323'] text-lg text-white/60">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-white/40 shrink-0" />
                              <span>{plan.date_time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-white/40 shrink-0" />
                              <span>{plan.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              <span>Aktivitas: {plan.activity}</span>
                            </div>
                          </div>

                          {plan.notes && (
                            <div className="mt-3 p-3 bg-white/5 border border-white/5 rounded-lg text-base font-['VT323'] text-white/40">
                              📌 Catatan: {plan.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0 justify-end">
                          <PixelButton
                            onClick={() => handleDelete(plan.id)}
                            variant="secondary"
                            className="hover:bg-red-600/20 border-red-500/50 text-red-400 text-xs py-2 px-3"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111327] border-4 border-[#FF69B4] rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(255,105,180,0.4)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Press_Start_2P'] text-[#FFD700] text-[10px] md:text-xs">
                ✨ BUAT RENCANA KENCAN BARU
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError(null);
                }}
                className="font-['Press_Start_2P'] text-[#FF69B4] text-xs hover:brightness-125"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  NAMA RENCANA / JUDUL
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Piknik di Taman, Dinner Romantis, dll..."
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  TANGGAL & WAKTU
                </label>
                <input
                  type="text"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  placeholder="Minggu, 10 Juli 2026 pukul 15:00"
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  LOKASI KENCAN
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Taman Hutan Raya, Cafe Cinta, dll..."
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-2">
                  AKTIVITAS UTAMA
                </label>
                <input
                  type="text"
                  required
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="Jalan-jalan sore, main sepeda, makan es krim..."
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-2">
                  CATATAN TAMBAHAN (OPSIONAL)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jangan lupa bawa kamera, payung, atau dresscode..."
                  className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FFD700] resize-none"
                />
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
                {isSubmitting ? 'MENYIMPAN RENCANA...' : '▶ SIMPAN RENCANA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePlanner;
