
import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BreathingRing } from '../components/BreathingRing';
import { SoundType, ThemeColors, BreathPatternType, CustomBreathConfig } from '../types';
import { getBreathPattern } from '../services/storageService';

interface Props {
  duration: number;
  soundEnabled: boolean;
  activeSounds: SoundType[];
  theme: ThemeColors;
  breathPatternId: BreathPatternType;
  customBreathConfig?: CustomBreathConfig;
  hapticEnabled: boolean;
  onComplete: (completed: boolean) => void;
}

export const SessionScreen: React.FC<Props> = ({ duration, soundEnabled, activeSounds, theme, breathPatternId, customBreathConfig, hapticEnabled, onComplete }) => {
  const [isStarted, setIsStarted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Record<SoundType, GainNode>>({} as any);
  const loopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPattern = getBreathPattern(breathPatternId, customBreathConfig);

  // Auto-start for smoothness after mount
  useEffect(() => {
    const t = setTimeout(() => setIsStarted(true), 500);
    return () => clearTimeout(t);
  }, []);

  // --- AUDIO & HAPTIC ENGINE ---
  useEffect(() => {
    if (!isStarted) return;

    // 1. Audio Setup
    if (soundEnabled && activeSounds.length > 0) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            if (ctx.state === 'suspended') ctx.resume();

            // Create a node for EACH active sound (Mixer)
            activeSounds.forEach(soundType => {
                createSoundLayer(ctx, soundType, gainNodesRef);
            });
        }
    }

    // 2. Loop Logic (Breathing & Audio Modulation & Haptics)
    const cycleDuration = currentPattern.phases.reduce((acc, p) => acc + p.duration, 0); // ms
    let phaseStartTime = Date.now();

    const runCycle = () => {
        const now = Date.now();
        const elapsedInCycle = now - phaseStartTime;
        
        // Find current phase based on elapsed time
        let accumulatedTime = 0;
        let activePhase = currentPattern.phases[0];
        
        for (let i = 0; i < currentPattern.phases.length; i++) {
            if (elapsedInCycle < accumulatedTime + currentPattern.phases[i].duration) {
                activePhase = currentPattern.phases[i];
                break;
            }
            accumulatedTime += currentPattern.phases[i].duration;
        }
        
        // Reset cycle if needed (though UI handles the loop visually, we track time here for haptics)
        if (elapsedInCycle >= cycleDuration) {
            phaseStartTime = now;
        }

        // --- Feature #3: HAPTICS ---
        if (hapticEnabled) {
             if (activePhase.label === 'Inhale') {
                 // Tick every 200ms
                 if (elapsedInCycle % 200 < 20) {
                     triggerHaptic('tick');
                 }
             } else if (activePhase.label === 'Hold') {
                 // Heartbeat every 1000ms
                 if (elapsedInCycle % 1000 < 20) {
                     triggerHaptic('heartbeat');
                 }
             } else if (activePhase.label === 'Exhale') {
                  // Tick every 300ms
                 if (elapsedInCycle % 300 < 20) {
                     triggerHaptic('tick');
                 }
             }
        }
    };

    const loop = setInterval(runCycle, 50); // High freq loop for haptics check
    loopTimerRef.current = loop;

    return () => {
        if (loopTimerRef.current) clearInterval(loopTimerRef.current);
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };
  }, [isStarted, soundEnabled, activeSounds, currentPattern, hapticEnabled]);

  const triggerHaptic = async (type: 'tick' | 'heartbeat') => {
      try {
          if (type === 'tick') {
              await Haptics.impact({ style: ImpactStyle.Light });
          } else if (type === 'heartbeat') {
              await Haptics.impact({ style: ImpactStyle.Heavy });
          }
      } catch (e) {
          // Fallback for non-capacitor environments
          if (navigator.vibrate) {
            if (type === 'tick') navigator.vibrate(10);
            if (type === 'heartbeat') navigator.vibrate([10, 30, 10]);
          }
      }
  };

  const createSoundLayer = (ctx: AudioContext, type: SoundType, ref: React.MutableRefObject<any>) => {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      generateNoise(type, bufferSize, data);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      
      const gain = ctx.createGain();
      gain.gain.value = 0; // Start silent

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();

      ref.current[type] = gain;

      // Schedule Modulation
      const cycleSeconds = currentPattern.phases.reduce((a,b)=>a+b.duration,0) / 1000;
      const inhaleDuration = currentPattern.phases[0].duration / 1000;
      
      let startTime = ctx.currentTime;
      const endTime = startTime + duration + 5; 

      while (startTime < endTime) {
          gain.gain.setValueAtTime(0.05, startTime);
          gain.gain.linearRampToValueAtTime(0.25, startTime + inhaleDuration);
          filter.frequency.setValueAtTime(200, startTime);
          filter.frequency.linearRampToValueAtTime(800, startTime + inhaleDuration);

          gain.gain.linearRampToValueAtTime(0.05, startTime + cycleSeconds);
          filter.frequency.linearRampToValueAtTime(200, startTime + cycleSeconds);

          startTime += cycleSeconds;
      }
  };

  const generateNoise = (type: SoundType, size: number, data: Float32Array) => {
      let lastOut = 0;
      for (let i = 0; i < size; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'RAIN') {
              data[i] = white * 0.1;
          } else if (type === 'FOREST' || type === 'STREAM') {
              data[i] = (lastOut + (0.02 * white)) / 1.02 * 3.5 * 0.15;
              lastOut = data[i];
          } else {
             let b0=0,b1=0,b2=0; 
             b0 = 0.99886 * b0 + white * 0.0555179;
             b1 = 0.99332 * b1 + white * 0.0750759;
             b2 = 0.96900 * b2 + white * 0.1538520;
             data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
          }
      }
  };

  const handleStop = () => {
    onComplete(false);
  };

  const handleFinish = () => {
    triggerHaptic('heartbeat');
    onComplete(true);
  };

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center relative bg-${theme.gray}-${theme.bg} animate-fade-in z-50`}>
      <div className="absolute top-20 w-full text-center px-6">
        <p className={`text-${theme.gray}-${theme.textDim} font-light tracking-wide transition-opacity duration-1000 ${isStarted ? 'opacity-100' : 'opacity-0'}`}>
          You are safe here.
        </p>
      </div>

      <BreathingRing 
        isActive={isStarted} 
        duration={duration} 
        onComplete={handleFinish}
        theme={theme}
        pattern={currentPattern}
      />
      
      <div className={`absolute bottom-32 text-[10px] uppercase tracking-[0.2em] text-${theme.accent}-500/50`}>
        {currentPattern.name} {activeSounds.length > 0 && soundEnabled && `• +${activeSounds.length} Sounds`}
      </div>

      <div className="absolute bottom-16">
        <button 
          onClick={handleStop}
          className={`text-${theme.gray}-${theme.textDim} text-sm px-6 py-2 hover:text-${theme.gray}-400 transition-colors tracking-widest uppercase`}
        >
          End Session
        </button>
      </div>
    </div>
  );
};
