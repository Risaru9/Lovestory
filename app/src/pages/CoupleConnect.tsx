import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clipboard, HeartHandshake, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PixelButton } from '@/components/custom/PixelButton';

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
  const [wasConnected] = useState(isConnected);

  useEffect(() => {
    if (coupleInfo?.couple_code) setMyCode(coupleInfo.couple_code);
  }, [coupleInfo]);

  useEffect(() => {
    if (!isConnected) return;

    if (!wasConnected) {
      setJustConnected(true);
      const timer = setTimeout(() => navigate('/home', { replace: true }), 2500);
      return () => clearTimeout(timer);
    }

    navigate('/home', { replace: true });
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
    const { error: err } = await connectWithCode(inputCode.trim());

    if (err) {
      setError(err);
      setIsConnecting(false);
      return;
    }

    setJustConnected(true);
    await refreshCouple();
    setTimeout(() => navigate('/home', { replace: true }), 2000);
    setIsConnecting(false);
  };

  const handleCopy = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (justConnected) {
    return (
      <main className="ls-screen ls-safe flex items-center justify-center">
        <section className="text-center select-none">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[8px] border-4 border-[#05050A] bg-[#FF5FAE] shadow-[4px_4px_0_#05050A]">
            <HeartHandshake className="h-10 w-10 text-white" />
          </div>
          <h1 className="ls-title text-base leading-relaxed">CONNECTED</h1>
          <p className="mt-3 font-vt323 text-2xl text-[#FFD166]">Kalian sudah terhubung.</p>
          <p className="font-vt323 text-lg text-[#A9A5C4]">Menuju main menu...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="ls-screen ls-safe relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'url(/images/backgrounds/couple-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[#070712]/82" />

      <section className="relative z-10 w-full max-w-[460px] space-y-4">
        <header className="text-center select-none">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[8px] border-4 border-[#05050A] bg-[#141427] shadow-[4px_4px_0_#05050A]">
            <HeartHandshake className="h-8 w-8 text-[#FF5FAE]" />
          </div>
          <p className="ls-kicker">Two player setup</p>
          <h1 className="ls-title text-base leading-relaxed">COUPLE CONNECT</h1>
          <p className="ls-body mt-2 text-xl">Halo, {profile?.name ?? 'Player'}.</p>
        </header>

        <div className="ls-panel p-4">
          <div className="relative z-10 flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border-2 border-[#05050A] bg-[#FFD166] text-[#05050A]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-pixel text-[8px] leading-relaxed text-[#FFD166]">ATURAN PAIRING</p>
              <p className="font-vt323 text-lg leading-tight text-[#A9A5C4]">
                Cukup satu orang membuat kode. Pasangan memasukkan kode itu di perangkatnya.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <section className="ls-panel p-4">
            <div className="relative z-10 space-y-3">
              <div>
                <p className="ls-kicker text-[#FFD166]">Opsi A</p>
                <h2 className="font-pixel text-[10px] leading-relaxed text-white">Buat kode undangan</h2>
                <p className="ls-body text-lg">Pakai ini jika kamu adalah orang pertama yang menyiapkan koneksi.</p>
              </div>

              {myCode ? (
                <div className="flex gap-2">
                  <div className="ls-input flex flex-1 items-center justify-center font-pixel text-[12px] tracking-widest text-[#5AD7FF]">
                    {myCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ls-mobile-hit rounded-[8px] border-4 border-[#05050A] bg-[#141427] px-4 text-white shadow-[3px_3px_0_#05050A] transition active:translate-x-0.5 active:translate-y-0.5"
                    aria-label="Salin kode couple"
                  >
                    {copied ? 'OK' : <Clipboard className="h-5 w-5" />}
                  </button>
                </div>
              ) : (
                <PixelButton onClick={handleGenerateCode} disabled={isGenerating} className="w-full">
                  {isGenerating ? 'MEMBUAT...' : 'BUAT KODE SAYA'}
                </PixelButton>
              )}
            </div>
          </section>

          <section className="ls-panel p-4">
            <form onSubmit={handleConnect} className="relative z-10 space-y-3">
              <div>
                <p className="ls-kicker">Opsi B</p>
                <h2 className="font-pixel text-[10px] leading-relaxed text-white">Masukkan kode pasangan</h2>
                <p className="ls-body text-lg">Gunakan opsi ini jika pasanganmu sudah mengirim kode.</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="LOVE-1234"
                  maxLength={16}
                  className="ls-input flex-1 font-pixel text-[10px] uppercase tracking-widest"
                />
                <PixelButton type="submit" disabled={isConnecting || !inputCode.trim()} className="px-4">
                  {isConnecting ? '...' : 'LINK'}
                </PixelButton>
              </div>
            </form>
          </section>
        </div>

        {error && (
          <div className="rounded-[8px] border-2 border-[#FF6B6B] bg-[#2A1118] px-3 py-2">
            <p className="font-vt323 text-lg font-bold text-[#FF8D9E]">{error}</p>
          </div>
        )}

        {isConnected && partner && (
          <div className="rounded-[8px] border-2 border-[#54D6A4] bg-[#0E241D] p-3 text-center">
            <p className="font-vt323 text-lg font-bold text-[#54D6A4]">Sudah terhubung dengan {partner.name}.</p>
          </div>
        )}

        <button
          type="button"
          onClick={signOut}
          className="mx-auto flex items-center gap-2 font-vt323 text-lg text-[#A9A5C4]/70 transition hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Keluar dari akun
        </button>
      </section>
    </main>
  );
};

export default CoupleConnect;
