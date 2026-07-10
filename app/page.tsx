'use client';

import React from 'react';
import { Folder, CheckCircle, Github } from 'lucide-react';
import { Badge } from '../src/components/ui/Badge';
import { Card } from '../src/components/ui/Card';
import { Header } from '../src/components/layout/Header';
import { Footer } from '../src/components/layout/Footer';

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Container simulating a polished browser/utility terminal frame */}
      <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.05)] overflow-hidden">
        
        {/* Top bar (Header Layout Component) */}
        <Header label="atal-v1 — scaffold" />

        {/* Main Content */}
        <div className="p-8 md:p-12 flex flex-col items-center text-center">
          
          {/* Badge (UI Component) */}
          <Badge icon={<span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />}>
            System Active
          </Badge>

          {/* Titles */}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F172A] mb-2">
            Atal v1
          </h1>
          <p className="text-lg md:text-xl text-[#64748B] mb-10 font-light">
            Repositorio inicial listo
          </p>

          {/* Grid Information Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
            
            {/* Card 1: Estructura del Proyecto (UI Component) */}
            <Card title="Estructura del Proyecto" icon={<Folder className="w-4 h-4 text-[#94A3B8]" />}>
              <div className="font-mono text-xs text-[#334155] space-y-1.5">
                <div className="text-emerald-600 font-semibold">src/</div>
                <div className="pl-4 border-l border-slate-200 ml-1.5 py-0.5 space-y-1">
                  <div>app/</div>
                  <div>routes/</div>
                  <div>components/</div>
                  <div className="pl-4 text-[#64748B] text-[11px] space-y-0.5">
                    <div>ui/</div>
                    <div>layout/</div>
                  </div>
                  <div>styles/</div>
                  <div>assets/</div>
                  <div>main.tsx</div>
                  <div>App.tsx</div>
                </div>
              </div>
            </Card>

            {/* Card 2: Verificación Técnica (UI Component) */}
            <Card title="Verificación Técnica" icon={<CheckCircle className="w-4 h-4 text-[#10B981]" />}>
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
            </Card>

          </div>

          {/* GitHub Ready Link Banner */}
          <div className="w-full mt-6 bg-[#FAFBFC] border border-[#F1F5F9] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475569]">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-[#64748B]" />
              <span className="font-mono font-medium text-[#334155]">github.com/atal-v1</span>
            </div>
            <span className="text-[#94A3B8] bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px]">RECIPIENTE LIMPIO</span>
          </div>

          {/* Footer content inside the container (Layout Component) */}
          <Footer 
            note="Scaffold temporal generado para ChatGPT Work & Codex" 
            technologies={['React', 'TypeScript', 'Vite', 'Tailwind']} 
          />

        </div>
      </div>
    </main>
  );
}

