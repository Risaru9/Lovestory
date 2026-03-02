import { useState, useEffect, useCallback } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayText: string;
  isComplete: boolean;
  isTyping: boolean;
  skip: () => void;
  reset: () => void;
}

export const useTypewriter = ({
  text,
  speed = 50,
  delay = 0,
  onComplete,
}: UseTypewriterOptions): UseTypewriterReturn => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Start after delay
  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setHasStarted(true);
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [delay]);

  // Type character by character
  useEffect(() => {
    if (!hasStarted || isComplete) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        setIsTyping(false);
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete, hasStarted, isComplete]);

  // Skip to end
  const skip = useCallback(() => {
    if (isComplete) return;
    setDisplayText(text);
    setIsComplete(true);
    setIsTyping(false);
    onComplete?.();
  }, [text, onComplete, isComplete]);

  // Reset
  const reset = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsTyping(false);
    setHasStarted(false);
  }, []);

  return {
    displayText,
    isComplete,
    isTyping,
    skip,
    reset,
  };
};
