import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { DialogBox } from '@/components/custom/DialogBox';
import { characters } from '@/lib/chapter-data';

interface StatPanelProps {
  character: typeof characters[0];
}

const StatPanel: React.FC<StatPanelProps> = ({ character }) => {
  return (
    <div className="w-full bg-[#090b1e]/95 border-4 border-[#1a1a2e] rounded-xl p-4 shadow-[4px_4px_0_#FF69B4,inset_-4px_-4px_0_rgba(0,0,0,0.3)] animate-slide-up flex flex-col gap-3">
      <div className="flex justify-between items-center border-b border-white/[0.08] pb-1.5">
        <span className="font-['Press_Start_2P'] text-[9px] text-[#FF69B4] tracking-wider uppercase">
          STATUS: {character.name}
        </span>
        <span className="font-['VT323'] text-base text-white/50 tracking-wider">
          CLASS: {character.class}
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* LVL Bar */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-white/70">
            <span>LVL:</span>
            <span className="text-[#FFD700]">{character.level}</span>
          </div>
          <div className="h-2.5 w-full bg-black/45 border-2 border-[#1a1a2e] p-0.5 rounded-sm">
            <div className="h-full bg-[#FFD700] rounded-sm" style={{ width: '100%' }} />
          </div>
        </div>

        {/* HP Bar */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-white/70">
            <span>HP:</span>
            <span className="text-[#32CD32]">{character.hp}</span>
          </div>
          <div className="h-2.5 w-full bg-black/45 border-2 border-[#1a1a2e] p-0.5 rounded-sm">
            <div className="h-full bg-[#32CD32] rounded-sm" style={{ width: '100%' }} />
          </div>
        </div>

        {/* MP Bar */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-white/70">
            <span>MP:</span>
            <span className="text-[#00FFFF]">{character.mp}</span>
          </div>
          <div className="h-2.5 w-full bg-black/45 border-2 border-[#1a1a2e] p-0.5 rounded-sm">
            <div className="h-full bg-[#00FFFF] rounded-sm" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Couple: React.FC = () => {
  const navigate = useNavigate();
  const [showStat1, setShowStat1] = useState(false);
  const [showStat2, setShowStat2] = useState(false);
  const [dialogStep, setDialogStep] = useState(0);

  const dialogs = [
    'Dua jiwa, satu perjalanan...',
    'Siap untuk memulai petualangan cinta kita?',
    'Mari kita telusuri setiap momen indah yang telah kita lewati bersama...',
  ];

  const handleCharacterClick = (index: number) => {
    if (index === 0) {
      setShowStat1(!showStat1);
      setShowStat2(false);
    } else {
      setShowStat2(!showStat2);
      setShowStat1(false);
    }
  };

  const handleNextDialog = () => {
    if (dialogStep < dialogs.length - 1) {
      setDialogStep(dialogStep + 1);
    } else {
      navigate('/timeline');
    }
  };

  const isAnySelected = showStat1 || showStat2;

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] w-full relative overflow-hidden bg-[#0c0a18]"
      style={{
        backgroundImage: 'url(/images/backgrounds/couple-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content wrapper */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between px-4 py-6 md:py-8">
        
        {/* Title */}
        <div className="text-center">
          <h1 className="font-['Press_Start_2P'] text-lg sm:text-xl md:text-2xl text-white mb-1.5 drop-shadow-[2.5px_2.5px_0_#FF69B4] tracking-wider">
            SELECT CHARACTER
          </h1>
          <p className="font-['VT323'] text-sm sm:text-base text-[#FFD700] tracking-widest uppercase">
            Klik karakter untuk melihat statistik RPG
          </p>
        </div>

        {/* Characters Selection Grid */}
        <div className="flex justify-center items-center gap-6 sm:gap-16 md:gap-24 my-auto">
          {/* Character 1 */}
          <div className="flex flex-col items-center">
            <button 
              type="button"
              className={`cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 outline-none ${
                showStat1 
                  ? 'filter drop-shadow-[0_0_15px_rgba(244,114,182,0.9)] scale-105 -translate-y-2 opacity-100' 
                  : isAnySelected ? 'opacity-45 scale-95' : 'opacity-100'
              }`}
              onClick={() => handleCharacterClick(0)}
              aria-label={`Select ${characters[0].name}`}
            >
              <img 
                src={characters[0].sprite}
                alt={characters[0].name}
                className="w-20 h-20 sm:w-28 md:w-36 pixel-art"
              />
            </button>
            <p className="font-['Press_Start_2P'] text-[9px] text-white mt-3.5 tracking-wider">
              {characters[0].name}
            </p>
          </div>

          {/* Heart between */}
          <div className="text-xl sm:text-3xl animate-pulse text-[#FF69B4]">
            💕
          </div>

          {/* Character 2 */}
          <div className="flex flex-col items-center">
            <button 
              type="button"
              className={`cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 outline-none ${
                showStat2 
                  ? 'filter drop-shadow-[0_0_15px_rgba(244,114,182,0.9)] scale-105 -translate-y-2 opacity-100' 
                  : isAnySelected ? 'opacity-45 scale-95' : 'opacity-100'
              }`}
              onClick={() => handleCharacterClick(1)}
              aria-label={`Select ${characters[1].name}`}
            >
              <img 
                src={characters[1].sprite}
                alt={characters[1].name}
                className="w-20 h-20 sm:w-28 md:w-36 pixel-art"
              />
            </button>
            <p className="font-['Press_Start_2P'] text-[9px] text-white mt-3.5 tracking-wider">
              {characters[1].name}
            </p>
          </div>
        </div>

        {/* Central Stat Panel Slot */}
        <div className="w-full max-w-[340px] sm:max-w-md min-h-[110px] my-3">
          {showStat1 ? (
            <StatPanel character={characters[0]} />
          ) : showStat2 ? (
            <StatPanel character={characters[1]} />
          ) : (
            <div className="text-center font-['VT323'] text-sm sm:text-base text-white/35 border-2 border-dashed border-white/10 rounded-xl px-4 py-5 flex items-center justify-center h-full tracking-wide">
              ✨ KETUK KARAKTER UNTUK MENYINGKAP STATUS RPG
            </div>
          )}
        </div>

        {/* Footer Area: Dialog Box + Navigation */}
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          {/* Dialog Box */}
          <div onClick={handleNextDialog} className="w-full cursor-pointer select-none">
            <DialogBox
              text={dialogs[dialogStep]}
              onComplete={() => {}}
              showNextArrow={dialogStep < dialogs.length - 1}
            />
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-4">
            <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px]">
              KEMBALI
            </PixelButton>
            <PixelButton onClick={() => navigate('/timeline')} variant="primary" size="sm" className="text-[9px]">
              MULAI
            </PixelButton>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Couple;
