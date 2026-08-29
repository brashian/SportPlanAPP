import React from 'react';
import { X } from 'lucide-react';
import type { MonthlyRoutine } from '../../types/models';

interface Props {
  routine: MonthlyRoutine;
  onClose: () => void;
}

// NOTA: este componente no está importado desde ningún otro archivo del
// proyecto (verificado por búsqueda global). Puede ser intencional si lo vas
// a cablear más adelante (ej. como preview antes de exportar una rutina
// mensual a PDF) — lo dejamos migrado al mismo sistema de tokens por las
// dudas, para que no quede visualmente desactualizado el día que se use.
export default function RoutinePDFViewer({ routine, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-[var(--ink-950)]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-[var(--ink-950)] border border-[var(--line-800)] w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300">

        <div className="bg-gradient-to-r from-[var(--ink-900)] to-[var(--ink-850)] border-b border-[var(--line-800)] p-5 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-tight text-[var(--mist-100)]">{routine.monthName}</h2>
            <p className="text-[var(--mist-500)] text-sm font-medium">Rutina Mensual Asignada</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar vista de rutina"
            className="p-2 hover:bg-white/10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
          >
            <X size={24}/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[var(--ink-950)] custom-scrollbar">
          {routine.days.map((day, i) => (
            <div key={i} className="bg-[var(--ink-900)] border border-[var(--line-800)] p-5 sm:p-6 rounded-2xl shadow-sm">
              <h3 className="font-display font-bold text-xl text-[var(--signal-500)] mb-4 border-b border-[var(--line-800)] pb-3">
                Día {day.dayNumber}: {day.sessionType}
              </h3>
              <div
                className="prose prose-sm prose-invert max-w-none text-[var(--mist-100)] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: day.notesHtml }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}