import React, { useState, useEffect, useCallback } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
  delay?: number;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  className = '',
  onComplete,
  showCursor = true,
  delay = 0,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete, hasStarted]);

  const skip = useCallback(() => {
    setDisplayText(text);
    setIsComplete(true);
    onComplete?.();
  }, [text, onComplete]);

  return (
    <span 
      className={`${className} cursor-pointer`} 
      onClick={skip}
      onKeyDown={(e) => e.key === 'Enter' && skip()}
      role="button"
      tabIndex={0}
    >
      {displayText}
      {showCursor && !isComplete && (
        <span className="typewriter-cursor" />
      )}
    </span>
  );
};
