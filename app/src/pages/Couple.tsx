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
    <div className="w-full bg-[#ffffff] border-4 border-[#1a1a2e] rounded-xl p-4 shadow-[4px_4px_0_#1a1a2e] animate-slide-up flex flex-col gap-3 text-[#1a1a2e]">
      <div className="flex justify-between items-center border-b-2 border-[#1a1a2e] pb-1.5 select-none">
        <span className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] tracking-wider uppercase">
          STATUS: {character.name}
        </span>
        <span className="font-['VT323'] text-base text-[#1a1a2e]/60 tracking-wider font-bold">
          CLASS: {character.class}
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* LVL Bar */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-[#1a1a2e]">
            <span>LVL:</span>
            <span className="text-[#c7a008] font-bold">{character.level}</span>
          </div>
          <div className="h-3 w-full bg-black/10 border-2 border-[#1a1a2e] p-[1px]">
            <div className="h-full bg-[#ffb300]" style={{ width: '100%' }} />
          </div>
        </div>

        {/* HP Bar */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-[#1a1a2e]">
            <span>HP:</span>
            <span className="text-[#2e7d32] font-bold">{character.hp}</span>
          </div>
          <div className="h-3 w-full bg-black/10 border-2 border-[#1a1a2e] p-[1px]">
            <div className="h-full bg-[#4caf50]" style={{ width: '100%' }} />
          </div>
        </div>

        {/* MP Bar */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between text-[8px] font-['Press_Start_2P'] text-[#1a1a2e]">
            <span>MP:</span>
            <span className="text-[#1565c0] font-bold">{character.mp}</span>
          </div>
          <div className="h-3 w-full bg-black/10 border-2 border-[#1a1a2e] p-[1px]">
            <div className="h-full bg-[#2196f3]" style={{ width: '100%' }} />
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

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] w-full relative overflow-hidden bg-[#e8e5da]"
      style={{
        backgroundImage: 'url(/images/backgrounds/couple-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#f4f0e6]/85" />

      {/* Content wrapper */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between px-4 py-6 md:py-8">
        
        {/* Title */}
        <div className="text-center select-none">
          <h1 className="font-['Press_Start_2P'] text-lg sm:text-xl md:text-2xl text-[#1a1a2e] mb-1.5 drop-shadow-[2.5px_2.5px_0_#ffd700] tracking-wider">
            SELECT CHARACTER
          </h1>
          <p className="font-['VT323'] text-sm sm:text-base text-[#1a1a2e]/60 tracking-widest uppercase">
            Klik karakter untuk melihat statistik RPG
          </p>
        </div>

        {/* Characters Selection Grid */}
        <div className="flex justify-center items-center gap-6 sm:gap-16 md:gap-24 my-auto">
          {/* Character 1 */}
          <div className="flex flex-col items-center">
            <button 
              type="button"
              className={`cursor-pointer transition-all duration-150 outline-none p-2 border-4 rounded-2xl ${
                showStat1 
                  ? 'border-[#ff69b4] bg-[#ff69b4]/10 scale-105 opacity-100 shadow-[3px_3px_0_#1a1a2e]' 
                  : 'border-transparent opacity-60 hover:opacity-95'
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
            <p className="font-['Press_Start_2P'] text-[9px] text-[#1a1a2e] mt-3.5 tracking-wider select-none">
              {characters[0].name}
            </p>
          </div>

          {/* Heart between */}
          <div className="text-xl sm:text-3xl animate-pulse text-[#ff69b4] select-none">
            💕
          </div>

          {/* Character 2 */}
          <div className="flex flex-col items-center">
            <button 
              type="button"
              className={`cursor-pointer transition-all duration-150 outline-none p-2 border-4 rounded-2xl ${
                showStat2 
                  ? 'border-[#ff69b4] bg-[#ff69b4]/10 scale-105 opacity-100 shadow-[3px_3px_0_#1a1a2e]' 
                  : 'border-transparent opacity-60 hover:opacity-95'
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
            <p className="font-['Press_Start_2P'] text-[9px] text-[#1a1a2e] mt-3.5 tracking-wider select-none">
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
            <div className="text-center font-['VT323'] text-sm sm:text-base text-[#1a1a2e]/55 border-2 border-dashed border-[#1a1a2e]/20 rounded-xl px-4 py-5 flex items-center justify-center h-full tracking-wide">
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
