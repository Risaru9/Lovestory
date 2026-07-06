import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="font-['Press_Start_2P'] text-[#FF69B4] text-xs animate-pulse">
          LOADING...
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/profile" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Nama karakter harus diisi!');
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError('Password minimal 6 karakter!');
        setIsSubmitting(false);
        return;
      }
      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) {
        setError(signUpError);
      } else {
        setSuccess('Akun berhasil dibuat! Silakan cek email untuk verifikasi, lalu login.');
        setMode('login');
      }
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0c0a18] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-ping"
            style={{
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
              background: i % 2 === 0 ? '#ff69b4' : '#ffb300',
              opacity: 0.15,
              left: `${(i * 8.5) % 100}%`,
              top: `${(i * 13 + 10) % 100}%`,
              animationDuration: `${2 + (i % 3)}s`,
              animationDelay: `${(i * 0.3) % 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Title */}
        <div className="text-center mb-6 sm:mb-8 select-none">
          <h1 className="font-['Press_Start_2P'] text-[#ffffff] text-base md:text-lg leading-loose drop-shadow-[2px_2px_0_#ff69b4] font-bold">
            💕 LOVE STORY
          </h1>
          <p className="font-['VT323'] text-[#ffb300] text-xl mt-1 sm:mt-2 font-bold">
            {mode === 'login' ? 'Masuk ke Dunia Kita' : 'Buat Karakter Baru'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#121224] border-2 sm:border-4 border-[#000000] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-[2px_2px_0_#000000] sm:shadow-[4px_4px_0_#000000]">
          {/* Toggle buttons */}
          <div className="flex rounded-lg overflow-hidden border-2 border-[#000000] mb-5 sm:mb-6 select-none">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2.5 font-['Press_Start_2P'] text-[9px] transition-all duration-200 font-bold min-h-[44px] ${
                mode === 'login'
                  ? 'bg-[#ff69b4] text-[#000000]'
                  : 'bg-transparent text-[#ff69b4]/60 hover:text-[#ff69b4]'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2.5 font-['Press_Start_2P'] text-[9px] transition-all duration-200 font-bold min-h-[44px] ${
                mode === 'register'
                  ? 'bg-[#ff69b4] text-[#000000]'
                  : 'bg-transparent text-[#ff69b4]/60 hover:text-[#ff69b4]'
              }`}
            >
              DAFTAR
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 font-bold">
                  NAMA KARAKTER
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama kamu..."
                  className="w-full px-3 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-lg text-white font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/30 transition-colors min-h-[44px]"
                />
              </div>
            )}

            <div>
              <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 font-bold">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@kamu.com"
                required
                className="w-full px-3 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-lg text-white font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/30 transition-colors min-h-[44px]"
              />
            </div>

            <div>
              <label className="block font-['Press_Start_2P'] text-[8px] text-[#ff69b4] mb-2 font-bold">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-lg text-white font-['VT323'] text-base focus:outline-none focus:border-[#ff69b4] placeholder:text-[#a0a0b0]/30 transition-colors min-h-[44px]"
              />
              {mode === 'register' && (
                <p className="font-['VT323'] text-[#a0a0b0] text-sm mt-1">Minimal 6 karakter</p>
              )}
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="font-['VT323'] text-red-400 text-base font-bold">⚠ {error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-950/20 border border-green-500/20 rounded-lg px-3 py-2">
                <p className="font-['VT323'] text-green-400 text-base font-bold">✓ {success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#ff69b4] hover:bg-[#ff69b4]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-['Press_Start_2P'] text-[10px] text-[#000000] transition-all duration-200 shadow-[2px_2px_0_#000000] sm:shadow-[4px_4px_0_#000000] active:scale-95 border-2 border-[#000000] font-bold min-h-[44px]"
            >
              {isSubmitting
                ? 'MEMPROSES...'
                : mode === 'login' ? '▶ MASUK' : '✨ DAFTAR'
              }
            </button>
          </form>
        </div>

        <p className="text-center font-['VT323'] text-[#a0a0b0]/30 text-base mt-4">
          Made with 💕 for us
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
