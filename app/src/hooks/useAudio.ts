import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

export const useAudio = () => {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    volume: 0.5,
    isMuted: false,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((src: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    audioRef.current = new Audio(src);
    audioRef.current.volume = state.isMuted ? 0 : state.volume;
    audioRef.current.play();
    setState(prev => ({ ...prev, isPlaying: true }));
    
    audioRef.current.onended = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };
  }, [state.volume, state.isMuted]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = state.isMuted ? 0 : clampedVolume;
    }
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, [state.isMuted]);

  const toggleMute = useCallback(() => {
    const newMuted = !state.isMuted;
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : state.volume;
    }
    setState(prev => ({ ...prev, isMuted: newMuted }));
  }, [state.isMuted, state.volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    play,
    pause,
    stop,
    setVolume,
    toggleMute,
  };
};
