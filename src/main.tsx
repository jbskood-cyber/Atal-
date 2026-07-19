import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@/app/globals.css';
import '@/src/styles/closeout.css';
import '@/src/styles/atal-ai.css';
import '@/src/styles/functional.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
