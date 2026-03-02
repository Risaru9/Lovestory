import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
  particles: { x: number; y: number; vx: number; vy: number; life: number }[];
}

const InvitationLetter: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  // State untuk animasi reaksi RSVP
  const [reaction, setReaction] = useState<{ type: string, message: string, emoji: string } | null>(null);

  // Staggered animation on mount
  useEffect(() => {
    const timer1 = setTimeout(() => setIsOpen(true), 300);
    const timer2 = setTimeout(() => setShowContent(true), 800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Enhanced Fireworks effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let fireworks: Firework[] = [];
    let animationId: number;

    const createFirework = () => {
      const colors = ['#FF69B4', '#FFD700', '#00FFFF', '#FF8C00', '#FF6B6B', '#C44569'];
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.6 + 50;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const particles = [];
      const particleCount = 30 + Math.random() * 20;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
        const velocity = 2 + Math.random() * 3;
        particles.push({ 
          x: 0, 
          y: 0, 
          vx: Math.cos(angle) * velocity, 
          vy: Math.sin(angle) * velocity,
          life: 1 
        });
      }
      fireworks.push({ id: Date.now(), x, y, color, particles });
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(26, 26, 46, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      fireworks = fireworks.filter(fw => {
        let active = false;
        fw.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.vx *= 0.98;
          p.life -= 0.015;
          
          if (p.life > 0 && p.y < canvas.height) active = true;
        });

        if (active) {
          fw.particles.forEach(p => {
            if (p.life > 0) {
              ctx.beginPath();
              ctx.fillStyle = fw.color;
              ctx.globalAlpha = p.life;
              ctx.arc(fw.x + p.x, fw.y + p.y, 2 * p.life, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          });
        }
        return active;
      });

      animationId = requestAnimationFrame(animate);
    };

    const interval = setInterval(createFirework, 1200);
    animate();

    return () => { 
      clearInterval(interval); 
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Handler untuk klik RSVP
  const handleRSVP = (status: string) => {
    if (status === 'Hadir') {
      setReaction({ type: 'happy', message: 'Yay! Gak sabar nunggu kehadiranmu!', emoji: '🎉✨😄' });
    } else if (status === 'Tidak Hadir') {
      setReaction({ type: 'sad', message: 'Yahh, sayang sekali... Next time ya!', emoji: '😢💔' });
    } else {
      setReaction({ type: 'hopeful', message: 'Semoga ada waktu dan bisa datang ya!', emoji: '🥺🙏' });
    }
    
    // Auto-close animasi setelah 3 detik
    setTimeout(() => {
      setReaction(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 cursor-default bg-[#1a1a2e]">
      
      {/* Subtle Unified Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b3d] via-[#1a1a2e] to-[#0f0f1a] opacity-90 pointer-events-none z-0" />

      {/* Reaction Overlay Modal */}
      {reaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#f4e4bc] border-4 border-[#8b5a2b] p-8 max-w-sm w-full mx-4 text-center transform animate-bounce-in shadow-[12px_12px_0px_0px_rgba(0,0,0,0.6)] relative overflow-hidden">
            {/* Dekorasi Modal */}
            <div className="absolute top-2 left-2 w-3 h-3 bg-[#8b5a2b]/20" />
            <div className="absolute top-2 right-2 w-3 h-3 bg-[#8b5a2b]/20" />
            <div className="absolute bottom-2 left-2 w-3 h-3 bg-[#8b5a2b]/20" />
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-[#8b5a2b]/20" />
            
            <div className={`text-6xl mb-6 ${reaction.type === 'happy' ? 'animate-bounce' : 'animate-pulse'}`}>
              {reaction.emoji}
            </div>
            <h2 className="font-['Press_Start_2P'] text-[#4a2c11] text-lg md:text-xl mb-4 leading-relaxed">
              {reaction.type === 'happy' && 'YESSS! 🎮'}
              {reaction.type === 'sad' && 'YAAAH... 🍂'}
              {reaction.type === 'hopeful' && 'HMM... ⏳'}
            </h2>
            <p className="font-['VT323'] text-2xl text-[#5d4037] leading-relaxed">
              {reaction.message}
            </p>
          </div>
        </div>
      )}

      {/* Fireworks Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-200/30 rounded-full animate-float"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + i}s`
            }}
          />
        ))}
      </div>

      {/* Letter Container - NOW 16:9 LANDSCAPE */}
      <div 
        className={`relative z-10 w-full max-w-5xl md:aspect-video transition-all duration-1000 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 translate-y-10'}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Glow effect on hover */}
        <div className={`absolute -inset-1 bg-gradient-to-r from-pink-500/0 via-yellow-500/0 to-cyan-500/0 rounded-lg blur-xl transition-all duration-500 ${isHovering ? 'via-yellow-500/20' : ''}`} />

        {/* Pixel Art Paper Effect */}
        <div className="relative bg-[#f4e4bc] h-full p-1 border-4 border-[#8b5a2b] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-300">
          
          {/* Inner border with pixel corners */}
          <div className="border-2 border-dashed border-[#8b5a2b]/40 h-full p-6 md:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden">
            
            {/* Decorative corner pixels */}
            <div className="absolute top-2 left-2 w-3 h-3 bg-[#8b5a2b]/20" />
            <div className="absolute top-2 right-2 w-3 h-3 bg-[#8b5a2b]/20" />
            <div className="absolute bottom-2 left-2 w-3 h-3 bg-[#8b5a2b]/20" />
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-[#8b5a2b]/20" />

            {/* LEFT COLUMN: GREETINGS & MESSAGE */}
            <div className="flex-1 flex flex-col justify-center items-center text-center border-b-2 md:border-b-0 md:border-r-2 border-[#8b5a2b]/20 pb-6 md:pb-0 md:pr-6">
              
              <div className={`text-5xl mb-4 transition-all duration-700 ${showContent ? 'animate-bounce-slow scale-100' : 'scale-0'}`}>
                ✉️
              </div>

              <h1 className={`font-['Press_Start_2P'] text-lg md:text-xl xl:text-2xl text-[#4a2c11] leading-relaxed mb-6 transition-all duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                <span className="inline-block animate-shimmer">INVITATION FOR YOU</span>
              </h1>

              <div className={`font-['VT323'] text-xl md:text-2xl text-[#5d4037] space-y-4 transition-all duration-700 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <p className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  Halo, <span className="text-[#8b5a2b] font-bold">Sayangkuuu</span>!
                </p>
                <p className="leading-relaxed animate-fade-in-up px-4" style={{ animationDelay: '0.2s' }}>
                  Aku ingin mengundangmu ke <span className="bg-[#8b5a2b]/20 px-2 py-1 rounded">Rumahku</span> untuk bersenang senang. Pastikan kamu kesini DALAM KONDISI CERIA YAW
                </p>
                <p className="italic animate-fade-in-up text-lg text-[#8b5a2b]" style={{ animationDelay: '0.3s' }}>
                  "Jangan lupa HATI HATI DI JALAN"
                </p>
              </div>

              {/* Signature */}
              <div className={`mt-8 transition-all duration-700 delay-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative group cursor-pointer inline-block">
                  <p className="font-['VT323'] text-xl text-[#8b5a2b] mb-1">Tertanda,</p>
                  <p className="font-['Press_Start_2P'] text-xs xl:text-sm text-[#4a2c11] mt-2 group-hover:text-[#8b5a2b] transition-colors">
                    UR HONNEEE
                  </p>
                  <div className="h-0.5 bg-[#8b5a2b] w-0 group-hover:w-full transition-all duration-500 mt-1" />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DETAILS & RSVP */}
            <div className="flex-1 flex flex-col justify-center space-y-4 md:pl-2">
              
              <div className={`space-y-3 transition-all duration-700 delay-400 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                {/* Location Card */}
                <div className="group relative bg-[#8b5a2b]/10 p-3 rounded cursor-pointer hover:bg-[#8b5a2b]/20 transition-all duration-300 transform hover:scale-102">
                  <p className="font-bold font-['Press_Start_2P'] text-xs text-[#8b5a2b] mb-2 flex items-center gap-2">
                    <span className="text-base group-hover:animate-bounce">📍</span> LOKASI
                  </p>
                  <p className="font-['VT323'] text-xl text-[#5d4037]">RUMAHKUUUU</p>
                </div>

                {/* Time Card */}
                <div className="group relative bg-[#8b5a2b]/10 p-3 rounded cursor-pointer hover:bg-[#8b5a2b]/20 transition-all duration-300 transform hover:scale-102">
                  <p className="font-bold font-['Press_Start_2P'] text-xs text-[#8b5a2b] mb-2 flex items-center gap-2">
                    <span className="text-base group-hover:animate-spin-slow">⏰</span> WAKTU
                  </p>
                  <p className="font-['VT323'] text-xl text-[#5d4037]">Berlaku untuk selamanya ketika kamu ingin kesini</p>
                </div>

                {/* Countdown Timer */}
                <div className="bg-gradient-to-r from-[#8b5a2b]/20 to-[#8b5a2b]/10 p-3 rounded border-2 border-[#8b5a2b]/30 text-center">
                  <p className="text-xs font-['Press_Start_2P'] text-[#8b5a2b] mb-3">⏳ COUNTDOWN</p>
                  <div className="flex justify-center gap-2 font-['Press_Start_2P'] text-xs">
                    <div className="bg-[#f4e4bc] p-2 rounded border border-[#8b5a2b]/30">
                      <span className="text-[#8b5a2b] text-sm"></span><p className="text-[10px] mt-1">KAPANPUN KAMU MAU KESINI</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RSVP & Action Buttons */}
              <div className={`pt-4 flex flex-col items-center transition-all duration-700 delay-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                
                <p className="font-['VT323'] text-xl text-[#8b5a2b] mb-2">Konfirmasi Kehadiran:</p>
                <div className="flex gap-2 justify-center mb-6 flex-wrap">
                  {['Hadir', 'Tidak Hadir', 'Maybe'].map((status, idx) => (
                    <button
                      key={status}
                      onClick={() => handleRSVP(status)}
                      className="px-3 py-1.5 border-2 border-[#8b5a2b] rounded font-['VT323'] text-lg hover:bg-[#8b5a2b] hover:text-[#f4e4bc] transition-all duration-200 active:scale-95"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      {status === 'Hadir' && '✅ '} 
                      {status === 'Tidak Hadir' && '❌ '} 
                      {status === 'Maybe' && '🤔 '} {status}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 w-full justify-center">
                  <PixelButton 
                    onClick={() => navigate('/home')} 
                    variant="secondary"
                    className="text-xs py-2 hover:transform hover:-translate-y-1"
                  >
                    ← KEMBALI
                  </PixelButton>
                  <PixelButton 
                    onClick={() => window.open('https://goo.gl/maps/xybqUiUpevmuEdYu6', '_blank')}
                    className="text-xs py-2 group hover:transform hover:-translate-y-1"
                  >
                    <span className="group-hover:animate-pulse">📍</span> BUKA MAPS
                  </PixelButton>
                </div>
              </div>

            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 h-4 bg-black/20 blur-md rounded-full" />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          33% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
          66% { transform: translateY(10px) translateX(-10px); opacity: 0.3; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.26, 1.55) forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-shimmer {
          background: linear-gradient(90deg, #4a2c11 0%, #8b5a2b 50%, #4a2c11 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default InvitationLetter;