
export enum ScreenName {
  SPLASH = 'SPLASH',
  HOME = 'HOME',
  SESSION = 'SESSION',
  END = 'END',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS', // Doubles as Premium/Monetization screen
}

export type MoodType = 'STRESSED' | 'ANXIOUS' | 'NEUTRAL' | 'CALM' | 'ENERGIZED';

export interface SessionRecord {
  id: string;
  timestamp: number;
  durationSeconds: number;
  completed: boolean;
  mood?: MoodType; // New: Feature #1
}

export type SoundType = 'AIR' | 'RAIN' | 'STREAM' | 'WAVES' | 'FOREST';

export type ThemeType = 'MIDNIGHT' | 'OCEAN' | 'SUNSET' | 'LAVENDER';

export type BreathPatternType = 'COHERENCE' | 'BOX' | 'RELAX_478' | 'CUSTOM';

export interface BreathPattern {
  id: BreathPatternType;
  name: string;
  description: string;
  phases: { label: string; duration: number; scale: number; opacity: number }[];
}

export interface CustomBreathConfig {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

export interface UserSettings {
  isPremium: boolean;
  onboarded: boolean;
  preferredDuration: number; // in seconds
  soundEnabled: boolean;
  isDarkMode: boolean;
  
  // Feature #4: Sound Mixer (Replaces single selectedSound)
  soundMix: SoundType[]; 
  
  theme: ThemeType;
  breathPattern: BreathPatternType;
  
  // Feature #2: Custom Breath
  customBreathConfig: CustomBreathConfig;

  // Feature #3: Haptics
  hapticSyncEnabled: boolean;

  // Feature #5: Notifications
  dailyReminderTime: string | null; // "HH:MM" 24h format
}

export interface AppState {
  currentScreen: ScreenName;
  lastSession: SessionRecord | null;
}

export interface ThemeColors {
  gray: string;
  accent: string;
  accentHex: string; // For rgba generation in styles
  // Dynamic shades based on mode
  bg: string;       // e.g. '950' or '50'
  surface: string;  // e.g. '900' or '200'
  surfaceHighlight: string; // e.g. '800' or '300'
  textMain: string; // e.g. '100' or '900'
  textDim: string;  // e.g. '500' or '600'
  border: string;   // e.g. '800' or '300'
}

export interface LevelData {
  name: string;
  minMinutes: number;
  nextLevelMinutes: number | null; // null if max level
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
}
