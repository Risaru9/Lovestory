import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Heart, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PixelButton } from '@/components/custom/PixelButton';

const AuthPage: React.FC = () => {
  const { user, isLoading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="ls-screen flex items-center justify-center">
        <p className="font-pixel text-[10px] text-[#FF5FAE] animate-pulse">LOADING...</p>
      </div>
    );
  }

  if (user) return <Navigate to="/profile" replace />;

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Nama karakter harus diisi.');
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError('Password minimal 6 karakter.');
        setIsSubmitting(false);
        return;
      }

      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) {
        setError(signUpError);
      } else {
        setSuccess('Akun berhasil dibuat. Cek email untuk verifikasi, lalu login.');
        setMode('login');
      }
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) setError(signInError);
    }

    setIsSubmitting(false);
  };

  return (
    <main className="ls-screen ls-safe relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-35"
        style={{ backgroundImage: 'url(/images/backgrounds/home-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[#070712]/80" />

      <section className="relative z-10 w-full max-w-[420px] space-y-5">
        <div className="flex flex-col items-center text-center select-none">
          <div className="ls-pixel-logo mb-4">
            <Heart className="h-10 w-10 fill-[#FF5FAE] text-[#FF2F93] drop-shadow-[2px_2px_0_#FFD166]" />
          </div>
          <p className="ls-kicker">Welcome back to</p>
          <h1 className="ls-title text-lg leading-relaxed">LOVE STORY</h1>
          <p className="ls-body mt-2 max-w-xs text-xl">
            {mode === 'login' ? 'Masuk ke dunia kecil kalian.' : 'Buat karakter baru untuk mulai bertualang.'}
          </p>
        </div>

        <div className="ls-panel p-4 sm:p-5">
          <div className="relative z-10 mb-5 grid grid-cols-2 gap-2 rounded-[8px] border-2 border-[#05050A] bg-[#0A0A18] p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`ls-mobile-hit rounded-[6px] font-pixel text-[9px] transition ${mode === 'login' ? 'bg-[#FF5FAE] text-[#05050A]' : 'text-[#A9A5C4] hover:text-white'}`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`ls-mobile-hit rounded-[6px] font-pixel text-[9px] transition ${mode === 'register' ? 'bg-[#FF5FAE] text-[#05050A]' : 'text-[#A9A5C4] hover:text-white'}`}
            >
              DAFTAR
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="mb-2 flex items-center gap-2 font-pixel text-[8px] text-[#FF5FAE]">
                  <UserRound className="h-3.5 w-3.5" /> NAMA KARAKTER
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama kamu"
                  className="ls-input"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-pixel text-[8px] text-[#FF5FAE]">
                <Mail className="h-3.5 w-3.5" /> EMAIL
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@kamu.com"
                required
                className="ls-input"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-pixel text-[8px] text-[#FF5FAE]">
                <LockKeyhole className="h-3.5 w-3.5" /> PASSWORD
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                className="ls-input"
              />
            </label>

            {error && (
              <div className="rounded-[8px] border-2 border-[#FF6B6B] bg-[#2A1118] px-3 py-2">
                <p className="font-vt323 text-base font-bold text-[#FF8D9E]">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-[8px] border-2 border-[#54D6A4] bg-[#0E241D] px-3 py-2">
                <p className="font-vt323 text-base font-bold text-[#54D6A4]">{success}</p>
              </div>
            )}

            <PixelButton type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'MEMPROSES...' : mode === 'login' ? 'MASUK' : 'BUAT AKUN'}
            </PixelButton>
          </form>
        </div>

        <p className="text-center font-vt323 text-base text-[#A9A5C4]/55">
          Private retro world for two players.
        </p>
      </section>
    </main>
  );
};

export default AuthPage;
