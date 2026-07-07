import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { Smartphone, Download, ArrowLeft, User } from 'lucide-react';

const MobileOnly: React.FC = () => {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[#0c0a18] flex flex-col justify-between text-white relative overflow-hidden select-none">
      {/* Scanline pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 4px)' }}
      />

      {/* Floating retro bubbles background */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bounce"
            style={{
              width: `${6 + (i % 2) * 4}px`,
              height: `${6 + (i % 2) * 4}px`,
              background: i % 2 === 0 ? '#ff69b4' : '#00bcd4',
              opacity: 0.1,
              left: `${(i * 12.5) % 100}%`,
              top: `${(i * 19 + 20) % 100}%`,
              animationDuration: `${3 + (i % 2) * 2}s`,
            }}
          />
        ))}
      </div>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="z-10 border-b-4 border-black bg-[#121224] px-4 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <PixelButton onClick={() => navigate('/')} variant="secondary" size="sm" className="text-[9px]">
            <ArrowLeft className="h-3 w-3 mr-1" /> UTAMA
          </PixelButton>
          <span className="font-['Press_Start_2P'] text-[9px] text-[#ffb300] font-bold">
            MOBILE ONLY NOTICE
          </span>
          <PixelButton onClick={() => navigate('/profile')} variant="primary" size="sm" className="text-[9px]">
            <User className="h-3 w-3 mr-1" /> PROFIL
          </PixelButton>
        </div>
      </header>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <main className="z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto gap-6">
        {/* Animated Mobile Device Icon */}
        <div className="relative mb-2">
          <div className="absolute inset-0 bg-[#ff69b4]/20 rounded-full blur-xl scale-125 animate-pulse" />
          <div className="relative border-4 border-black bg-[#121224] p-5 rounded-2xl shadow-[4px_4px_0_#000]">
            <Smartphone className="h-16 w-16 text-[#ff69b4] animate-bounce" />
          </div>
        </div>

        <div>
          <h2 className="font-['Press_Start_2P'] text-sm text-white mb-3 drop-shadow-[1.5px_1.5px_0_#ff69b4] leading-relaxed">
            FITUR KHUSUS HAMPIR SIAP!
          </h2>
          <p className="font-['VT323'] text-base text-[#a0a0b0] leading-relaxed">
            Fitur game arcade, obrolan real-time, daily check-in, dan timeline memori dirancang khusus untuk pengalaman mobile terbaik dan hanya dapat diakses melalui **Aplikasi Native (Android & iOS)**.
          </p>
        </div>

        {/* Action card */}
        <div className="w-full bg-[#121224] border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_#000] flex flex-col gap-4">
          <div className="text-left border-b-2 border-black/35 pb-2 mb-1">
            <span className="font-['Press_Start_2P'] text-[7px] text-[#00bcd4] font-bold">
              DOWNLOAD APPLICATION
            </span>
          </div>

          <p className="font-['VT323'] text-sm text-[#a0a0b0] text-left leading-normal">
            Unduh file installer Android (APK) sekarang untuk mengakses seluruh petualangan kita secara lengkap!
          </p>

          <PixelButton onClick={handleDownload} size="lg" className="w-full text-xs py-3.5 flex items-center justify-center gap-2">
            <Download className="h-4 w-4" /> UNDUH APK SEKARANG
          </PixelButton>
        </div>

        {/* Small hint */}
        <p className="font-['VT323'] text-xs text-[#a0a0b0]/40">
          Gunakan menu **Profil** di pojok kanan atas untuk tetap mengelola username atau keluar akun dari web portal.
        </p>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="z-10 py-4 text-center border-t-2 border-black/35 bg-[#121224]/30 select-none">
        <p className="font-['VT323'] text-xs text-[#a0a0b0]/40">
          © 2026 PIXEL LOVE | Companion Portal
        </p>
      </footer>
    </div>
  );
};

export default MobileOnly;
