import React, { useEffect } from 'react';
import { ThemeColors } from '../types';

interface Props {
  onComplete: () => void;
  theme: ThemeColors;
}

export const SplashScreen: React.FC<Props> = ({ onComplete, theme }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`flex flex-col items-center justify-center h-full w-full bg-${theme.gray}-${theme.bg} animate-fade-in`}>
      <div className={`w-20 h-20 bg-${theme.gray}-${theme.surface} rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-${theme.accent}-900/10`}>
        <div className={`w-8 h-8 bg-${theme.accent}-500 rounded-full animate-pulse`}></div>
      </div>
      <h1 className={`text-3xl font-light tracking-[0.2em] text-${theme.gray}-${theme.textMain} mb-2`}>PAUSE</h1>
      <p className={`text-${theme.gray}-${theme.textDim} text-sm tracking-widest uppercase`}>Take a moment</p>
    </div>
  );
};