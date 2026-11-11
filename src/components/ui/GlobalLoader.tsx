import React from 'react';
import BrandLogo from './BrandLogo';

export default function GlobalLoader({ message = "Sincronizando" }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--ink-950)]/90 backdrop-blur-md overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--signal-500)]/10 blur-[100px] rounded-full animate-pulse pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-500">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mb-8 relative">
          <div className="absolute inset-0 bg-[var(--signal-500)]/20 blur-xl rounded-full animate-pulse" />
          <BrandLogo className="w-full h-full relative z-10 drop-shadow-2xl" />
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 rounded-full bg-[var(--signal-500)] animate-bounce shadow-[0_0_8px_var(--signal-500)]" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--signal-500)] animate-bounce shadow-[0_0_8px_var(--signal-500)]" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--signal-500)] animate-bounce shadow-[0_0_8px_var(--signal-500)]" style={{ animationDelay: '300ms' }} />
        </div>
        
        <p className="mt-6 text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-[0.3em] animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}