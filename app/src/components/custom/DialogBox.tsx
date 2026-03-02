import React from 'react';
import { TypewriterText } from './TypewriterText';
import { cn } from '@/lib/utils';

interface DialogBoxProps {
  text: string;
  speaker?: string;
  className?: string;
  onComplete?: () => void;
  showNextArrow?: boolean;
  typingSpeed?: number;
}

export const DialogBox: React.FC<DialogBoxProps> = ({
  text,
  speaker,
  className = '',
  onComplete,
  showNextArrow = true,
  typingSpeed = 40,
}) => {
  return (
    <div 
      className={cn(
        'relative p-6 min-h-[120px]',
        'bg-[#1A1A2E]/95',
        'border-4 border-white',
        'text-white',
        'font-["VT323"] text-xl md:text-2xl',
        'shadow-[0_0_20px_rgba(255,105,180,0.3)]',
        className
      )}
    >
      {/* Inner border */}
      <div 
        className="absolute inset-0 border-2 border-[#FF69B4] pointer-events-none"
        style={{ margin: '-2px' }}
      />
      
      {/* Speaker name */}
      {speaker && (
        <div className="mb-2 font-['Press_Start_2P'] text-xs text-[#FF69B4]">
          {speaker}
        </div>
      )}
      
      {/* Dialog text */}
      <TypewriterText 
        text={text} 
        speed={typingSpeed}
        onComplete={onComplete}
      />
      
      {/* Next arrow */}
      {showNextArrow && (
        <div className="absolute bottom-4 right-4 animate-bounce">
          <span className="text-[#FF69B4] text-2xl">▼</span>
        </div>
      )}
    </div>
  );
};
