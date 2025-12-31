
import { SessionRecord, UserSettings, LevelData, Achievement, BreathPattern, BreathPatternType, CustomBreathConfig } from '../types';

const KEYS = {
  SESSIONS: 'pause_sessions',
  SETTINGS: 'pause_settings',
};

const DEFAULT_SETTINGS: UserSettings = {
  isPremium: false,
  onboarded: false,
  preferredDuration: 60,
  soundEnabled: false,
  isDarkMode: true,
  soundMix: ['AIR'], // Default to Air
  theme: 'MIDNIGHT',
  breathPattern: 'COHERENCE',
  customBreathConfig: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
  hapticSyncEnabled: true,
  dailyReminderTime: null,
};

// Base Patterns
const BASE_PATTERNS: Record<Exclude<BreathPatternType, 'CUSTOM'>, BreathPattern> = {
  COHERENCE: {
    id: 'COHERENCE',
    name: 'Coherence',
    description: 'Balance (5s In, 5s Out)',
    phases: [
      { label: 'Inhale', duration: 5000, scale: 1.5, opacity: 1 },
      { label: 'Exhale', duration: 5000, scale: 1.0, opacity: 0.5 },
    ]
  },
  BOX: {
    id: 'BOX',
    name: 'Box Breathing',
    description: 'Focus (4s In, Hold, Out, Hold)',
    phases: [
      { label: 'Inhale', duration: 4000, scale: 1.5, opacity: 1 },
      { label: 'Hold', duration: 4000, scale: 1.5, opacity: 1 },
      { label: 'Exhale', duration: 4000, scale: 1.0, opacity: 0.5 },
      { label: 'Hold', duration: 4000, scale: 1.0, opacity: 0.5 },
    ]
  },
  RELAX_478: {
    id: 'RELAX_478',
    name: '4-7-8 Relax',
    description: 'Sleep (4s In, 7s Hold, 8s Out)',
    phases: [
      { label: 'Inhale', duration: 4000, scale: 1.5, opacity: 1 },
      { label: 'Hold', duration: 7000, scale: 1.5, opacity: 1 },
      { label: 'Exhale', duration: 8000, scale: 1.0, opacity: 0.5 },
    ]
  }
};

// Helper to generate pattern object
export const getBreathPattern = (type: BreathPatternType, customConfig?: CustomBreathConfig): BreathPattern => {
  if (type === 'CUSTOM' && customConfig) {
    const phases = [];
    phases.push({ label: 'Inhale', duration: customConfig.inhale * 1000, scale: 1.5, opacity: 1 });
    if (customConfig.holdIn > 0) phases.push({ label: 'Hold', duration: customConfig.holdIn * 1000, scale: 1.5, opacity: 1 });
    phases.push({ label: 'Exhale', duration: customConfig.exhale * 1000, scale: 1.0, opacity: 0.5 });
    if (customConfig.holdOut > 0) phases.push({ label: 'Hold', duration: customConfig.holdOut * 1000, scale: 1.0, opacity: 0.5 });

    return {
      id: 'CUSTOM',
      name: 'Custom',
      description: 'Your personal rhythm',
      phases
    };
  }
  return BASE_PATTERNS[type as Exclude<BreathPatternType, 'CUSTOM'>] || BASE_PATTERNS.COHERENCE;
};

const QUOTES = [
  "Almost everything will work again if you unplug it for a few minutes, including you.",
  "Quiet the mind, and the soul will speak.",
  "You are the sky. Everything else is just the weather.",
  "Breathe. You are exactly where you need to be.",
  "Peace comes from within. Do not seek it without.",
  "The present moment is the only moment available to us.",
  "Nature does not hurry, yet everything is accomplished.",
  "Do less, be more.",
  "Your calm mind is the ultimate weapon against your challenges.",
  "Simplicity is the ultimate sophistication."
];

export const getDailyQuote = (): string => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  
  return QUOTES[day % QUOTES.length];
};

export const getSessions = (): SessionRecord[] => {
  try {
    const data = localStorage.getItem(KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveSession = (session: SessionRecord): void => {
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
};

export const getSettings = (): UserSettings => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(data);
    
    // Migration: selectedSound -> soundMix
    if (parsed.selectedSound && !parsed.soundMix) {
      parsed.soundMix = [parsed.selectedSound];
    }

    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const updateSettings = (updates: Partial<UserSettings>): UserSettings => {
  const current = getSettings();
  const updated = { ...current, ...updates };
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
};

export const calculateStreak = (): number => {
  const sessions = getSessions();
  if (sessions.length === 0) return 0;

  const sortedSessions = sessions
    .filter(s => s.completed)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (sortedSessions.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date().setHours(0,0,0,0);
  
  const lastSessionDate = new Date(sortedSessions[0].timestamp).setHours(0,0,0,0);
  if (lastSessionDate === currentDate) {
      streak = 1;
  } else if (lastSessionDate < currentDate - 86400000) {
      return 0;
  }
  
  // Simplified logic
  return streak > 0 ? streak : 0; 
};

export const getHistoryStats = () => {
  const sessions = getSessions();
  const completed = sessions.filter(s => s.completed);
  const totalMinutes = Math.floor(completed.reduce((acc, curr) => acc + curr.durationSeconds, 0) / 60);
  
  return {
    totalSessions: completed.length,
    totalMinutes,
    todayCount: completed.filter(s => {
      const d = new Date(s.timestamp);
      const today = new Date();
      return d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    }).length
  };
};

const LEVELS = [
  { name: 'Novice', threshold: 0 },
  { name: 'Seeker', threshold: 10 },
  { name: 'Wanderer', threshold: 60 },
  { name: 'Sage', threshold: 300 },
  { name: 'Master', threshold: 1000 },
];

export const calculateLevel = (): LevelData => {
  const { totalMinutes } = getHistoryStats();
  
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalMinutes >= LEVELS[i].threshold) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    }
  }

  return {
    name: currentLevel.name,
    minMinutes: currentLevel.threshold,
    nextLevelMinutes: nextLevel ? nextLevel.threshold : null
  };
};

export const getAchievements = (): Achievement[] => {
  const { totalSessions, totalMinutes } = getHistoryStats();
  const streak = calculateStreak();
  const sessions = getSessions();
  
  const hasMorningSession = sessions.some(s => {
    const h = new Date(s.timestamp).getHours();
    return s.completed && h >= 5 && h < 9;
  });

  const hasNightSession = sessions.some(s => {
    const h = new Date(s.timestamp).getHours();
    return s.completed && (h >= 22 || h < 2);
  });

  return [
    {
      id: 'first_step',
      title: 'First Step',
      description: 'Complete your first pause.',
      icon: 'fa-shoe-prints',
      isUnlocked: totalSessions >= 1
    },
    {
      id: 'momentum',
      title: 'Momentum',
      description: 'Reach a 3-day streak.',
      icon: 'fa-fire',
      isUnlocked: streak >= 3
    },
    {
      id: 'hour_glass',
      title: 'Hourglass',
      description: 'Pause for 60 total minutes.',
      icon: 'fa-hourglass-half',
      isUnlocked: totalMinutes >= 60
    },
    {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Complete a session before 9 AM.',
      icon: 'fa-sun',
      isUnlocked: hasMorningSession
    },
    {
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Complete a session after 10 PM.',
      icon: 'fa-moon',
      isUnlocked: hasNightSession
    },
    {
      id: 'monk',
      title: 'The Monk',
      description: 'Reach 100 total sessions.',
      icon: 'fa-om',
      isUnlocked: totalSessions >= 100
    }
  ];
};
