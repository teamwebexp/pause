
import React, { useMemo } from 'react';
import { getHistoryStats, calculateStreak, calculateLevel, getAchievements, getSessions } from '../services/storageService';
import { UserSettings, ThemeColors, MoodType } from '../types';

interface Props {
  onBack: () => void;
  settings: UserSettings;
  theme: ThemeColors;
  onUpdateSettings: (s: Partial<UserSettings>) => void;
}

export const HistoryScreen: React.FC<Props> = ({ onBack, settings, theme, onUpdateSettings }) => {
  const stats = useMemo(() => getHistoryStats(), []);
  const streak = useMemo(() => calculateStreak(), []);
  const level = useMemo(() => calculateLevel(), []);
  const achievements = useMemo(() => getAchievements(), []);
  const sessions = useMemo(() => getSessions(), []);

  // Most frequent mood logic
  const moodCounts = sessions.reduce((acc, s) => {
      if (s.mood) acc[s.mood] = (acc[s.mood] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  
  const dominantMood = Object.entries(moodCounts).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0] as MoodType | undefined;
  
  const moodIcons: Record<string, string> = {
    STRESSED: 'fa-bolt', ANXIOUS: 'fa-wind', NEUTRAL: 'fa-minus', CALM: 'fa-water', ENERGIZED: 'fa-sun'
  };

  const progressPercent = useMemo(() => {
    if (!level.nextLevelMinutes) return 100;
    const currentBase = level.minMinutes;
    const nextTarget = level.nextLevelMinutes;
    const total = stats.totalMinutes;
    const range = nextTarget - currentBase;
    const currentInLevel = total - currentBase;
    return Math.min(100, Math.max(0, (currentInLevel / range) * 100));
  }, [level, stats.totalMinutes]);

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  // Analytics: Last 7 Days
  const last7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' }); 
      const startOfDay = new Date(d.setHours(0,0,0,0)).getTime();
      const endOfDay = new Date(d.setHours(23,59,59,999)).getTime();
      
      const dayMinutes = sessions
        .filter(s => s.timestamp >= startOfDay && s.timestamp <= endOfDay && s.completed)
        .reduce((acc, s) => acc + (s.durationSeconds / 60), 0);
        
      days.push({ label: dayLabel, value: Math.round(dayMinutes) });
    }
    return days;
  }, [sessions]);
  
  const maxDailyMinutes = Math.max(...last7Days.map(d => d.value), 10); 

  // Analytics: Mood Distribution
  const moodStats = useMemo(() => {
     const total = Object.values(moodCounts).reduce((a: number, b: number) => a + b, 0);
     if (total === 0) return [];
     return Object.entries(moodCounts)
        .map(([mood, count]) => {
            const c = count as number;
            return { mood: mood as MoodType, count: c, percent: (c/total)*100 };
        })
        .sort((a,b) => b.count - a.count);
  }, [moodCounts]);

  return (
    <div className={`h-full w-full flex flex-col pt-6 pb-20 px-6 animate-slide-up bg-${theme.gray}-${theme.bg} overflow-y-auto no-scrollbar`}>
      <div className="flex items-center mb-8 shrink-0">
        <button onClick={onBack} className={`p-2 -ml-2 text-${theme.gray}-${theme.textDim} hover:text-${theme.gray}-${theme.textMain} transition-colors`}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h1 className={`ml-4 text-xl font-light tracking-wider text-${theme.gray}-${theme.textMain}`}>Your Journey</h1>
      </div>

      {/* Level Card */}
      <div className={`p-6 bg-${theme.gray}-${theme.surface}/50 rounded-2xl border border-${theme.gray}-${theme.border} mb-6 relative overflow-hidden shrink-0`}>
        <div className={`absolute top-0 left-0 h-1 bg-${theme.accent}-600 transition-all duration-1000`} style={{ width: `${progressPercent}%` }}></div>
        <div className="flex justify-between items-start mb-2">
            <div>
                <span className={`text-[10px] uppercase tracking-widest text-${theme.gray}-${theme.textDim}`}>Current Level</span>
                <h2 className={`text-2xl font-light text-${theme.accent}-500 mt-1`}>{level.name}</h2>
            </div>
            <div className={`w-10 h-10 rounded-full bg-${theme.gray}-${theme.surfaceHighlight} flex items-center justify-center`}>
                <i className={`fa-solid fa-seedling text-${theme.accent}-500`}></i>
            </div>
        </div>
        <div className="mt-4">
             <div className="flex justify-between text-xs mb-1">
                 <span className={`text-${theme.gray}-${theme.textDim}`}>{stats.totalMinutes} mins</span>
                 {level.nextLevelMinutes ? (
                     <span className={`text-${theme.gray}-${theme.textDim}`}>Next: {level.nextLevelMinutes} mins</span>
                 ) : (
                     <span className={`text-${theme.accent}-500`}>Max Level</span>
                 )}
             </div>
             <div className={`w-full h-1.5 bg-${theme.gray}-${theme.surfaceHighlight} rounded-full overflow-hidden`}>
                 <div className={`h-full bg-${theme.accent}-600 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${progressPercent}%` }}></div>
             </div>
        </div>
      </div>

      {/* Feature Cards: Streak & Mood */}
      <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
        {/* Streak Card */}
        <div className={`bg-${theme.gray}-${theme.surface}/50 p-5 rounded-2xl border border-${theme.gray}-${theme.border} flex flex-col items-center justify-center relative overflow-hidden min-h-[140px] group`}>
            <div className={`w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid fa-fire text-xl ${streak > 0 ? 'text-orange-500' : `text-${theme.gray}-${theme.textDim}`}`}></i>
            </div>
            <span className={`text-3xl font-light text-${theme.gray}-${theme.textMain} mb-1`}>{streak}</span>
            <span className={`text-[9px] text-${theme.gray}-${theme.textDim} uppercase tracking-widest`}>Day Streak</span>
            {streak > 0 && <div className="absolute inset-0 bg-orange-500/5 blur-xl"></div>}
        </div>

        {/* Mood Card (Premium) */}
        <div className={`bg-${theme.gray}-${theme.surface}/50 p-5 rounded-2xl border border-${theme.gray}-${theme.border} flex flex-col items-center justify-center relative overflow-hidden min-h-[140px]`}>
            {settings.isPremium ? (
                 <>
                    <div className={`w-12 h-12 rounded-full bg-${theme.accent}-500/10 flex items-center justify-center mb-3`}>
                       <i className={`fa-solid ${dominantMood ? moodIcons[dominantMood] : 'fa-chart-pie'} text-xl text-${theme.accent}-500`}></i>
                    </div>
                    <span className={`text-xl font-light text-${theme.gray}-${theme.textMain} capitalize mb-1`}>
                        {dominantMood ? dominantMood.toLowerCase() : '--'}
                    </span>
                    <span className={`text-[9px] text-${theme.gray}-${theme.textDim} uppercase tracking-widest`}>Top Mood</span>
                 </>
            ) : (
                <>
                    <div className="flex flex-col items-center blur-[3px] opacity-40 select-none">
                        <div className={`w-12 h-12 rounded-full bg-${theme.gray}-${theme.surfaceHighlight} mb-3`}></div>
                        <span className="text-xl mb-1">Calm</span>
                        <span className="text-[9px] uppercase tracking-widest">Top Mood</span>
                    </div>
                     <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                         <div className={`w-8 h-8 rounded-full bg-${theme.gray}-${theme.surface} border border-${theme.gray}-${theme.border} flex items-center justify-center shadow-sm mb-1`}>
                            <i className={`fa-solid fa-lock text-xs text-${theme.accent}-500`}></i>
                         </div>
                         <span className={`text-[8px] font-bold text-${theme.gray}-${theme.textMain} uppercase tracking-widest`}>Premium</span>
                     </div>
                </>
            )}
        </div>
      </div>

      {/* Analytics: Weekly Activity (Graph) */}
      <div className={`mb-6 p-5 bg-${theme.gray}-${theme.surface}/30 rounded-2xl border border-${theme.gray}-${theme.border} shrink-0 relative overflow-hidden`}>
        {settings.isPremium ? (
            <>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest`}>Weekly Focus</h3>
                    <span className={`text-[10px] text-${theme.gray}-${theme.textDim}`}>Last 7 Days</span>
                </div>
                
                <div className="flex items-end justify-between h-32 w-full gap-2 px-1">
                {last7Days.map((d, i) => {
                    const heightPercent = Math.max((d.value / maxDailyMinutes) * 100, 4); // Min height visual
                    return (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-default">
                        <div className="relative w-full flex items-end justify-center h-full">
                            <div 
                                style={{ height: `${heightPercent}%` }}
                                className={`w-full max-w-[8px] sm:max-w-[12px] rounded-t-full transition-all duration-500 ease-out ${d.value > 0 ? `bg-${theme.accent}-500/80 group-hover:bg-${theme.accent}-500` : `bg-${theme.gray}-${theme.surfaceHighlight}`}`}
                            ></div>
                            
                            {/* Floating Tooltip */}
                            {d.value > 0 && (
                                <div className={`absolute -top-8 bg-${theme.gray}-${theme.surfaceHighlight} px-2 py-1 rounded text-[10px] text-${theme.gray}-${theme.textMain} opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none whitespace-nowrap z-10`}>
                                    {d.value} min
                                </div>
                            )}
                        </div>
                        <span className={`text-[9px] text-${theme.gray}-${theme.textDim} font-medium`}>{d.label}</span>
                        </div>
                    );
                })}
                </div>
            </>
        ) : (
            <>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                     <div className={`w-10 h-10 rounded-full bg-${theme.gray}-${theme.surface} border border-${theme.gray}-${theme.border} flex items-center justify-center shadow-lg mb-2`}>
                        <i className={`fa-solid fa-lock text-sm text-${theme.accent}-500`}></i>
                     </div>
                     <span className={`text-[10px] font-bold text-${theme.gray}-${theme.textMain} uppercase tracking-widest mb-1`}>Premium Insight</span>
                     <span className={`text-[8px] text-${theme.gray}-${theme.textDim}`}>Unlock weekly analysis</span>
                </div>

                <div className="flex justify-between items-center mb-6 blur-[2px] opacity-40">
                    <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest`}>Weekly Focus</h3>
                    <span className={`text-[10px] text-${theme.gray}-${theme.textDim}`}>Last 7 Days</span>
                </div>
                
                <div className="flex items-end justify-between h-32 w-full gap-2 px-1 blur-[2px] opacity-30 select-none pointer-events-none">
                    {[35, 20, 45, 10, 60, 25, 50].map((val, i) => (
                         <div key={i} className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-full flex items-end justify-center h-full">
                                <div style={{ height: `${val}%` }} className={`w-full max-w-[8px] sm:max-w-[12px] rounded-t-full bg-${theme.gray}-${theme.textDim}`}></div>
                            </div>
                            <span className={`text-[9px] text-${theme.gray}-${theme.textDim} font-medium`}>-</span>
                         </div>
                    ))}
                </div>
            </>
        )}
      </div>

      {/* Analytics: Mood Breakdown (Graph) */}
      {moodStats.length > 0 && (
        <div className={`mb-6 p-5 bg-${theme.gray}-${theme.surface}/30 rounded-2xl border border-${theme.gray}-${theme.border} shrink-0`}>
             <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest mb-4`}>Mood Breakdown</h3>
             <div className="space-y-3">
                 {moodStats.map((stat) => (
                     <div key={stat.mood} className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full bg-${theme.gray}-${theme.surfaceHighlight} flex items-center justify-center shrink-0`}>
                             <i className={`fa-solid ${moodIcons[stat.mood]} text-xs text-${theme.gray}-${theme.textDim}`}></i>
                         </div>
                         <div className="flex-1">
                             <div className="flex justify-between text-[10px] mb-1">
                                 <span className={`text-${theme.gray}-${theme.textMain} capitalize`}>{stat.mood.toLowerCase()}</span>
                                 <span className={`text-${theme.gray}-${theme.textDim}`}>{Math.round(stat.percent)}%</span>
                             </div>
                             <div className={`w-full h-1.5 bg-${theme.gray}-${theme.surface} rounded-full overflow-hidden`}>
                                 <div 
                                    className={`h-full bg-${theme.accent}-500/50 rounded-full`} 
                                    style={{ width: `${stat.percent}%` }}
                                 ></div>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
      )}

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8 shrink-0">
         {/* Today */}
         <div className={`bg-${theme.gray}-${theme.surface}/30 px-4 py-3 rounded-xl border border-${theme.gray}-${theme.border} flex items-center justify-between`}>
              <div className="flex flex-col">
                  <span className={`text-lg font-light text-${theme.gray}-${theme.textMain}`}>{stats.todayCount}</span>
                  <span className={`text-[8px] text-${theme.gray}-${theme.textDim} uppercase tracking-widest`}>Today</span>
              </div>
              <i className={`fa-solid fa-calendar-day text-${theme.gray}-${theme.surfaceHighlight} text-sm`}></i>
         </div>

         {/* Total Sessions */}
          <div className={`bg-${theme.gray}-${theme.surface}/30 px-4 py-3 rounded-xl border border-${theme.gray}-${theme.border} flex items-center justify-between`}>
              <div className="flex flex-col">
                  <span className={`text-lg font-light text-${theme.gray}-${theme.textMain}`}>{stats.totalSessions}</span>
                  <span className={`text-[8px] text-${theme.gray}-${theme.textDim} uppercase tracking-widest`}>Total</span>
              </div>
              <i className={`fa-solid fa-layer-group text-${theme.gray}-${theme.surfaceHighlight} text-sm`}></i>
         </div>
      </div>

      {/* Milestones / Badges */}
      <div className="mb-6 shrink-0">
        <div className="flex justify-between items-end mb-4">
             <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest`}>Milestones</h3>
             <span className={`text-[10px] text-${theme.gray}-${theme.textDim}`}>{unlockedCount}/{achievements.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
            {achievements.map((ach) => (
                <div key={ach.id} className={`aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 relative group ${ach.isUnlocked ? `bg-${theme.gray}-${theme.surface} border-${theme.accent}-500/50` : `bg-${theme.gray}-${theme.bg} border-${theme.gray}-${theme.border} opacity-60`}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${ach.isUnlocked ? `bg-${theme.accent}-500/10 text-${theme.accent}-500` : `bg-${theme.gray}-${theme.surfaceHighlight} text-${theme.gray}-${theme.textDim}`}`}>
                        <i className={`fa-solid ${ach.icon} text-sm`}></i>
                    </div>
                    <span className={`text-[8px] uppercase tracking-wider text-center ${ach.isUnlocked ? `text-${theme.gray}-${theme.textMain}` : `text-${theme.gray}-${theme.textDim}`}`}>{ach.title}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
