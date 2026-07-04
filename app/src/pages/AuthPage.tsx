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

  if (user) return <Navigate to="/home" replace />;

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
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-ping"
            style={{
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
              background: i % 2 === 0 ? '#FF69B4' : '#FFD700',
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
        <div className="text-center mb-8">
          <h1 className="font-['Press_Start_2P'] text-[#FF69B4] text-base md:text-lg leading-loose">
            💕 LOVE STORY
          </h1>
          <p className="font-['VT323'] text-[#FFD700] text-xl mt-2">
            {mode === 'login' ? 'Masuk ke Dunia Kita' : 'Buat Karakter Baru'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111327] border-4 border-[#FF69B4] rounded-2xl p-6 shadow-[0_0_40px_rgba(255,105,180,0.25)]">
          {/* Toggle buttons */}
          <div className="flex rounded-lg overflow-hidden border-2 border-[#FF69B4]/40 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 font-['Press_Start_2P'] text-[9px] transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-[#FF69B4] text-white'
                  : 'bg-transparent text-[#FF69B4]/60 hover:text-[#FF69B4]'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 font-['Press_Start_2P'] text-[9px] transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-[#FF69B4] text-white'
                  : 'bg-transparent text-[#FF69B4]/60 hover:text-[#FF69B4]'
              }`}
            >
              DAFTAR
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-2">
                  NAMA KARAKTER
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama kamu..."
                  className="w-full px-3 py-2.5 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4] placeholder:text-white/30 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-2">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@kamu.com"
                required
                className="w-full px-3 py-2.5 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4] placeholder:text-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 bg-black/40 border-2 border-white/10 rounded-lg text-white font-['VT323'] text-lg focus:outline-none focus:border-[#FF69B4] placeholder:text-white/30 transition-colors"
              />
              {mode === 'register' && (
                <p className="font-['VT323'] text-white/40 text-sm mt-1">Minimal 6 karakter</p>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2">
                <p className="font-['VT323'] text-red-400 text-base">⚠ {error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-900/30 border border-green-500/40 rounded-lg px-3 py-2">
                <p className="font-['VT323'] text-green-400 text-base">✓ {success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#FF69B4] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-['Press_Start_2P'] text-[10px] text-white transition-all duration-200 shadow-[0_4px_0px_#c0486f] hover:shadow-[0_2px_0px_#c0486f] hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
            >
              {isSubmitting
                ? 'MEMPROSES...'
                : mode === 'login' ? '▶ MASUK' : '✨ DAFTAR'
              }
            </button>
          </form>
        </div>

        <p className="text-center font-['VT323'] text-white/30 text-base mt-4">
          Made with 💕 for us
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
