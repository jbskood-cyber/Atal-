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
import '@/src/styles/atal-ai-command-center.css';
import '@/src/styles/surgical-corrections.css';
import '@/src/styles/atal-ai-minimal-polish.css';
import '@/src/styles/visual-closeout-selectors.css';
import '@/src/styles/visual-closeout-plan-form.css';
import '@/src/styles/visual-closeout-plan-detail.css';
import '@/src/styles/visual-closeout-exercises.css';
import '@/src/styles/commercial-closeout.css';
import '@/src/styles/ai-navigation-polish.css';
import '@/src/styles/atal-unified-visual-system.css';
import '@/src/styles/atal-surgical-qa.css';
import '@/src/styles/atal-residual-polish.css';
import '@/src/styles/atal-residual-compat.css';
import '@/src/styles/atal-final-closeout.css';
import '@/src/styles/atal-context-menu-fix.css';
import '@/src/styles/atal-ai-surgical-polish.css';
import { App } from './App';
import { bootstrapRealWorkspace } from './data/workspaceBootstrap';

bootstrapRealWorkspace();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}