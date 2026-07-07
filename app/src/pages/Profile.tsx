import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PixelButton } from '@/components/custom/PixelButton';
import { supabase } from '@/lib/supabaseClient';
import { LogOut, ArrowLeft, Download, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';

const playSFX = (freq = 440, type: OscillatorType = 'square', duration = 0.1) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, partner, coupleInfo, isConnected, signOut, generateCoupleCode, connectWithCode, refreshCouple } = useAuth();

  const [newName, setNewName] = useState(profile?.name || '');
  const [partnerCode, setPartnerCode] = useState('');
  const [myCode, setMyCode] = useState<string | null>(null);

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (profile) {
      setNewName(profile.name);
    }
  }, [profile]);

  useEffect(() => {
    if (coupleInfo?.couple_code) {
      setMyCode(coupleInfo.couple_code);
    }
  }, [coupleInfo]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsUpdatingName(true);
    setMessage(null);

    try {
      if (!supabase || !user) throw new Error('Supabase not initialized or not logged in.');
      const { error } = await supabase
        .from('profiles')
        .update({ name: newName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      playSFX(600, 'square', 0.12);
      setMessage({ text: 'Nama karakter berhasil diperbarui!', type: 'success' });
      // Force refresh couple/profile
      await refreshCouple();
      window.location.reload();
    } catch (err: any) {
      playSFX(150, 'sawtooth', 0.25);
      setMessage({ text: err.message || 'Gagal memperbarui nama.', type: 'error' });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    setMessage(null);
    try {
      const { code, error } = await generateCoupleCode();
      if (error) throw new Error(error);
      if (code) {
        setMyCode(code);
        playSFX(550, 'square', 0.1);
        setMessage({ text: 'Kode couple berhasil dibuat!', type: 'success' });
      }
    } catch (err: any) {
      playSFX(150, 'sawtooth', 0.25);
      setMessage({ text: err.message || 'Gagal membuat kode.', type: 'error' });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleConnectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode.trim()) return;
    setIsConnecting(true);
    setMessage(null);
    try {
      const { error } = await connectWithCode(partnerCode.trim());
      if (error) throw new Error(error);
      playSFX(523, 'square', 0.1);
      setTimeout(() => playSFX(659, 'square', 0.1), 100);
      setTimeout(() => playSFX(783, 'square', 0.15), 200);
      setMessage({ text: 'Berhasil terhubung dengan pasangan! 💕', type: 'success' });
      setPartnerCode('');
      await refreshCouple();
    } catch (err: any) {
      playSFX(150, 'sawtooth', 0.25);
      setMessage({ text: err.message || 'Kode couple tidak valid atau sudah digunakan.', type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    playSFX(350, 'triangle', 0.08);
    try {
      await refreshCouple();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    playSFX(200, 'square', 0.15);
    await signOut();
    navigate('/');
  };

  const handleDownload = () => {
    const url = 'https://github.com/Risaru9/Lovestory/releases/download/v1.0.0-debug/LoveStory.apk';
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      const intentUrl = `intent://${url.replace('https://', '')}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end;`;
      window.location.href = intentUrl;
      setTimeout(() => {
        window.location.href = url;
      }, 1500);
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a18] text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Scanline pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 4px)' }}
      />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="z-10 border-b-4 border-black bg-[#121224] px-4 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <PixelButton onClick={() => navigate('/')} variant="secondary" size="sm" className="text-[9px]">
            <ArrowLeft className="h-3 w-3 mr-1" /> KEMBALI
          </PixelButton>
          <span className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold">
            PROFILE CONSOLE
          </span>
          <div className="w-16" />
        </div>
      </header>

      {/* ── SCROLLABLE CONTENT ────────────────────────────────────────────── */}
      <main className="z-10 flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">

          {/* Toast / Message */}
          {message && (
            <div className={`border-4 border-black p-3 rounded-xl shadow-[3px_3px_0_#000] ${
              message.type === 'success' ? 'bg-[#4caf50]/20 border-[#4caf50]' : 'bg-[#f44336]/20 border-[#f44336]'
            }`}>
              <p className="font-['VT323'] text-base font-bold text-center">
                {message.type === 'success' ? '✓ ' : '⚠ '} {message.text}
              </p>
            </div>
          )}

          {/* Account Details Box */}
          <div className="bg-[#121224] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0_#000]">
            <div className="border-b-2 border-black/35 pb-2.5 mb-3.5 flex items-center justify-between">
              <span className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] font-bold">
                ACCOUNT DATA
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-[#a0a0b0] hover:text-[#ff69b4] active:scale-95 transition-colors cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-1.5 font-bold">
                  KODE EMAIL
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 bg-black/30 border-2 border-black/40 rounded-lg text-[#a0a0b0] font-['VT323'] text-base cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-['Press_Start_2P'] text-[7px] text-[#ff69b4] mb-1.5 font-bold">
                  NAMA KARAKTER SAYA
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama karakter..."
                    required
                    className="flex-1 px-3 py-2 bg-[#1a1a2a] border-2 border-black rounded-lg text-white font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/20 transition-colors min-h-[38px]"
                  />
                  <PixelButton type="submit" disabled={isUpdatingName} className="text-[9px] px-3 shrink-0">
                    {isUpdatingName ? 'SIMPAN...' : 'SIMPAN'}
                  </PixelButton>
                </div>
              </div>
            </form>
          </div>

          {/* Connection / Pairing Box */}
          <div className="bg-[#121224] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0_#000]">
            <div className="border-b-2 border-black/35 pb-2.5 mb-3.5 flex items-center justify-between">
              <span className="font-['Press_Start_2P'] text-[8px] text-[#00bcd4] font-bold">
                CONNECTION STATUS
              </span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-['Press_Start_2P'] text-[6px] bg-[#4caf50]/20 text-[#4caf50] px-1.5 py-0.5 rounded border border-[#4caf50]/30 font-bold">
                  <ShieldCheck className="h-2 w-2" /> CONNECTED
                </span>
              ) : (
                <span className="font-['Press_Start_2P'] text-[6px] bg-[#f44336]/20 text-[#f44336] px-1.5 py-0.5 rounded border border-[#f44336]/30 font-bold">
                  UNPAIRED
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-3.5 py-1">
                <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-lg border border-black/30">
                  <div className="p-2 bg-[#ff69b4]/10 rounded-full border border-[#ff69b4]/20">
                    <UserCheck className="h-6 w-6 text-[#ff69b4]" />
                  </div>
                  <div>
                    <span className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] font-bold block mb-0.5">PASANGAN SAYA</span>
                    <span className="font-['VT323'] text-lg text-white font-bold">{partner?.name || 'Karakter Pasangan'}</span>
                  </div>
                </div>
                <p className="font-['VT323'] text-sm text-[#a0a0b0] leading-relaxed">
                  Akun Anda sudah terhubung dengan **{partner?.name || 'Pasangan'}**. Anda bisa langsung memainkan seluruh fitur cinta (chat, check-in, timeline, dsb.) secara lengkap dengan mengunduh aplikasi native kami di HP!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-['VT323'] text-sm text-[#a0a0b0] leading-relaxed">
                  Hubungkan akun dengan pasangan Anda untuk mulai membagikan cinta. Gunakan salah satu metode di bawah ini:
                </p>

                {/* Method 1: My code */}
                <div className="bg-black/20 border border-black/35 p-3 rounded-lg flex flex-col gap-2">
                  <span className="font-['Press_Start_2P'] text-[6px] text-[#ffb300] font-bold">METODE A: KODE SAYA</span>
                  {myCode ? (
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 py-1.5 px-3 bg-black/40 border border-black rounded text-[#00ffff] font-['Press_Start_2P'] text-xs text-center tracking-widest font-bold">
                        {myCode}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(myCode);
                          playSFX(500, 'square', 0.08);
                          alert('Kode berhasil disalin!');
                        }}
                        className="px-3 py-2 bg-[#222230] border border-black text-[#a0a0b0] hover:text-white rounded active:scale-95 transition-all text-[8px] font-['Press_Start_2P'] font-bold cursor-pointer min-h-[32px]"
                      >
                        SALIN
                      </button>
                    </div>
                  ) : (
                    <PixelButton onClick={handleGenerateCode} disabled={isGeneratingCode} className="w-full text-[8px] py-2">
                      {isGeneratingCode ? 'MEMBUAT KODE...' : 'BUAT KODE COUPLE'}
                    </PixelButton>
                  )}
                  <span className="font-['VT323'] text-xs text-[#a0a0b0]/55">
                    Bagikan kode di atas agar pasangan Anda dapat memasukkannya di HP mereka.
                  </span>
                </div>

                {/* Method 2: Enter Partner's code */}
                <form onSubmit={handleConnectCode} className="bg-black/20 border border-black/35 p-3 rounded-lg flex flex-col gap-2">
                  <span className="font-['Press_Start_2P'] text-[6px] text-[#ff69b4] font-bold">METODE B: MASUKKAN KODE PASANGAN</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={partnerCode}
                      onChange={(e) => setPartnerCode(e.target.value)}
                      placeholder="Contoh: SWEET-1234"
                      required
                      className="flex-1 px-2.5 py-1.5 bg-[#1a1a2a] border border-black rounded text-white font-['Press_Start_2P'] text-[9px] focus:outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/20 min-h-[32px]"
                    />
                    <PixelButton type="submit" disabled={isConnecting} className="text-[8px] px-3 shrink-0">
                      {isConnecting ? 'CONNECTING...' : 'HUBUNGKAN'}
                    </PixelButton>
                  </div>
                  <span className="font-['VT323'] text-xs text-[#a0a0b0]/55">
                    Masukkan kode couple yang digenerate oleh pasangan Anda di atas.
                  </span>
                </form>
              </div>
            )}
          </div>

          {/* Download App Box */}
          <div className="bg-[#121224] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0_#000] flex flex-col gap-3">
            <div className="border-b-2 border-black/35 pb-2 mb-1">
              <span className="font-['Press_Start_2P'] text-[8px] text-[#ff69b4] font-bold">
                DOWNLOAD PORTAL
              </span>
            </div>
            <p className="font-['VT323'] text-sm text-[#a0a0b0] leading-relaxed">
              Mainkan LoveStory secara normal, halus, dan responsif langsung di smartphone Anda sekarang!
            </p>
            <PixelButton onClick={handleDownload} className="w-full text-[10px] py-3.5 flex items-center justify-center gap-2">
              <Download className="h-4 w-4" /> UNDUH APLIKASI (APK)
            </PixelButton>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full py-3 font-['Press_Start_2P'] text-[9px] border-4 border-black bg-red-700 hover:bg-red-800 text-white shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 rounded cursor-pointer transition-all duration-100 flex items-center justify-center gap-2 font-bold min-h-[44px]"
          >
            <LogOut className="h-3.5 w-3.5" /> KELUAR AKUN
          </button>
        </div>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="z-10 py-4 text-center border-t-2 border-black/35 bg-[#121224]/30 select-none">
        <p className="font-['VT323'] text-xs text-[#a0a0b0]/40">
          © 2026 PIXEL LOVE | Companion Control
        </p>
      </footer>
    </div>
  );
};

export default ProfilePage;
