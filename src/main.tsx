import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/src/styles/fonts.css';
import '@/app/globals.css';
import '@/src/styles/closeout.css';
import '@/src/styles/atal-ai.css';
import '@/src/styles/functional.css';
import '@/src/styles/atal-ai-command-center.css';
import '@/src/styles/native-clinical.css';
import '@/src/styles/atal-rescue.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
