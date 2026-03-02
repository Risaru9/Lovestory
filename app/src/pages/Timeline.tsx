import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { chapters } from '@/lib/chapter-data';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
}

const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const progress = scrollTop / (scrollHeight - clientHeight);
        setScrollProgress(progress);
      }
    };

    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Spawn confetti
  const spawnConfetti = (x: number, y: number) => {
    const colors = ['#FF69B4', '#FFD700', '#00FFFF', '#32CD32', '#FF8C00'];
    const newParticles: ConfettiParticle[] = [];
    
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: x + (Math.random() - 0.5) * 100,
        y: y + (Math.random() - 0.5) * 50,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    
    setConfetti(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setConfetti(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  };

  // Handle chapter click
  const handleChapterClick = (chapter: typeof chapters[0], e: React.MouseEvent) => {
    if (!chapter.unlocked) {
      // Shake animation for locked
      const element = e.currentTarget;
      element.classList.add('shake');
      setTimeout(() => element.classList.remove('shake'), 500);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    spawnConfetti(rect.left + rect.width / 2, rect.top);
    
    setTimeout(() => {
      navigate(`/chapter/${chapter.id}`);
    }, 300);
  };

  // Calculate character position based on scroll
  const characterY = scrollProgress * 80 + 10; // 10% to 90% of container

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A1A2E]/90 border-b-4 border-[#FF69B4] p-4 z-20">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <h1 className="font-['Press_Start_2P'] text-lg md:text-xl text-white">
            JOURNEY MAP
          </h1>
          <div className="flex gap-2">
            <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
              MENU
            </PixelButton>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative"
        style={{
          backgroundImage: 'url(/images/backgrounds/timeline-bg.png)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Confetti */}
        {confetti.map(particle => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 pointer-events-none"
            style={{
              left: particle.x,
              top: particle.y,
              backgroundColor: particle.color,
              animation: 'confetti-fall 2s ease-out forwards',
            }}
          />
        ))}

        {/* Timeline Content */}
        <div className="relative z-10 min-h-[200vh] py-12 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Title */}
            <div className="text-center mb-12">
              <h2 className="font-['Press_Start_2P'] text-xl text-[#FFD700] mb-2">
                OUR ADVENTURE
              </h2>
              <p className="font-['VT323'] text-lg text-white/70">
                17 Chapters of Love
              </p>
            </div>

            {/* Path Line */}
            <div className="absolute left-1/2 top-32 bottom-32 w-1 bg-[#FF69B4]/30 -translate-x-1/2" />

            {/* Character following scroll */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-300"
              style={{ top: `${characterY}%` }}
            >
              <img 
                src="/images/sprites/char-boy.png"
                alt="Player"
                className="w-12 h-12 pixel-art animate-bounce"
              />
            </div>

            {/* Chapter Nodes */}
            <div className="space-y-16 relative">
              {chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className={`
                    flex items-center gap-6
                    ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}
                  `}
                >
                  {/* Chapter Info */}
                  <div className={`
                    flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}
                  `}>
                    <div 
                      className={`
                        inline-block p-4 rounded-lg cursor-pointer transition-all
                        ${chapter.unlocked 
                          ? 'bg-[#1A1A2E]/80 border-2 border-[#FF69B4] hover:scale-105 hover:shadow-[0_0_20px_#FF69B4]' 
                          : 'bg-[#1A1A2E]/60 border-2 border-gray-600 cursor-not-allowed'
                        }
                      `}
                      onClick={(e) => handleChapterClick(chapter, e)}
                    >
                      <div className="font-['Press_Start_2P'] text-xs text-[#FFD700] mb-1">
                        MONTH {chapter.month}
                      </div>
                      <div className="font-['VT323'] text-lg text-white">
                        {chapter.title}
                      </div>
                      <div className="font-['VT323'] text-sm text-white/60">
                        {chapter.date}
                      </div>
                      {chapter.completed && (
                        <div className="mt-2 text-xs text-[#32CD32]">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Node */}
                  <div 
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      border-4 z-10 transition-all
                      ${chapter.unlocked 
                        ? chapter.completed
                          ? 'bg-[#FFD700] border-[#FFD700] animate-pulse'
                          : 'bg-[#FF69B4] border-[#FF69B4] hover:scale-125'
                        : 'bg-gray-700 border-gray-600'
                      }
                    `}
                  >
                    {chapter.unlocked ? (
                      chapter.completed ? (
                        <span className="text-[#1A1A2E] text-xl">★</span>
                      ) : (
                        <span className="text-white text-lg">{chapter.month}</span>
                      )
                    ) : (
                      <img 
                        src="/images/ui/lock-icon.png" 
                        alt="Locked"
                        className="w-6 h-6 pixel-art"
                      />
                    )}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />
                </div>
              ))}
            </div>

            {/* End marker */}
            <div className="text-center mt-16">
              <div className="inline-block p-4 bg-[#FFD700] rounded-full animate-pulse">
                <span className="text-4xl">🏆</span>
              </div>
              <p className="font-['Press_Start_2P'] text-xs text-[#FFD700] mt-4">
                TO BE CONTINUED...
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(200px) rotate(720deg);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Timeline;
