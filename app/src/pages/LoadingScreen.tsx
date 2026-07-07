import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Heart, ImageIcon, MapPin, MessageCircle, Music2, Sparkles, User } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { PixelButton } from '@/components/custom/PixelButton';

const features = [
  { icon: MessageCircle, title: 'Connection', text: 'Chat, check-in mood, dan surat waktu.' },
  { icon: ImageIcon, title: 'Memories', text: 'Gallery, timeline, dan chapter kisah.' },
  { icon: Sparkles, title: 'Playroom', text: 'Quiz, doodle, wheel, dan mini game.' },
  { icon: MapPin, title: 'Together', text: 'Map tracker dan status pasangan.' },
  { icon: Music2, title: 'Music Room', text: 'BGM retro romantis untuk momen kalian.' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDownload = () => {
    const url = 'https://github.com/Risaru9/Lovestory/releases/download/v1.0.0-debug/LoveStory.apk';
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LoveStory.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGoToApp = () => {
    navigate(user ? '/connect' : '/auth');
  };

  return (
    <main className="ls-screen relative min-h-[100dvh] overflow-hidden text-white">
      <div className="absolute inset-0 opacity-70"
        style={{ backgroundImage: 'url(/images/backgrounds/home-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070712]/45 via-[#070712]/72 to-[#070712]/95" />

      <header className="relative z-10 ls-safe pb-0">
        <nav className="ls-shell flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/')} className="ls-chip">
            <Heart className="h-4 w-4 fill-[#FF5FAE] text-[#FF5FAE]" />
            <span className="font-pixel text-[8px]">LOVE STORY</span>
          </button>
          <PixelButton onClick={handleGoToApp} size="sm" variant="secondary" className="text-[8px]">
            <User className="h-3.5 w-3.5" /> {user ? 'PROFIL' : 'MASUK'}
          </PixelButton>
        </nav>
      </header>

      <section className="relative z-10 ls-safe ls-shell grid min-h-[calc(100dvh-88px)] content-between gap-6 pt-8">
        <div className="max-w-xl select-none">
          <div className="ls-pixel-logo mb-5">
            <Heart className="h-10 w-10 fill-[#FF5FAE] text-[#FF2F93]" />
          </div>
          <p className="ls-kicker">Press start to continue our journey</p>
          <h1 className="ls-title mt-2 max-w-[12ch] text-2xl leading-relaxed sm:text-4xl">
            OUR LOVE STORY
          </h1>
          <p className="mt-4 max-w-md font-vt323 text-2xl leading-tight text-[#F7EAF2]">
            Aplikasi pasangan bergaya retro 8-bit untuk menyimpan cerita, mood, foto, musik, dan petualangan kecil kalian.
          </p>

          <div className="mt-6 grid gap-3 sm:max-w-md sm:grid-cols-2">
            {!Capacitor.isNativePlatform() && (
              <PixelButton onClick={handleDownload} size="lg">
                <Download className="h-4 w-4" /> DOWNLOAD APK
              </PixelButton>
            )}
            <PixelButton onClick={handleGoToApp} variant="accent" size="lg">
              <User className="h-4 w-4" /> START
            </PixelButton>
          </div>
        </div>

        <div className="grid gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="ls-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border-2 border-[#05050A] bg-[#FF5FAE] text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="font-pixel text-[8px] text-white">{title}</h2>
              </div>
              <p className="font-vt323 text-base leading-tight text-[#A9A5C4]">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
