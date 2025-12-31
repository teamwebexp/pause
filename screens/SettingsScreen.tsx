
import React, { useState, useEffect } from 'react';
import { Purchases, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { LocalNotifications } from '@capacitor/local-notifications';
import { UserSettings, SoundType, ThemeType, ThemeColors, BreathPatternType } from '../types';

interface Props {
  onBack: () => void;
  settings: UserSettings;
  theme: ThemeColors;
  onUpdateSettings: (s: Partial<UserSettings>) => void;
}

type PlanType = 'LIFETIME' | 'YEARLY' | 'MONTHLY';

// Mapping local IDs to RevenueCat Offering Identifiers
const OFFERING_KEYS: Record<PlanType, string> = {
  LIFETIME: 'pause_lifetime', 
  YEARLY: 'pause_yearly',
  MONTHLY: 'pause_monthly'
};

export const SettingsScreen: React.FC<Props> = ({ onBack, settings, theme, onUpdateSettings }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('LIFETIME');
  const [isProcessing, setIsProcessing] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  
  // Initialize RevenueCat & Fetch Products
  useEffect(() => {
    const setupPurchases = async () => {
      try {
        // REPLACE WITH YOUR REVENUECAT API KEY (Android)
        await Purchases.configure({ apiKey: "goog_YOUR_REVENUECAT_API_KEY_HERE" }); 
        
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.log("Purchases not configured (Web mode)", e);
      }
    };
    setupPurchases();
  }, []);

  const triggerPurchase = async (plan: PlanType) => {
    setSelectedPlan(plan);
    setIsProcessing(true);

    try {
        // 1. Try Native Purchase via RevenueCat
        const packageToBuy = packages.find(p => p.identifier === OFFERING_KEYS[plan]);
        
        if (packageToBuy) {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToBuy });
            if (customerInfo.entitlements.active['pro']) { // 'pro' is your Entitlement ID in RevenueCat
                onUpdateSettings({ isPremium: true });
                alert("Welcome to Premium!");
            }
        } else {
             // Fallback for Web/Testing without native config
             setShowPaymentModal(true);
        }
    } catch (e: any) {
        if (!e.userCancelled) {
             alert("Purchase failed. Please try again.");
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const handleMockPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
        onUpdateSettings({ isPremium: true });
        setIsProcessing(false);
        setShowPaymentModal(false);
    }, 1500);
  };

  const triggerRestore = async () => {
    setIsProcessing(true);
    try {
        const { customerInfo } = await Purchases.restorePurchases();
        if (customerInfo.entitlements.active['pro']) {
             onUpdateSettings({ isPremium: true });
             alert("Purchases restored!");
        } else {
             alert("No active subscriptions found.");
        }
    } catch (e) {
         // Web fallback
         setTimeout(() => {
             onUpdateSettings({ isPremium: true });
             alert("Restored (Mock)");
         }, 1000);
    } finally {
        setIsProcessing(false);
    }
  };

  const setDuration = (min: number) => {
    onUpdateSettings({ preferredDuration: min * 60 });
  };

  const toggleSound = (sound: SoundType) => {
    if (!settings.isPremium && sound !== 'AIR') return;
    
    // Feature #4: Sound Mixer (Multi-select)
    let newMix = [...settings.soundMix];
    if (newMix.includes(sound)) {
      if (newMix.length > 1) { // Prevent empty mix
        newMix = newMix.filter(s => s !== sound);
      }
    } else {
      // Free users can only have 1 sound active
      if (!settings.isPremium) {
        newMix = [sound];
      } else {
        newMix.push(sound);
      }
    }
    onUpdateSettings({ soundMix: newMix });
  };

  const selectTheme = (newTheme: ThemeType) => {
    if (!settings.isPremium && newTheme !== 'MIDNIGHT') return;
    onUpdateSettings({ theme: newTheme });
  };

  const toggleDarkMode = () => {
    if (!settings.isPremium) {
      triggerPurchase('LIFETIME');
      return;
    }
    onUpdateSettings({ isDarkMode: !settings.isDarkMode });
  };
  
  // Feature #5: Notification Logic (Native)
  const toggleNotification = async () => {
    if (settings.dailyReminderTime) {
        // Disable
        onUpdateSettings({ dailyReminderTime: null });
        try {
           await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        } catch (e) {}
    } else {
        // Enable with default
        const defaultTime = "09:00";
        onUpdateSettings({ dailyReminderTime: defaultTime });
        scheduleNativeNotification(9, 0);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    onUpdateSettings({ dailyReminderTime: time });
    const [h, m] = time.split(':').map(Number);
    scheduleNativeNotification(h, m);
  };

  const scheduleNativeNotification = async (hour: number, minute: number) => {
      try {
          await LocalNotifications.requestPermissions();
          await LocalNotifications.schedule({
              notifications: [{
                  id: 1,
                  title: "Time to Pause",
                  body: "Take a moment to breathe.",
                  schedule: { on: { hour, minute }, allowWhileIdle: true },
              }]
          });
      } catch (e) {
          console.log("Notification scheduling failed (Web mode)");
      }
  };

  const formatTimeDisplay = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hours = h % 12 || 12;
      return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Feature #2: Custom Breath Config
  const updateCustomBreath = (field: keyof UserSettings['customBreathConfig'], value: number) => {
    const newConfig = { ...settings.customBreathConfig, [field]: value };
    onUpdateSettings({ customBreathConfig: newConfig });
  };

  return (
    <div className={`h-full w-full flex flex-col px-6 pt-6 pb-20 animate-slide-up bg-${theme.gray}-${theme.bg} overflow-y-auto no-scrollbar relative`}>
      <div className="flex items-center mb-8 shrink-0">
        <button onClick={onBack} className={`p-2 -ml-2 text-${theme.gray}-${theme.textDim} hover:text-${theme.gray}-${theme.textMain} transition-colors`}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h1 className={`ml-4 text-xl font-light tracking-wider text-${theme.gray}-${theme.textMain}`}>Settings</h1>
      </div>

      {/* Premium Banner */}
      <div className={`rounded-2xl mb-8 relative shrink-0`}>
        {/* ... (Existing Premium Banner UI) ... */}
        <div className="relative z-10">
          <div className="mb-6">
             <h2 className={`text-xl font-semibold mb-2 ${settings.isPremium ? `text-${theme.accent}-500` : `text-${theme.gray}-${theme.textMain}`}`}>
                {settings.isPremium ? 'Premium Active' : 'Pause Premium'}
             </h2>
             {!settings.isPremium && (
                 <p className={`text-xs text-${theme.gray}-${theme.textDim} leading-relaxed`}>
                    Unlock the full experience.
                 </p>
             )}
          </div>
          
          {!settings.isPremium && (
            <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar snap-x py-1">
               <div className={`flex-1 min-w-[160px] snap-center rounded-xl p-4 border border-${theme.gray}-${theme.border} bg-${theme.gray}-${theme.surface}/30 flex flex-col items-center`}>
                 <div className={`text-[10px] font-bold tracking-[0.2em] text-${theme.gray}-${theme.textDim} uppercase mb-4`}>Free</div>
                 <div className="text-center text-xs text-${theme.gray}-${theme.textDim}">1 Theme • 1 Sound</div>
               </div>
               <div className={`flex-1 min-w-[160px] snap-center rounded-xl p-4 border border-${theme.accent}-500/30 bg-${theme.accent}-500/10 flex flex-col items-center`}>
                 <div className={`text-[10px] font-bold tracking-[0.2em] text-${theme.accent}-500 uppercase mb-4`}>Premium</div>
                 <div className="text-center text-xs text-${theme.gray}-${theme.textMain}">Mix Sounds • Custom Breath • Analytics</div>
               </div>
            </div>
          )}

          <button 
            onClick={() => triggerPurchase('LIFETIME')}
            disabled={settings.isPremium}
            className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              settings.isPremium 
              ? `bg-transparent border border-${theme.accent}-500/50 text-${theme.accent}-500 cursor-default`
              : `bg-${theme.gray}-${theme.textMain} text-${theme.gray}-${theme.bg} hover:opacity-90 shadow-xl`
            }`}
          >
            {settings.isPremium ? 'Plan Active' : 'Unlock Forever • ₹999'}
          </button>
          {!settings.isPremium && (
             <div className="flex flex-col gap-2 mt-4">
                 <div className="flex justify-center gap-4 px-1">
                    <button onClick={() => triggerPurchase('MONTHLY')} className={`text-[10px] text-${theme.gray}-${theme.textDim} uppercase tracking-widest hover:text-${theme.gray}-${theme.textMain} transition-colors`}>₹49 / Month</button>
                    <div className={`w-px h-3 bg-${theme.gray}-${theme.border} self-center`}></div>
                    <button onClick={() => triggerPurchase('YEARLY')} className={`text-[10px] text-${theme.gray}-${theme.textDim} uppercase tracking-widest hover:text-${theme.gray}-${theme.textMain} transition-colors`}>₹399 / Year</button>
                 </div>
                 <button onClick={triggerRestore} className={`text-[10px] text-${theme.gray}-${theme.textDim} underline text-center mt-2 hover:text-${theme.gray}-${theme.textMain} transition-colors`}>
                    Restore Purchases
                 </button>
             </div>
          )}
        </div>
      </div>

      {/* Feature 5: Notifications (Improved) */}
      <div className="mb-8 shrink-0">
        <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest mb-4`}>Daily Reminder</h3>
        
        <div className={`flex flex-col bg-${theme.gray}-${theme.surface} rounded-xl overflow-hidden`}>
            {/* Toggle Row */}
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${theme.gray}-${theme.bg}`}>
                        <i className={`fa-solid fa-bell text-${theme.accent}-500 text-xs`}></i>
                     </div>
                     <span className={`text-${theme.gray}-${theme.textMain} text-sm`}>Notifications</span>
                </div>
                
                <button 
                    onClick={toggleNotification}
                    className={`w-10 h-6 rounded-full relative transition-colors ${settings.dailyReminderTime ? `bg-${theme.accent}-500` : `bg-${theme.gray}-700`}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${settings.dailyReminderTime ? 'left-5' : 'left-1'}`}></div>
                </button>
            </div>

            {/* Time Picker Row (Conditional) */}
            {settings.dailyReminderTime && (
                <div className={`border-t border-${theme.gray}-${theme.border} p-4 flex items-center justify-between animate-fade-in`}>
                    <span className={`text-${theme.gray}-${theme.textDim} text-xs`}>Schedule</span>
                    <div className={`relative bg-${theme.gray}-${theme.bg} px-4 py-2 rounded-lg border border-${theme.gray}-${theme.border} flex items-center gap-2 hover:border-${theme.accent}-500 transition-colors group`}>
                        <span className={`text-${theme.gray}-${theme.textMain} text-sm font-medium tracking-widest group-hover:text-${theme.accent}-500 transition-colors`}>
                            {formatTimeDisplay(settings.dailyReminderTime)}
                        </span>
                        <input 
                            type="time" 
                            value={settings.dailyReminderTime}
                            onChange={handleTimeChange}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                         <i className={`fa-solid fa-chevron-down text-[10px] text-${theme.gray}-${theme.textDim} ml-1`}></i>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Breathing Patterns & Custom Config */}
      <div className="mb-8 shrink-0">
        <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest mb-4`}>Breathing Pattern</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
            {(['COHERENCE', 'BOX', 'RELAX_478'] as BreathPatternType[]).map(p => (
                <button
                    key={p}
                    onClick={() => onUpdateSettings({ breathPattern: p })}
                    className={`py-3 px-2 rounded-xl text-xs font-medium border ${
                        settings.breathPattern === p
                        ? `bg-${theme.gray}-${theme.surfaceHighlight} border-${theme.accent}-500 text-${theme.accent}-500`
                        : `bg-${theme.gray}-${theme.surface} border-transparent text-${theme.gray}-${theme.textDim}`
                    }`}
                >
                    {p === 'COHERENCE' ? 'Balance (5-5)' : p === 'BOX' ? 'Box (4-4-4-4)' : 'Relax (4-7-8)'}
                </button>
            ))}
            {/* Custom Pattern Button */}
             <button
                onClick={() => settings.isPremium ? onUpdateSettings({ breathPattern: 'CUSTOM' }) : triggerPurchase('LIFETIME')}
                className={`py-3 px-2 rounded-xl text-xs font-medium border relative overflow-hidden ${
                    settings.breathPattern === 'CUSTOM'
                    ? `bg-${theme.gray}-${theme.surfaceHighlight} border-${theme.accent}-500 text-${theme.accent}-500`
                    : `bg-${theme.gray}-${theme.surface} border-transparent text-${theme.gray}-${theme.textDim}`
                }`}
            >
                {!settings.isPremium && <i className="fa-solid fa-lock absolute top-1 right-2 text-[8px]"></i>}
                Custom
            </button>
        </div>

        {/* Custom Pattern Sliders */}
        {settings.breathPattern === 'CUSTOM' && (
            <div className={`p-4 bg-${theme.gray}-${theme.surfaceHighlight} rounded-xl border border-${theme.accent}-500/20 animate-fade-in`}>
                <div className="space-y-4">
                    {['inhale', 'holdIn', 'exhale', 'holdOut'].map((phase) => (
                        <div key={phase} className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase text-${theme.gray}-${theme.textDim} w-12`}>{phase}</span>
                            <input 
                                type="range" 
                                min="0" 
                                max="10" 
                                step="1"
                                value={(settings.customBreathConfig as any)[phase]}
                                onChange={(e) => updateCustomBreath(phase as any, parseInt(e.target.value))}
                                className={`flex-1 mx-3 h-1 bg-${theme.gray}-${theme.bg} rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-${theme.accent}-500`}
                            />
                            <span className={`text-xs text-${theme.gray}-${theme.textMain} w-6 text-right`}>{(settings.customBreathConfig as any)[phase]}s</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Feature 4: Audio Mixer */}
      <div className="mb-8 shrink-0">
        <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest mb-4`}>Soundscape Mixer</h3>
        
        <button 
          onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
          className={`flex items-center justify-between p-4 bg-${theme.gray}-${theme.surface} rounded-xl w-full mb-3 active:scale-[0.98] transition-transform`}
        >
           <span className={`text-${theme.gray}-${theme.textMain} text-sm`}>Ambient Sound</span>
           <div className={`w-10 h-6 rounded-full relative transition-colors ${settings.soundEnabled ? `bg-${theme.accent}-500` : `bg-${theme.gray}-700`}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${settings.soundEnabled ? 'left-5' : 'left-1'}`}></div>
           </div>
        </button>

        {settings.soundEnabled && (
          <div className="flex gap-3 mb-3 animate-fade-in overflow-x-auto no-scrollbar snap-x py-1">
             <SoundOption 
               label="Soft Air" 
               type="AIR" 
               selected={settings.soundMix.includes('AIR')} 
               locked={false}
               onSelect={() => toggleSound('AIR')}
               theme={theme}
               isMulti={settings.isPremium}
             />
             <SoundOption 
               label="Rain" 
               type="RAIN" 
               selected={settings.soundMix.includes('RAIN')} 
               locked={!settings.isPremium}
               onSelect={() => toggleSound('RAIN')}
               theme={theme}
               isMulti={settings.isPremium}
             />
             <SoundOption 
               label="Stream" 
               type="STREAM" 
               selected={settings.soundMix.includes('STREAM')} 
               locked={!settings.isPremium}
               onSelect={() => toggleSound('STREAM')}
               theme={theme}
               isMulti={settings.isPremium}
             />
             <SoundOption 
               label="Ocean" 
               type="WAVES" 
               selected={settings.soundMix.includes('WAVES')} 
               locked={!settings.isPremium}
               onSelect={() => toggleSound('WAVES')}
               theme={theme}
               isMulti={settings.isPremium}
             />
             <SoundOption 
               label="Forest" 
               type="FOREST" 
               selected={settings.soundMix.includes('FOREST')} 
               locked={!settings.isPremium}
               onSelect={() => toggleSound('FOREST')}
               theme={theme}
               isMulti={settings.isPremium}
             />
          </div>
        )}
        
        {settings.isPremium && settings.soundEnabled && settings.soundMix.length > 1 && (
            <p className={`text-[10px] text-${theme.accent}-500 text-center mt-2`}>
                Playing {settings.soundMix.length} sounds simultaneously
            </p>
        )}

        <div className={`mt-3 flex items-center justify-between p-4 bg-${theme.gray}-${theme.surface} rounded-xl`}>
           <span className={`text-${theme.gray}-${theme.textMain} text-sm`}>Vibration Haptics</span>
           <button 
             onClick={() => onUpdateSettings({ hapticSyncEnabled: !settings.hapticSyncEnabled })}
             className={`w-10 h-6 rounded-full relative transition-colors ${settings.hapticSyncEnabled ? `bg-${theme.accent}-500` : `bg-${theme.gray}-700`}`}
           >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${settings.hapticSyncEnabled ? 'left-5' : 'left-1'}`}></div>
           </button>
        </div>
      </div>
      
       {/* Preferences */}
       <div className="mb-8 shrink-0">
        <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest mb-4`}>Appearance</h3>
        <button 
          onClick={toggleDarkMode}
          className={`flex items-center justify-between p-4 bg-${theme.gray}-${theme.surface} rounded-xl w-full mb-3 active:scale-[0.98] transition-transform`}
        >
           <div className="flex items-center gap-2">
              <span className={`text-${theme.gray}-${theme.textMain} text-sm`}>Dark Mode</span>
              {!settings.isPremium && <i className={`fa-solid fa-lock text-[10px] text-${theme.gray}-${theme.textDim}`}></i>}
           </div>
           
           <div className={`w-10 h-6 rounded-full relative transition-colors ${settings.isDarkMode ? `bg-${theme.gray}-700` : `bg-${theme.gray}-300`} ${!settings.isPremium ? 'opacity-50' : ''}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${settings.isDarkMode ? 'left-5' : 'left-1'}`}></div>
           </div>
        </button>
        {/* Themes Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
             <ThemeOption label="Midnight" colorClass="bg-zinc-950" accentClass="bg-emerald-500" selected={settings.theme === 'MIDNIGHT'} locked={false} onSelect={() => selectTheme('MIDNIGHT')} theme={theme} />
             <ThemeOption label="Ocean" colorClass="bg-slate-950" accentClass="bg-cyan-500" selected={settings.theme === 'OCEAN'} locked={!settings.isPremium} onSelect={() => selectTheme('OCEAN')} theme={theme} />
             <ThemeOption label="Sunset" colorClass="bg-stone-950" accentClass="bg-orange-500" selected={settings.theme === 'SUNSET'} locked={!settings.isPremium} onSelect={() => selectTheme('SUNSET')} theme={theme} />
             <ThemeOption label="Lavender" colorClass="bg-neutral-950" accentClass="bg-violet-500" selected={settings.theme === 'LAVENDER'} locked={!settings.isPremium} onSelect={() => selectTheme('LAVENDER')} theme={theme} />
        </div>
      </div>
      
       {/* Preferences */}
      <div className="mb-8 shrink-0">
        <h3 className={`text-${theme.gray}-${theme.textDim} text-xs uppercase tracking-widest mb-4`}>Session Duration</h3>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 5, 10].map((min) => {
            const isSelected = settings.preferredDuration === min * 60;
            const isLocked = !settings.isPremium && min > 1;
            return (
              <button key={min} disabled={isLocked} onClick={() => setDuration(min)} className={`py-3 rounded-xl text-sm font-medium transition-all relative overflow-hidden ${isSelected ? `bg-${theme.accent}-600 text-white` : `bg-${theme.gray}-${theme.surface} text-${theme.gray}-${theme.textDim}`} ${isLocked ? 'opacity-50' : ''}`}>
                {min}m
                {isLocked && <i className={`fa-solid fa-lock text-[8px] absolute top-1 right-2 text-${theme.gray}-${theme.textDim}`}></i>}
              </button>
            )
          })}
        </div>
      </div>

      <div className={`mt-auto pt-6 border-t border-${theme.gray}-${theme.border} text-center shrink-0`}>
        <p className={`text-${theme.gray}-${theme.textDim} text-xs`}>Pause v1.1.0 • Made by webexp.in</p>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 animate-fade-in backdrop-blur-sm">
            <div className={`w-full max-w-sm bg-${theme.gray}-${theme.bg} rounded-2xl border border-${theme.gray}-${theme.border} p-6 relative overflow-hidden animate-slide-up shadow-2xl`}>
                 <div className="text-center mb-6">
                     <h3 className={`text-xl font-light text-${theme.gray}-${theme.textMain} mb-2`}>Unlock Premium</h3>
                     <p className={`text-xs text-${theme.gray}-${theme.textDim}`}>Native payments require a real device build.</p>
                 </div>
                 <button onClick={handleMockPayment} disabled={isProcessing} className={`w-full py-4 rounded-xl bg-${theme.accent}-600 text-white font-bold tracking-widest uppercase text-xs mb-3 shadow-lg flex items-center justify-center gap-2`}>
                    {isProcessing ? 'Processing...' : `Mock Payment (Web)`}
                 </button>
                 <button onClick={() => setShowPaymentModal(false)} disabled={isProcessing} className={`w-full py-3 rounded-xl text-${theme.gray}-${theme.textDim} text-xs font-medium`}>Cancel</button>
            </div>
        </div>
      )}
    </div>
  );
};

const SoundOption = ({ label, type, selected, locked, onSelect, theme, isMulti }: any) => (
  <button 
    onClick={onSelect}
    disabled={locked}
    className={`
      flex flex-col items-center justify-center py-4 px-2 rounded-xl border transition-all relative overflow-hidden min-w-[100px] snap-center
      ${selected 
        ? `bg-${theme.gray}-${theme.surfaceHighlight} border-${theme.accent}-500/50 text-${theme.accent}-500` 
        : `bg-${theme.gray}-${theme.surface}/50 border-transparent text-${theme.gray}-${theme.textDim} hover:bg-${theme.gray}-${theme.surface}`
      }
      ${locked ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    {locked && <i className={`fa-solid fa-lock text-[8px] absolute top-2 right-2 text-${theme.gray}-${theme.textDim}`}></i>}
    {isMulti && selected && <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-${theme.accent}-500`}></div>}
    
    <i className={`fa-solid mb-2 text-lg ${
      type === 'AIR' ? 'fa-wind' : 
      type === 'RAIN' ? 'fa-cloud-rain' : 
      type === 'STREAM' ? 'fa-droplet' : 
      type === 'WAVES' ? 'fa-water' : 
      'fa-tree'
    }`}></i>
    <span className="text-[10px] uppercase tracking-wider text-center">{label}</span>
  </button>
);

const ThemeOption = ({ label, colorClass, accentClass, selected, locked, onSelect, theme }: any) => (
  <button onClick={onSelect} disabled={locked} className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all relative overflow-hidden h-full ${selected ? `bg-${theme.gray}-${theme.surfaceHighlight} border-${theme.accent}-500/50` : `bg-${theme.gray}-${theme.surface}/50 border-transparent hover:bg-${theme.gray}-${theme.surface}`} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
    {locked && <i className={`fa-solid fa-lock text-[8px] absolute top-2 right-2 text-${theme.gray}-${theme.textDim}`}></i>}
    <div className="relative mb-2">
        <div className={`w-6 h-6 rounded-full ${colorClass} border border-white/10 shadow-sm`}></div>
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${accentClass} border border-${theme.gray}-${theme.border}`}></div>
    </div>
    <span className={`text-[9px] uppercase tracking-wider ${selected ? `text-${theme.accent}-500` : `text-${theme.gray}-${theme.textDim}`}`}>{label}</span>
  </button>
);
