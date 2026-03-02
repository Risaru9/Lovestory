import { useState, useEffect, useCallback } from 'react';

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];

export const useKonamiCode = (callback: () => void) => {
  const [sequence, setSequence] = useState<string[]>([]);
  const [activated, setActivated] = useState(false);

  const reset = useCallback(() => {
    setSequence([]);
    setActivated(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activated) return;

      const newSequence = [...sequence, e.code].slice(-10);
      setSequence(newSequence);

      if (newSequence.join(',') === KONAMI_CODE.join(',')) {
        setActivated(true);
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sequence, callback, activated]);

  return { activated, reset };
};
