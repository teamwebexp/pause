import React, { useEffect, useState, useRef } from 'react';
import { ThemeColors, BreathPattern } from '../types';

interface BreathingRingProps {
  isActive: boolean;
  duration: number; // Total session duration
  onComplete: () => void;
  theme: ThemeColors;
  pattern: BreathPattern;
}

export const BreathingRing: React.FC<BreathingRingProps> = ({ isActive, duration, onComplete, theme, pattern }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentScale, setCurrentScale] = useState(1);
  const [currentOpacity, setCurrentOpacity] = useState(0.5);
  
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, onComplete]);

  // Breathing Cycle Logic
  useEffect(() => {
    if (!isActive) {
        setCurrentPhaseIndex(0);
        setCurrentScale(1);
        setCurrentOpacity(0.5);
        return;
    }

    let phaseIndex = 0;

    const runPhase = () => {
      const phase = pattern.phases[phaseIndex];
      
      // Update visuals
      setCurrentPhaseIndex(phaseIndex);
      setCurrentScale(phase.scale);
      setCurrentOpacity(phase.opacity);

      // Schedule next phase
      phaseTimerRef.current = setTimeout(() => {
        phaseIndex = (phaseIndex + 1) % pattern.phases.length;
        runPhase();
      }, phase.duration);
    };

    runPhase();

    return () => {
        if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, [isActive, pattern]);

  // Convert hex to rgb for rgba string construction
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };

  const rgbAccent = hexToRgb(theme.accentHex);
  const currentPhase = pattern.phases[currentPhaseIndex];

  return (
    <div className="relative flex items-center justify-center w-72 h-72">
      {/* Visual Breath Representation */}
      <div 
        className="absolute rounded-full border-2 transition-all ease-in-out will-change-transform"
        style={{
          width: '12rem',
          height: '12rem',
          borderColor: `rgba(${rgbAccent},${isActive ? '0.8' : '0.3'})`,
          transform: isActive ? `scale(${currentScale})` : 'scale(1)',
          opacity: isActive ? 1 : 0.5,
          transitionDuration: `${isActive ? currentPhase.duration : 1000}ms`
        }}
      />
      
      {/* Inner Fill */}
      <div 
        className={`absolute rounded-full bg-${theme.accent}-500/10 blur-xl transition-all ease-in-out will-change-transform`}
        style={{
          width: '10rem',
          height: '10rem',
          transform: isActive ? `scale(${currentScale})` : 'scale(1)',
          opacity: isActive ? currentOpacity : 0.2,
          transitionDuration: `${isActive ? currentPhase.duration : 1000}ms`
        }}
      />

      {/* Core Information */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        <span className={`text-5xl font-extralight tracking-wider text-${theme.gray}-${theme.textMain} tabular-nums`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </span>
        <span className={`mt-3 text-xs text-${theme.accent}-500 uppercase tracking-[0.3em] font-medium transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
           {isActive ? currentPhase.label : "Ready"}
        </span>
      </div>
    </div>
  );
};