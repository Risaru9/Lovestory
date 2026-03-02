import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { DialogBox } from '@/components/custom/DialogBox';
import { characters } from '@/lib/chapter-data';

interface StatCardProps {
  character: typeof characters[0];
  isVisible: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ character, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="stat-card animate-bounce">
      <div className="text-[#FF69B4] mb-2">{character.name}</div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span>LVL:</span>
          <span className="text-[#FFD700]">{character.level}</span>
        </div>
        <div className="flex justify-between">
          <span>HP:</span>
          <span className="text-[#32CD32]">{character.hp}</span>
        </div>
        <div className="flex justify-between">
          <span>MP:</span>
          <span className="text-[#00FFFF]">{character.mp}</span>
        </div>
        <div className="flex justify-between">
          <span>CLASS:</span>
          <span className="text-[#FF69B4]">{character.class}</span>
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
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/backgrounds/couple-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-['Press_Start_2P'] text-xl md:text-3xl text-white mb-2 drop-shadow-[4px_4px_0_#FF69B4]">
            SELECT CHARACTER
          </h1>
          <p className="font-['VT323'] text-lg text-[#FFD700]">
            Klik karakter untuk melihat statistik
          </p>
        </div>

        {/* Characters */}
        <div className="flex justify-center items-end gap-8 md:gap-24 mb-8">
          {/* Character 1 */}
          <div className="relative flex flex-col items-center">
            <StatCard character={characters[0]} isVisible={showStat1} />
            <div 
              className="cursor-pointer transition-transform hover:scale-110 hover:-translate-y-4"
              onClick={() => handleCharacterClick(0)}
            >
              <img 
                src={characters[0].sprite}
                alt={characters[0].name}
                className="w-32 h-32 md:w-48 md:h-48 pixel-art"
              />
            </div>
            <p className="font-['Press_Start_2P'] text-xs text-white mt-4">
              {characters[0].name}
            </p>
          </div>

          {/* Heart between */}
          <div className="text-4xl md:text-6xl animate-pulse">
            💕
          </div>

          {/* Character 2 */}
          <div className="relative flex flex-col items-center">
            <StatCard character={characters[1]} isVisible={showStat2} />
            <div 
              className="cursor-pointer transition-transform hover:scale-110 hover:-translate-y-4"
              onClick={() => handleCharacterClick(1)}
            >
              <img 
                src={characters[1].sprite}
                alt={characters[1].name}
                className="w-32 h-32 md:w-48 md:h-48 pixel-art"
              />
            </div>
            <p className="font-['Press_Start_2P'] text-xs text-white mt-4">
              {characters[1].name}
            </p>
          </div>
        </div>

        {/* Dialog Box */}
        <div className="w-full max-w-2xl mt-auto">
          <div onClick={handleNextDialog} className="cursor-pointer">
            <DialogBox
              text={dialogs[dialogStep]}
              onComplete={() => {}}
              showNextArrow={dialogStep < dialogs.length - 1}
            />
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4 mt-6">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            BACK
          </PixelButton>
          <PixelButton onClick={() => navigate('/timeline')} size="sm">
            START
          </PixelButton>
        </div>
      </div>
    </div>
  );
};

export default Couple;
