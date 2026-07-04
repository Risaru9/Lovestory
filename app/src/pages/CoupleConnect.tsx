import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const CoupleConnect: React.FC = () => {
  const navigate = useNavigate();
  const { profile, coupleInfo, partner, isConnected, generateCoupleCode, connectWithCode, signOut } = useAuth();

  const [myCode, setMyCode] = useState<string | null>(coupleInfo?.couple_code ?? null);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (coupleInfo?.couple_code) {
      setMyCode(coupleInfo.couple_code);
    }
  }, [coupleInfo]);

  // Jika sudah connected, navigasi ke home
  useEffect(() => {
    if (isConnected && !justConnected) {
      navigate('/home');
    }
  }, [isConnected, justConnected, navigate]);

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
    } else {
      setJustConnected(true);
      setTimeout(() => navigate('/home'), 2500);
    }
    setIsConnecting(false);
  };

  const handleCopy = () => {
    if (myCode) {
      navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (justConnected) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="text-6xl animate-bounce">💕</div>
          <h2 className="font-['Press_Start_2P'] text-[#FF69B4] text-sm md:text-lg leading-loose">
            CONNECTED!
          </h2>
          <p className="font-['VT323'] text-[#FFD700] text-2xl">
            Selamat! Kalian sudah terhubung 🎉
          </p>
          <p className="font-['VT323'] text-white/50 text-lg">
            Menuju halaman utama...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-['Press_Start_2P'] text-[#FF69B4] text-xs md:text-base leading-loose">
            💑 COUPLE CONNECT
          </h1>
          <p className="font-['VT323'] text-white/60 text-xl mt-1">
            Halo, {profile?.name ?? 'Pengguna'}!
          </p>
        </div>

        {/* Step 1: Kode milik saya */}
        <div className="bg-[#111327] border-2 border-[#FF69B4]/50 rounded-2xl p-5">
          <h2 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-3">
            KODE SAYA
          </h2>
          <p className="font-['VT323'] text-white/60 text-base mb-3">
            Bagikan kode ini kepada pasangan kamu agar bisa terhubung.
          </p>

          {myCode ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black/40 border-2 border-[#FF69B4] rounded-lg px-4 py-3 text-center">
                <span className="font-['Press_Start_2P'] text-[#FF69B4] text-sm tracking-widest">
                  {myCode}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-3 bg-[#FF69B4]/20 border border-[#FF69B4]/40 rounded-lg font-['VT323'] text-sm text-[#FF69B4] hover:bg-[#FF69B4]/30 transition-colors"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="w-full py-3 bg-[#FF69B4] rounded-lg font-['Press_Start_2P'] text-[9px] text-white disabled:opacity-50 hover:brightness-110 transition-all shadow-[0_4px_0px_#c0486f] hover:translate-y-0.5 hover:shadow-[0_2px_0px_#c0486f] active:translate-y-1 active:shadow-none"
            >
              {isGenerating ? 'MEMBUAT KODE...' : '✨ BUAT KODE SAYA'}
            </button>
          )}
        </div>

        {/* Step 2: Masukkan kode pasangan */}
        <div className="bg-[#111327] border-2 border-[#00CED1]/50 rounded-2xl p-5">
          <h2 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-3">
            MASUKKAN KODE PASANGAN
          </h2>
          <p className="font-['VT323'] text-white/60 text-base mb-3">
            Jika pasangan kamu sudah punya kode, masukkan di sini.
          </p>

          <form onSubmit={handleConnect} className="flex gap-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="LOVE-1234"
              maxLength={12}
              className="flex-1 px-3 py-2.5 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['Press_Start_2P'] text-[10px] focus:outline-none focus:border-[#00CED1] placeholder:text-white/20 uppercase tracking-wider transition-colors"
            />
            <button
              type="submit"
              disabled={isConnecting || !inputCode.trim()}
              className="px-4 py-2.5 bg-[#00CED1] rounded-lg font-['Press_Start_2P'] text-[9px] text-white disabled:opacity-50 hover:brightness-110 transition-all shadow-[0_4px_0px_#009ea3] hover:translate-y-0.5 hover:shadow-[0_2px_0px_#009ea3] active:translate-y-1 active:shadow-none"
            >
              {isConnecting ? '...' : 'LINK!'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-4 py-3">
            <p className="font-['VT323'] text-red-400 text-lg">⚠ {error}</p>
          </div>
        )}

        {/* Already connected? */}
        {isConnected && partner && (
          <div className="bg-green-900/30 border border-green-500/40 rounded-2xl p-4 text-center">
            <p className="font-['VT323'] text-green-400 text-lg">
              💕 Sudah terhubung dengan {partner.name}!
            </p>
            <button
              onClick={() => navigate('/home')}
              className="mt-2 font-['VT323'] text-[#FFD700] text-lg underline"
            >
              Lanjut ke Beranda →
            </button>
          </div>
        )}

        {/* Sign out */}
        <div className="text-center pt-2">
          <button
            onClick={signOut}
            className="font-['VT323'] text-white/30 hover:text-white/60 text-lg transition-colors"
          >
            Keluar dari akun
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoupleConnect;
