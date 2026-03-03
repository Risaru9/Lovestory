import { useRef, useCallback } from 'react';

// Sound effect types
export type SoundEffect = 
  | 'catch_good'
  | 'catch_bad'
  | 'catch_golden'
  | 'catch_rainbow'
  | 'catch_special'
  | 'effect_freeze'
  | 'effect_speed'
  | 'effect_slow'
  | 'effect_magnet'
  | 'effect_shield'
  | 'combo'
  | 'level_up'
  | 'game_over'
  | 'game_start'
  | 'pause'
  | 'button_click'
  | 'explosion';

interface UseSoundSystemOptions {
  enabled?: boolean;
  volume?: number;
}

export function useSoundSystem(options: UseSoundSystemOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundBuffersRef = useRef<Map<SoundEffect, AudioBuffer>>(new Map());
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const initializedRef = useRef(false);

  // Initialize audio context on first play
  const initAudio = useCallback(() => {
    if (initializedRef.current) return;
    
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = volume;
      masterGainRef.current.connect(audioContextRef.current.destination);
      initializedRef.current = true;
    }
  }, [volume]);

  // Generate simple synth sounds using Web Audio API
  const generateSound = useCallback((type: SoundEffect): AudioBuffer | undefined => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return undefined;

    const sampleRate = ctx.sampleRate;
    const duration = type.includes('effect') ? 0.3 : 0.15;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (type) {
        case 'catch_good':
          // Pleasant sine wave
          sample = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-5 * t);
          break;
        case 'catch_bad':
          // Low dissonant sound
          sample = (Math.sin(2 * Math.PI * 150 * t) + Math.sin(2 * Math.PI * 155 * t)) * 0.5 * Math.exp(-3 * t);
          break;
        case 'catch_golden':
          // High sparkly sound
          sample = Math.sin(2 * Math.PI * 1760 * t) * Math.exp(-4 * t);
          if (i % 100 < 50) sample *= 0.5; // Add sparkle
          break;
        case 'catch_rainbow':
          // Ascending arpeggio effect
          const freq = 440 + (t / duration) * 880;
          sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-2 * t);
          break;
        case 'catch_special':
          // Magical chime
          sample = (Math.sin(2 * Math.PI * 1320 * t) + Math.sin(2 * Math.PI * 1661 * t)) * 0.5 * Math.exp(-4 * t);
          break;
        case 'effect_freeze':
          // Icy crystalline sound
          sample = Math.sin(2 * Math.PI * (2000 - t * 1000) * t) * Math.exp(-3 * t);
          break;
        case 'effect_speed':
          // Fast whoosh
          sample = Math.sin(2 * Math.PI * (500 + t * 1000) * t) * Math.exp(-5 * t);
          break;
        case 'effect_slow':
          // Descending tone
          sample = Math.sin(2 * Math.PI * (400 - t * 200) * t) * Math.exp(-3 * t);
          break;
        case 'effect_magnet':
          // Metallic buzz
          sample = (Math.sin(2 * Math.PI * 200 * t) + Math.sin(2 * Math.PI * 210 * t)) * 0.5 * Math.exp(-4 * t);
          break;
        case 'effect_shield':
          // Protective hum
          sample = (Math.sin(2 * Math.PI * 300 * t) + Math.sin(2 * Math.PI * 450 * t)) * 0.5 * Math.exp(-2 * t);
          break;
        case 'combo':
          // Rising pitch
          const comboFreq = 660 + (t / duration) * 330;
          sample = Math.sin(2 * Math.PI * comboFreq * t) * Math.exp(-4 * t);
          break;
        case 'level_up':
          // Victory fanfare
          if (t < 0.1) sample = Math.sin(2 * Math.PI * 523 * t);
          else if (t < 0.2) sample = Math.sin(2 * Math.PI * 659 * t);
          else sample = Math.sin(2 * Math.PI * 784 * t);
          sample *= Math.exp(-3 * t);
          break;
        case 'game_over':
          // Sad descending
          const gameOverFreq = 440 - t * 300;
          sample = Math.sin(2 * Math.PI * gameOverFreq * t) * Math.exp(-2 * t);
          break;
        case 'game_start':
          // Exciting start
          if (t < 0.05) sample = Math.sin(2 * Math.PI * 440 * t);
          else if (t < 0.1) sample = Math.sin(2 * Math.PI * 554 * t);
          else sample = Math.sin(2 * Math.PI * 659 * t);
          sample *= Math.exp(-2 * t);
          break;
        case 'pause':
          // Simple blip
          sample = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-10 * t);
          break;
        case 'button_click':
          // Short click
          sample = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-20 * t);
          break;
        case 'explosion':
          // Noise burst
          sample = (Math.random() * 2 - 1) * Math.exp(-10 * t);
          break;
        default:
          sample = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-5 * t);
      }

      data[i] = sample * 0.3; // Master volume scaling
    }

    return buffer;
  }, [initAudio]);

  const playSound = useCallback((type: SoundEffect) => {
    if (!enabled) return;

    initAudio();
    const ctx = audioContextRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Get or generate sound buffer
    let buffer = soundBuffersRef.current.get(type);
    if (!buffer) {
      buffer = generateSound(type);
      if (buffer) {
        soundBuffersRef.current.set(type, buffer);
      }
    }

    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(masterGain);
      source.start();
      activeSourcesRef.current.push(source);

      // Cleanup after playback
      source.onended = () => {
        const index = activeSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeSourcesRef.current.splice(index, 1);
        }
      };
    }
  }, [enabled, generateSound, initAudio]);

  const stopAllSounds = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch { /* ignore */ }
    });
    activeSourcesRef.current = [];
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  return {
    playSound,
    stopAllSounds,
    setVolume,
    isEnabled: enabled
  };
}
