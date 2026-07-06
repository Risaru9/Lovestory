import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PixelButton } from '@/components/custom/PixelButton';
import { Download, User, BookOpen, Star, HelpCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/download/lovestory.zip';
    link.download = 'lovestory.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGoToApp = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    { icon: '🗒', title: 'Daily Check-in', desc: 'Ekspresikan perasaan harianmu menggunakan 19 pilihan karakter pixel art lucu dan catat suasana hatimu pada kalender bersama.' },
    { icon: '💬', title: 'Couple Chat & Delayed Mail', desc: 'Kirim pesan instan dengan indikator status baterai pasangan, atau kirim surat cinta romantis yang terkunci waktu.' },
    { icon: '🎮', title: 'Arcade Playroom & Mini Games', desc: 'Mainkan mini game retro, putar roda keberuntungan ide kencan, atau rawat hewan peliharaan virtual bersama pasangan.' },
    { icon: '🎨', title: 'Doodle Duet Canvas', desc: 'Kanvas piksel kolaboratif real-time untuk menggambar ilustrasi retro manis berdua bersama pasangan.' },
    { icon: '📍', title: 'Location Sync Map', desc: 'Pantau posisi real-time pasanganmu di peta interaktif retro, lengkap dengan status fokus dan jarak.' },
    { icon: '🔒', title: 'Time Capsule & Dream Vault', desc: 'Kunci pesan cinta untuk dibuka di masa depan, raih achievements romantis, dan catat impian masa depan berdua.' }
  ];

  return (
    <div className="min-h-screen bg-[#0c0a18] text-white flex flex-col justify-between relative select-none">
      {/* Scanline pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 4px)' }}
      />

      {/* Floating hearts particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${10 + (i % 2) * 5}px`,
              height: `${10 + (i % 2) * 5}px`,
              background: '#ff69b4',
              opacity: 0.08,
              left: `${(i * 18) % 100}%`,
              top: `${(i * 22 + 10) % 100}%`,
              animationDuration: `${4 + i}s`,
            }}
          />
        ))}
      </div>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b-4 border-black bg-[#121224]/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-sm">💕</span>
            <span className="font-['Press_Start_2P'] text-[9px] sm:text-[11px] text-white font-bold drop-shadow-[1.5px_1.5px_0_#ff69b4]">
              LOVE STORY
            </span>
          </div>
          <PixelButton onClick={handleGoToApp} variant="primary" size="sm" className="text-[9px]">
            <User className="h-3 w-3 mr-1" /> {user ? 'PROFIL SAYA' : 'MASUK AKUN'}
          </PixelButton>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-12">

        {/* ── HERO SECTION ────────────────────────────────────────────────── */}
        <section className="text-center py-6 sm:py-10 flex flex-col items-center gap-4 sm:gap-6">
          <div className="animate-bounce mb-2">
            <span className="text-5xl md:text-6xl drop-shadow-[3px_3px_0_#000]">👾</span>
          </div>
          <div>
            <h1 className="font-['Press_Start_2P'] text-lg sm:text-2xl md:text-4xl leading-tight text-white drop-shadow-[2.5px_2.5px_0_#ff69b4] font-bold">
              PIXEL LOVE STORY
            </h1>
            <p className="font-['VT323'] text-lg sm:text-xl text-[#ffb300] mt-2 tracking-wide font-bold">
              Ruang Cinta Retro 8-Bit untuk Kamu dan Pasanganmu
            </p>
          </div>
          <p className="font-['VT323'] text-base text-[#a0a0b0] max-w-lg leading-relaxed">
            LoveStory adalah aplikasi pasangan interaktif bergaya RPG piksel modern. Sinkronkan perasaan Anda, mainkan game, buat memori, dan tetap terhubung secara mendalam dari genggaman HP Anda.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
            <PixelButton onClick={handleDownload} size="lg" className="flex-1 text-xs py-3.5 flex items-center justify-center gap-2">
              <Download className="h-4 w-4" /> DOWNLOAD ZIP (APK)
            </PixelButton>
            <PixelButton onClick={handleGoToApp} variant="secondary" size="lg" className="flex-1 text-xs py-3.5 flex items-center justify-center gap-2">
              <User className="h-4 w-4" /> KELOLA AKUN WEB
            </PixelButton>
          </div>
        </section>

        {/* ── FEATURES GRID ───────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="border-b-4 border-black pb-2.5 flex items-center gap-2">
            <Star className="h-5 w-5 text-[#ffb300]" />
            <h2 className="font-['Press_Start_2P'] text-[10px] sm:text-xs text-white font-bold uppercase select-none">
              FITUR UTAMA APLIKASI NATIVE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-[#121224] border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_#000] flex gap-3.5"
              >
                <span className="text-3xl shrink-0 select-none">{feat.icon}</span>
                <div className="space-y-1">
                  <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold">{feat.title}</h3>
                  <p className="font-['VT323'] text-sm sm:text-base text-[#a0a0b0] leading-normal">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── USER GUIDE SECTION ──────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="border-b-4 border-black pb-2.5 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#00bcd4]" />
            <h2 className="font-['Press_Start_2P'] text-[10px] sm:text-xs text-white font-bold uppercase select-none">
              PANDUAN MULAI CEPAT (HP)
            </h2>
          </div>

          <div className="bg-[#121224] border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_#000] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'UNDUH ZIP', desc: 'Unduh file ZIP berisi installer aplikasi LoveStory.' },
                { step: '2', title: 'EKSTRAK APK', desc: 'Ekstrak file ZIP untuk mendapatkan installer lovestory.apk.' },
                { step: '3', title: 'INSTAL DI HP', desc: 'Buka file APK tersebut di HP Android Anda untuk memasangnya.' },
                { step: '4', title: 'PAIRING KODE', desc: 'Buka aplikasi HP, masuk akun, dan hubungkan dengan pasangan.' }
              ].map((item, idx) => (
                <div key={idx} className="relative p-3 bg-black/15 rounded-lg border border-black/30 flex flex-col gap-2">
                  <div className="absolute top-2 right-2 font-['Press_Start_2P'] text-[10px] text-[#00bcd4] bg-[#00bcd4]/10 h-5 w-5 rounded-full flex items-center justify-center border border-[#00bcd4]/30 font-bold">
                    {item.step}
                  </div>
                  <span className="font-['Press_Start_2P'] text-[7px] text-[#ffb300] font-bold block pr-6 leading-tight">
                    {item.title}
                  </span>
                  <p className="font-['VT323'] text-xs text-[#a0a0b0] leading-normal">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ / TIPS ──────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="border-b-4 border-black pb-2.5 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#4caf50]" />
            <h2 className="font-['Press_Start_2P'] text-[10px] sm:text-xs text-white font-bold uppercase select-none">
              INFORMASI & BANTUAN
            </h2>
          </div>

          <div className="bg-[#121224] border-4 border-black p-4 rounded-xl shadow-[3px_3px_0_#000] space-y-3.5">
            <div className="space-y-1">
              <h4 className="font-['Press_Start_2P'] text-[7px] text-white font-bold">Q: Apakah data saya aman dan sinkron?</h4>
              <p className="font-['VT323'] text-sm text-[#a0a0b0] leading-normal">
                A: Ya! Seluruh akun, chat, check-in, dan log romantis disinkronkan secara aman melalui database real-time cloud kami. Jadi saat Anda berganti dari web ke aplikasi HP, data Anda tetap utuh.
              </p>
            </div>
            <div className="border-t border-black/35 my-2" />
            <div className="space-y-1">
              <h4 className="font-['Press_Start_2P'] text-[7px] text-white font-bold">Q: Bagaimana cara menginstal aplikasi dari file ZIP?</h4>
              <p className="font-['VT323'] text-sm text-[#a0a0b0] leading-normal">
                A: Setelah unduhan ZIP selesai, ekstrak file ZIP tersebut (atau gunakan File Manager bawaan HP) untuk mendapatkan berkas `lovestory.apk`. Klik file APK tersebut. Jika muncul peringatan keamanan, izinkan "Instal aplikasi dari sumber tidak dikenal" (Install from Unknown Sources) di pengaturan HP Anda.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="z-10 py-5 text-center border-t-4 border-black bg-[#121224] select-none mt-10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-['VT323'] text-sm text-[#a0a0b0]">
            © 2026 PIXEL LOVE | Made with 💕 for couples
          </p>
          <div className="flex gap-4">
            <button onClick={handleDownload} className="font-['VT323'] text-sm text-[#ff69b4] hover:underline cursor-pointer">
              Download Android App
            </button>
            <span className="text-[#a0a0b0]/20">|</span>
            <button onClick={handleGoToApp} className="font-['VT323'] text-sm text-[#ff69b4] hover:underline cursor-pointer">
              Account Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
