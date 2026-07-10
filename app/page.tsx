'use client';

import React from 'react';
import { Folder, CheckCircle, Github, Layers } from 'lucide-react';

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Container simulating a polished browser/utility terminal frame */}
      <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.05)] overflow-hidden">
        
        {/* Top bar */}
        <div className="h-10 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center px-4 gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <div className="ml-auto font-mono text-[11px] text-[#94A3B8] font-medium tracking-wide">
            atal-v1 — scaffold
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 md:p-12 flex flex-col items-center text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ECFDF5] text-[#065F46] text-xs font-semibold rounded-full border border-[#D1FAE5] uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            System Active
          </div>

          {/* Titles */}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F172A] mb-2">
            Atal v1
          </h1>
          <p className="text-lg md:text-xl text-[#64748B] mb-10 font-light">
            Repositorio inicial listo
          </p>

          {/* Grid Information Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
            
            {/* Card 1: Estructura del Proyecto */}
            <div className="border border-[#F1F5F9] bg-[#FAFBFC] p-5 rounded-xl">
              <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#94A3B8]" />
                Estructura del Proyecto
              </div>
              <div className="font-mono text-xs text-[#334155] space-y-1.5">
                <div className="text-emerald-600 font-semibold">src/</div>
                <div className="pl-4 border-l border-slate-200 ml-1.5 py-0.5 space-y-1">
                  <div>app/</div>
                  <div>routes/</div>
                  <div>components/</div>
                  <div>styles/</div>
                  <div>assets/</div>
                  <div>main.tsx</div>
                  <div>App.tsx</div>
                </div>
              </div>
            </div>

            {/* Card 2: Verificación Técnica */}
            <div className="border border-[#F1F5F9] bg-[#FAFBFC] p-5 rounded-xl">
              <div className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#10B981]" />
                Verificación Técnica
              </div>
              <div className="space-y-2 text-sm text-[#475569]">
                <div className="flex items-center gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span className="font-mono text-xs text-[#334155]">npm install</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span className="font-mono text-xs text-[#334155]">npm run typecheck</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span className="font-mono text-xs text-[#334155]">npm run lint</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span className="font-mono text-xs text-[#334155]">npm run build</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span className="font-mono text-xs text-[#334155]">route / accessible</span>
                </div>
              </div>
            </div>

          </div>

          {/* GitHub Ready Link Banner */}
          <div className="w-full mt-6 bg-[#FAFBFC] border border-[#F1F5F9] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475569]">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-[#64748B]" />
              <span className="font-mono font-medium text-[#334155]">github.com/atal-v1</span>
            </div>
            <span className="text-[#94A3B8] bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px]">RECIPIENTE LIMPIO</span>
          </div>

          {/* Footer content inside the container */}
          <div className="mt-10 pt-6 border-t border-[#F1F5F9] w-full flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#94A3B8]">
            <div className="text-center sm:text-left">
              Scaffold temporal generado para ChatGPT Work & Codex
            </div>
            <div className="flex gap-2 font-medium">
              <span>React</span>
              <span>•</span>
              <span>TypeScript</span>
              <span>•</span>
              <span>Vite</span>
              <span>•</span>
              <span>Tailwind</span>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

