import React from 'react';
import { X } from 'lucide-react';
import type { MonthlyRoutine } from '../../types/models';

interface Props {
  routine: MonthlyRoutine;
  onClose: () => void;
}

export default function RoutinePDFViewer({ routine, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300">
        
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="font-black text-2xl tracking-tight">{routine.monthName}</h2>
            <p className="text-slate-400 text-sm font-medium">Rutina Mensual Asignada</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24}/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50 custom-scrollbar">
          {routine.days.map((day, i) => (
            <div key={i} className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-sm">
              <h3 className="font-black text-xl text-blue-600 mb-4 border-b border-slate-100 pb-3">
                Día {day.dayNumber}: {day.sessionType}
              </h3>
              <div 
                className="prose prose-sm max-w-none text-slate-700 leading-relaxed" 
                dangerouslySetInnerHTML={{ __html: day.notesHtml }} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}