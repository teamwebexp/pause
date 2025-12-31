
import React, { useMemo, useEffect } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } from '@capacitor-community/admob';
import useLongPress from '../hooks/useLongPress';
import { UserSettings, ThemeColors } from '../types';
import { calculateLevel, getDailyQuote } from '../services/storageService';

interface Props {
  onStart: () => void;
  onNavigateHistory: () => void;
  onNavigateSettings: () => void;
  settings: UserSettings;
  theme: ThemeColors;
}

export const HomeScreen: React.FC<Props> = ({ onStart, onNavigateHistory, onNavigateSettings, settings, theme }) => {
  const level = useMemo(() => calculateLevel(), []);
  const dailyQuote = useMemo(() => getDailyQuote(), []);
  
  // --- AdMob Integration ---
  useEffect(() => {
    const initAds = async () => {
      if (settings.isPremium) {
        // Hide banner if user became premium
        try { await AdMob.hideBanner(); } catch (e) {}
        return;
      }

      try {
        await AdMob.initialize();
        
        // IMPORTANT: Use Test IDs for development. Replace with real ID in production.
        // Android Test ID: ca-app-pub-3940256099942544/6300978111
        const adId = 'ca-app-pub-3940256099942544/6300978111'; 

        await AdMob.showBanner({
          adId: adId,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0, 
        });
      } catch (e) {
        console.error("AdMob Error:", e);
      }
    };

    initAds();

    return () => {
       // Optional: Hide banner when leaving screen if desired, 
       // but typically banners stay on main screens.
    };
  }, [settings.isPremium]);

  const { onMouseDown, onTouchStart, onMouseUp, onMouseLeave, onTouchEnd } = useLongPress(
    () => {
      // Long press action: Quick Calm
      if (navigator.vibrate) navigator.vibrate(50);
      onStart(); 
    },
    () => {
      // Regular click
      onStart();
    },
    { delay: 800 }
  );

  return (
    <div className="flex flex-col h-full w-full relative p-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center py-4">
        <button onClick={onNavigateHistory} className={`p-3 text-${theme.gray}-${theme.textDim} hover:text-${theme.accent}-400 transition-colors`}>
          <i className="fa-solid fa-chart-simple text-xl"></i>
        </button>
        
        {/* Level Pill */}
        <div className={`px-3 py-1 rounded-full bg-${theme.gray}-${theme.surface} border border-${theme.gray}-${theme.border} flex items-center gap-2`}>
           <i className={`fa-solid fa-seedling text-[10px] text-${theme.accent}-500`}></i>
           <span className={`text-[10px] uppercase tracking-widest text-${theme.gray}-${theme.textDim}`}>{level.name}</span>
        </div>

        <button onClick={onNavigateSettings} className={`p-3 text-${theme.gray}-${theme.textDim} hover:text-${theme.accent}-400 transition-colors`}>
          <i className="fa-solid fa-gear text-xl"></i>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative group">
          <div className={`absolute -inset-1 bg-${theme.accent}-500 rounded-full opacity-20 group-hover:opacity-40 blur transition duration-1000 group-hover:duration-200`}></div>
          <button
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchEnd={onTouchEnd}
            className={`relative w-48 h-48 rounded-full bg-${theme.gray}-${theme.surface} border border-${theme.gray}-${theme.border} flex items-center justify-center shadow-2xl active:scale-95 transition-transform duration-300`}
          >
            <div className="flex flex-col items-center">
              <span className={`text-${theme.accent}-500 text-lg font-light tracking-widest mb-1`}>PAUSE</span>
              {settings.preferredDuration !== 60 && (
                <span className={`text-${theme.gray}-600 text-xs`}>{Math.floor(settings.preferredDuration/60)} min</span>
              )}
            </div>
          </button>
        </div>
        <p className={`mt-12 text-${theme.gray}-${theme.textDim} text-sm tracking-wide text-center max-w-[200px]`}>
          Tap when your mind feels busy
        </p>
      </div>

      {/* Daily Wisdom / Ad Space Placeholder */}
      <div className="mt-auto min-h-[60px] flex items-center justify-center pb-12">
        {settings.isPremium ? (
             <p className={`text-[10px] text-${theme.gray}-${theme.textDim} text-center italic max-w-xs leading-relaxed opacity-70`}>
                "{dailyQuote}"
             </p>
        ) : (
            // Empty spacer - AdMob banner will overlay here at the bottom
            <div className="h-12 w-full"></div>
        )}
      </div>
    </div>
  );
};
