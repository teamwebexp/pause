
import React, { useState } from 'react';
import { ThemeColors, MoodType } from '../types';

interface Props {
  onRestart: () => void;
  onDone: (mood: MoodType) => void;
  theme: ThemeColors;
}

export const EndScreen: React.FC<Props> = ({ onRestart, onDone, theme }) => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);

  const moods: { type: MoodType; label: string; icon: string }[] = [
    { type: 'STRESSED', label: 'Stressed', icon: 'fa-bolt' },
    { type: 'ANXIOUS', label: 'Anxious', icon: 'fa-wind' },
    { type: 'NEUTRAL', label: 'Neutral', icon: 'fa-minus' },
    { type: 'CALM', label: 'Calm', icon: 'fa-water' },
    { type: 'ENERGIZED', label: 'Energized', icon: 'fa-sun' },
  ];

  const handleDone = () => {
      onDone(selectedMood || 'NEUTRAL');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className={`w-16 h-16 rounded-full bg-${theme.accent}-500/10 flex items-center justify-center mb-6`}>
          <i className={`fa-solid fa-check text-${theme.accent}-500 text-xl`}></i>
        </div>
        
        {/* Feature #1: Mood Check-in */}
        <div className="w-full max-w-sm mb-8">
            <h2 className={`text-xl font-light text-${theme.gray}-${theme.textMain} text-center mb-6`}>How do you feel?</h2>
            <div className="flex justify-between gap-2">
                {moods.map(m => (
                    <button 
                        key={m.type}
                        onClick={() => setSelectedMood(m.type)}
                        className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all relative group ${
                            selectedMood === m.type 
                            ? `bg-${theme.accent}-500/10 text-${theme.accent}-500 scale-105 ring-1 ring-${theme.accent}-500/50 shadow-sm` 
                            : `bg-${theme.gray}-${theme.surface} text-${theme.gray}-${theme.textDim} hover:bg-${theme.gray}-${theme.surfaceHighlight}`
                        }`}
                    >
                        {/* Visual Confirmation Checkmark */}
                        {selectedMood === m.type && (
                            <div className={`absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-${theme.accent}-500 rounded-full flex items-center justify-center shadow-sm animate-fade-in`}>
                                <i className="fa-solid fa-check text-[7px] text-white"></i>
                            </div>
                        )}

                        <i className={`fa-solid ${m.icon} text-lg`}></i>
                        <span className="text-[9px] uppercase tracking-wider">{m.label}</span>
                    </button>
                ))}
            </div>
        </div>

        <p className={`text-${theme.gray}-${theme.textDim} text-center text-sm max-w-xs leading-relaxed`}>
          Carry this calmness with you.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4 mb-10">
        <button 
          onClick={onRestart}
          className={`w-full py-4 rounded-xl bg-${theme.gray}-${theme.surface} border border-${theme.gray}-${theme.border} text-${theme.gray}-${theme.textDim} hover:bg-${theme.gray}-${theme.surfaceHighlight} transition-all flex items-center justify-center gap-3`}
        >
          <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
          <span className="uppercase tracking-widest text-xs font-semibold">Pause Again</span>
        </button>

        <button 
          onClick={handleDone}
          disabled={!selectedMood}
          className={`w-full py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
              selectedMood 
              ? `bg-${theme.accent}-600 text-white shadow-${theme.accent}-900/20 hover:bg-${theme.accent}-500 transform active:scale-95`
              : `bg-${theme.gray}-${theme.surface} text-${theme.gray}-${theme.textDim} opacity-50 cursor-not-allowed`
          }`}
        >
          <span className="uppercase tracking-widest text-xs font-semibold">Complete Session</span>
        </button>
      </div>
    </div>
  );
};
