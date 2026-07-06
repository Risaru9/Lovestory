import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const CoupleConnect: React.FC = () => {
  const navigate = useNavigate();
  const { profile, coupleInfo, partner, isConnected, generateCoupleCode, connectWithCode, refreshCouple, signOut } = useAuth();

  const [myCode, setMyCode] = useState<string | null>(coupleInfo?.couple_code ?? null);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sinkronkan kode dari coupleInfo
  useEffect(() => {
    if (coupleInfo?.couple_code) {
      setMyCode(coupleInfo.couple_code);
    }
  }, [coupleInfo]);

  const [wasConnected] = useState(isConnected);

  // Jika status terhubung berubah secara real-time
  useEffect(() => {
    if (isConnected) {
      if (!wasConnected) {
        // Terjadi pairing secara real-time (User A yang menunggu kode di-link oleh User B)
        setJustConnected(true);
        const timer = setTimeout(() => {
          navigate('/home', { replace: true });
        }, 2500);
        return () => clearTimeout(timer);
      } else {
        // Sudah terhubung dari awal (misal terakses manual)
        navigate('/home', { replace: true });
      }
    }
  }, [isConnected, wasConnected, navigate]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setError(null);
    const { code, error: err } = await generateCoupleCode();
    if (err) setError(err);
    else setMyCode(code);
    setIsGenerating(false);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsConnecting(true);
    setError(null);

    const { error: err } = await connectWithCode(inputCode);
    if (err) {
      setError(err);
      setIsConnecting(false);
      return;
    }

    // Berhasil! Tampilkan animasi connected
    setJustConnected(true);

    // Refresh state couple lalu navigasi ke home
    await refreshCouple();
    setTimeout(() => navigate('/home', { replace: true }), 2000);
    setIsConnecting(false);
  };

  const handleCopy = () => {
    if (myCode) {
      navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Tampilan animasi CONNECTED
  if (justConnected) {
    return (
      <div className="min-h-screen bg-[#0c0a18] flex items-center justify-center p-4">
        <div className="text-center space-y-6 select-none">
          <div className="text-6xl animate-bounce">💕</div>
          <h2 className="font-['Press_Start_2P'] text-[#ff69b4] text-sm md:text-lg leading-loose font-bold">
            CONNECTED!
          </h2>
          <p className="font-['VT323'] text-[#ffb300] text-2xl font-bold">
            Selamat! Kalian sudah terhubung 🎉
          </p>
          <p className="font-['VT323'] text-[#a0a0b0] text-lg font-semibold">
            Menuju halaman utama...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a18] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-black/[0.05]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center mb-6 select-none">
          <h1 className="font-['Press_Start_2P'] text-[#ffffff] text-xs md:text-base leading-loose drop-shadow-[2px_2px_0_#ff69b4] font-bold">
            💑 COUPLE CONNECT
          </h1>
          <p className="font-['VT323'] text-[#a0a0b0] text-xl mt-1 font-semibold">
            Halo, {profile?.name ?? 'Pengguna'}!
          </p>
        </div>

        {/* INSTRUKSI PENTING */}
        <div className="bg-[#121224] border-2 sm:border-4 border-[#000000] rounded-xl p-4 shadow-[2px_2px_0_#000000] sm:shadow-[4px_4px_0_#000000] text-center">
          <p className="font-['VT323'] text-[#ffb300] text-lg font-bold">
            📌 Hanya <strong>SATU ORANG</strong> yang membuat kode.
          </p>
          <p className="font-['VT323'] text-[#a0a0b0] text-base mt-1 font-semibold">
            Satu buat kode → kirim ke pasangan → pasangan masukkan kode tersebut.
          </p>
        </div>

        {/* Opsi A: Buat kode (untuk orang pertama) */}
        <div className="bg-[#121224] border-2 sm:border-4 border-[#000000] rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-[2px_2px_0_#000000] sm:shadow-[4px_4px_0_#000000]">
          <h2 className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] mb-3 font-bold">
            OPSI A: BUAT KODE
          </h2>
          <p className="font-['VT323'] text-[#a0a0b0] text-base mb-3 font-semibold">
            Klik tombol ini, lalu kirimkan kode yang muncul ke pasangan kamu.
          </p>

          {myCode ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#1a1a2a] border-2 border-[#000000] rounded-lg px-4 py-2.5 sm:py-3 text-center min-h-[44px] flex items-center justify-center">
                <span className="font-['Press_Start_2P'] text-[#ff69b4] text-xs sm:text-sm tracking-widest font-bold">
                  {myCode}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 sm:py-3 bg-[#ff69b4]/10 border border-[#000000] rounded-lg font-['VT323'] text-sm text-[#ff69b4] hover:bg-[#ff69b4]/20 transition-colors font-bold shadow-[2px_2px_0_#000000] min-h-[44px]"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="w-full py-3 bg-[#ff69b4] rounded-lg font-['Press_Start_2P'] text-[9px] text-[#000000] disabled:opacity-50 hover:bg-[#ff69b4]/90 transition-all border-2 border-[#000000] shadow-[2px_2px_0_#000000] sm:shadow-[4px_4px_0_#000000] font-bold min-h-[44px]"
            >
              {isGenerating ? 'MEMBUAT KODE...' : '✨ BUAT KODE SAYA'}
            </button>
          )}

          {myCode && (
            <p className="font-['VT323'] text-[#a0a0b0]/60 text-sm mt-2 text-center select-none font-semibold">
              Menunggu pasangan memasukkan kode ini...
            </p>
          )}
        </div>

        {/* Opsi B: Masukkan kode pasangan */}
        <div className="bg-[#121224] border-2 sm:border-4 border-[#000000] rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-[2px_2px_0_#000000] sm:shadow-[4px_4px_0_#000000]">
          <h2 className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] mb-3 font-bold">
            OPSI B: MASUKKAN KODE PASANGAN
          </h2>
          <p className="font-['VT323'] text-[#a0a0b0] text-base mb-3 font-semibold">
            Pasangan kamu sudah buat kode? Masukkan di sini.
          </p>

          <form onSubmit={handleConnect} className="flex gap-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="LOVE-1234"
              maxLength={12}
              className="flex-1 px-3 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-lg text-white font-['Press_Start_2P'] text-[9px] sm:text-[10px] focus:outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/20 uppercase tracking-wider transition-colors min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isConnecting || !inputCode.trim()}
              className="px-4 py-2.5 bg-[#ff69b4] rounded-lg font-['Press_Start_2P'] text-[9px] text-[#000000] disabled:opacity-50 hover:bg-[#ff69b4]/90 transition-all border-2 border-[#000000] shadow-[2px_2px_0_#000000] font-bold min-h-[44px]"
            >
              {isConnecting ? '...' : 'LINK!'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="font-['VT323'] text-red-400 text-lg font-bold">⚠ {error}</p>
          </div>
        )}

        {/* Already connected indicator */}
        {isConnected && partner && (
          <div className="bg-green-950/20 border border-green-500/20 rounded-xl sm:rounded-2xl p-4 text-center">
            <p className="font-['VT323'] text-green-400 text-lg font-bold">
              💕 Sudah terhubung dengan {partner.name}!
            </p>
            <button
              onClick={() => navigate('/home', { replace: true })}
              className="mt-2 font-['VT323'] text-[#ffb300] text-lg underline font-bold"
            >
              Lanjut ke Beranda →
            </button>
          </div>
        )}

        {/* Sign out */}
        <div className="text-center pt-2 select-none animate-pulse">
          <button
            onClick={signOut}
            className="font-['VT323'] text-[#a0a0b0]/40 hover:text-white/60 text-lg transition-colors font-bold"
          >
            Keluar dari akun
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoupleConnect;
