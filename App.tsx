
import React, { useState, useEffect } from 'react';
import { ScreenName, UserSettings, ThemeType, ThemeColors, MoodType } from './types';
import { getSettings, updateSettings, saveSession } from './services/storageService';
import { SplashScreen } from './screens/SplashScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { EndScreen } from './screens/EndScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// Base Colors only
const THEMES_BASE: Record<ThemeType, Omit<ThemeColors, 'bg' | 'surface' | 'surfaceHighlight' | 'textMain' | 'textDim' | 'border'>> = {
  MIDNIGHT: { gray: 'zinc', accent: 'emerald', accentHex: '#10b981' }, 
  OCEAN: { gray: 'slate', accent: 'cyan', accentHex: '#06b6d4' }, 
  SUNSET: { gray: 'stone', accent: 'orange', accentHex: '#f97316' }, 
  LAVENDER: { gray: 'neutral', accent: 'violet', accentHex: '#8b5cf6' }, 
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(ScreenName.SPLASH);
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [sessionDuration, setSessionDuration] = useState(60);

  // --- HISTORY & BACK BUTTON MANAGEMENT ---
  useEffect(() => {
    window.history.replaceState({ screen: ScreenName.SPLASH }, '');
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setCurrentScreen(event.state.screen);
      } else {
        setCurrentScreen(ScreenName.HOME);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (screen: ScreenName) => {
    if (currentScreen === ScreenName.SPLASH && screen === ScreenName.HOME) {
        window.history.replaceState({ screen }, '');
    } else {
        window.history.pushState({ screen }, '');
    }
    setCurrentScreen(screen);
  };

  const navigateBack = () => {
    window.history.back();
  };

  // ----------------------------------------

  useEffect(() => {
    setSettings(getSettings());
    setSessionDuration(getSettings().preferredDuration);
  }, [currentScreen]);

  const handleSettingsUpdate = (updates: Partial<UserSettings>) => {
    const newSettings = updateSettings(updates);
    setSettings(newSettings);
    setSessionDuration(newSettings.preferredDuration);
  };

  const handleSessionComplete = (completed: boolean) => {
    if (completed) {
      // Don't save yet, wait for Mood input in EndScreen
      // Just navigate to EndScreen
      window.history.replaceState({ screen: ScreenName.END }, '');
      setCurrentScreen(ScreenName.END);
    } else {
      navigateBack();
    }
  };

  const finalizeSession = (mood: MoodType) => {
      // Save data with Mood
      saveSession({
        id: Date.now().toString(),
        timestamp: Date.now(),
        durationSeconds: sessionDuration,
        completed: true,
        mood: mood 
      });
      navigateTo(ScreenName.HOME);
  };

  // --- NATIVE BRIDGE SETUP ---
  useEffect(() => {
    window.unlockPremiumFromNative = () => {
      handleSettingsUpdate({ isPremium: true });
    };
    return () => {
      // @ts-ignore
      delete window.unlockPremiumFromNative;
    };
  }, []);

  // --- THEME & MODE LOGIC ---
  const baseTheme = THEMES_BASE[settings.theme] || THEMES_BASE.MIDNIGHT;
  
  const currentTheme: ThemeColors = {
    ...baseTheme,
    bg: settings.isDarkMode ? '950' : '50',
    surface: settings.isDarkMode ? '900' : '200',
    surfaceHighlight: settings.isDarkMode ? '800' : '300',
    textMain: settings.isDarkMode ? '100' : '900',
    textDim: settings.isDarkMode ? '500' : '600',
    border: settings.isDarkMode ? '800' : '300'
  };

  useEffect(() => {
    document.body.className = `bg-${currentTheme.gray}-${currentTheme.bg} text-${currentTheme.gray}-${currentTheme.textMain} antialiased select-none overflow-hidden h-screen w-screen transition-colors duration-500`;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        const statusBarHex = settings.isDarkMode ? '#09090b' : '#fafafa';
        metaThemeColor.setAttribute('content', statusBarHex);
    }
  }, [currentTheme, settings.theme, settings.isDarkMode]);

  const renderScreen = () => {
    switch (currentScreen) {
      case ScreenName.SPLASH:
        return <SplashScreen onComplete={() => navigateTo(ScreenName.HOME)} theme={currentTheme} />;
      
      case ScreenName.HOME:
        return (
          <HomeScreen 
            onStart={() => navigateTo(ScreenName.SESSION)}
            onNavigateHistory={() => navigateTo(ScreenName.HISTORY)}
            onNavigateSettings={() => navigateTo(ScreenName.SETTINGS)}
            settings={settings}
            theme={currentTheme}
          />
        );
      
      case ScreenName.SESSION:
        return (
          <SessionScreen 
            duration={sessionDuration} 
            soundEnabled={settings.soundEnabled}
            activeSounds={settings.soundMix}
            theme={currentTheme}
            breathPatternId={settings.breathPattern}
            customBreathConfig={settings.customBreathConfig}
            hapticEnabled={settings.hapticSyncEnabled}
            onComplete={handleSessionComplete} 
          />
        );
      
      case ScreenName.END:
        return (
          <EndScreen 
            onRestart={() => {
                window.history.replaceState({ screen: ScreenName.SESSION }, '');
                setCurrentScreen(ScreenName.SESSION);
            }}
            onDone={finalizeSession}
            theme={currentTheme}
          />
        );
      
      case ScreenName.HISTORY:
        return (
          <HistoryScreen 
            onBack={navigateBack}
            settings={settings}
            theme={currentTheme}
            onUpdateSettings={handleSettingsUpdate}
          />
        );
      
      case ScreenName.SETTINGS:
        return (
          <SettingsScreen 
            onBack={navigateBack}
            settings={settings}
            theme={currentTheme}
            onUpdateSettings={handleSettingsUpdate}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={`h-full w-full max-w-md mx-auto bg-${currentTheme.gray}-${currentTheme.bg} text-${currentTheme.gray}-${currentTheme.textMain} shadow-2xl overflow-hidden relative transition-colors duration-500`}>
      {renderScreen()}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
