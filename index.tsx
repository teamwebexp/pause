
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Initial Native Setup
const setupNative = async () => {
  try {
    // Lock to Portrait
    await ScreenOrientation.lock({ orientation: 'portrait' });
    
    // Set Status Bar to Dark to match the app theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#09090b' }); // zinc-950
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) {
    console.log("Web environment - skipping native setup");
  }
};

setupNative();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
