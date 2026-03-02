import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { TypewriterText } from '@/components/custom/TypewriterText';

const LoadingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [bootStep, setBootStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showStart, setShowStart] = useState(false);
  const [coinVisible, setCoinVisible] = useState(true);

  const bootTexts = [
    'INITIALIZING SYSTEM...',
    'LOADING MEMORIES...',
    'CALIBRATING HEART...',
    'PREPARING LOVE...',
    'READY!',
  ];

  // Boot sequence
  useEffect(() => {
    const bootInterval = setInterval(() => {
      setBootStep(prev => {
        if (prev < bootTexts.length - 1) {
          return prev + 1;
        }
        clearInterval(bootInterval);
        return prev;
      });
    }, 800);

    return () => clearInterval(bootInterval);
  }, []);

  // Progress bar
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 100) {
          return prev + 2;
        }
        clearInterval(progressInterval);
        setTimeout(() => setShowStart(true), 500);
        return prev;
      });
    }, 60);

    return () => clearInterval(progressInterval);
  }, []);

  // Coin blink
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCoinVisible(prev => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, []);

  const handleStart = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-center mb-12">
        <h1 className="font-['Press_Start_2P'] text-3xl md:text-5xl text-[#FF69B4] mb-4 drop-shadow-[4px_4px_0_#4B0082]">
          PIXEL LOVE
        </h1>
      </div>

      {/* Boot Sequence */}
      <div className="w-full max-w-md mb-8">
        <div className="bg-[#0A0A1A] border-2 border-[#4B0082] p-4 min-h-[120px]">
          {bootTexts.slice(0, bootStep + 1).map((text, index) => (
            <div 
              key={index}
              className="font-['VT323'] text-lg text-[#00FFFF] mb-1"
            >
              {index === bootStep && bootStep < bootTexts.length - 1 ? (
                <TypewriterText text={text} speed={30} />
              ) : (
                <span>&gt; {text}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between mb-2">
          <span className="font-['Press_Start_2P'] text-xs text-white">LOADING</span>
          <span className="font-['Press_Start_2P'] text-xs text-[#FF69B4]">{progress}%</span>
        </div>
        <div className="pixel-progress">
          <div 
            className="pixel-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Insert Coin */}
      {!showStart && (
        <div 
          className={`font-['Press_Start_2P'] text-xl text-[#FFD700] transition-opacity duration-200 ${
            coinVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          INSERT COIN
        </div>
      )}

      {/* Start Button */}
      {showStart && (
        <div className="animate-pulse">
          <PixelButton onClick={handleStart} size="lg">
            PRESS START
          </PixelButton>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-4 text-center">
        <p className="font-['VT323'] text-sm text-[#E6E6FA]/50">
          © 2025 PIXEL LOVE | Use ↑↑↓↓←→←→BA for secret
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
