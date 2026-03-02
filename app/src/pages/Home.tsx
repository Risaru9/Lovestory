import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
interface HeartParticle {
  id: number;
  x: number;
  y: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems = [
    { label: 'NEW GAME', path: '/couple', icon: '✨' },
    { label: 'CONTINUE', path: '/timeline', icon: '▶' },
    { label: 'GALLERY', path: '/gallery', icon: '📷' },
    { label: 'MUSIC', path: '/music', icon: '🎵' },
    { label: 'MINI GAME', path: '/game', icon: '🎮' },
    { label: 'LETTER', path: '/letter', icon: '💌' },
    { label: 'INVITATION LETTER', path: '/invitationletter', icon: '⭐' },
  ];

  // Spawn heart particles
  const spawnHeart = (x: number, y: number) => {
    const newHeart = { id: Date.now(), x, y };
    setHearts(prev => [...prev, newHeart]);
    
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 2000);
  };

  // Handle menu hover
  const handleMenuHover = (e: React.MouseEvent, index: number) => {
    setSelectedIndex(index);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    spawnHeart(rect.left - 30, rect.top + rect.height / 2);
  };

  // Handle menu click
  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setSelectedIndex(prev => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        navigate(menuItems[selectedIndex].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, menuItems, navigate]);

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/backgrounds/home-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Floating hearts */}
      {hearts.map(heart => (
        <div
          key={heart.id}
          className="absolute pointer-events-none animate-float"
          style={{
            left: heart.x,
            top: heart.y,
            animation: 'float-up 2s ease-out forwards',
          }}
        >
          <span className="text-2xl">💕</span>
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="font-['Press_Start_2P'] text-2xl md:text-4xl text-white mb-4 drop-shadow-[4px_4px_0_#FF69B4]">
            OUR LOVE STORY
          </h1>
        </div>

        {/* Menu Box */}
        <div className="pixel-box p-8 max-w-md w-full">
          <div className="space-y-4">
            {menuItems.map((item, index) => (
              <div
                key={item.label}
                className={`
                  menu-item flex items-center gap-3
                  ${selectedIndex === index ? 'text-[#FF69B4]' : 'text-black'}
                `}
                onMouseEnter={(e) => handleMenuHover(e, index)}
                onClick={() => handleMenuClick(item.path)}
              >
                <span className="w-6">{item.icon}</span>
                <span className={selectedIndex === index ? 'animate-pulse' : ''}>
                  {item.label}
                </span>
                {selectedIndex === index && (
                  <span className="ml-auto text-[#FF69B4] animate-bounce">◀</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Character sprites */}
        <div className="absolute bottom-8 left-8 hidden md:block">
          <img 
            src="/images/sprites/char-boy.png" 
            alt="Character"
            className="w-24 h-24 pixel-art animate-bounce"
          />
        </div>
        <div className="absolute bottom-8 right-8 hidden md:block">
          <img 
            src="/images/sprites/char-girl.png" 
            alt="Character"
            className="w-24 h-24 pixel-art animate-bounce"
            style={{ animationDelay: '0.5s' }}
          />
        </div>

        {/* Navigation hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="font-['VT323'] text-sm text-white/60">
            Use ↑↓ to navigate, ENTER to select
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
