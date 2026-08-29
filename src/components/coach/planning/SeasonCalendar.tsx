import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Dumbbell, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { usePlanningStore } from '../../../store/usePlanningStore';

export default function SeasonCalendar() {
  const { activeCategoryId, setSelectedSession, selectedSession } = usePlanningStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [trainings, setTrainings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchTrainings() {
      if (!activeCategoryId) return;
      setIsLoading(true);
      try {
        // CORREGIDO: clubTrainings con minúscula
        const q = query(
          collection(db, "clubTrainings"),
          where("teamId", "==", activeCategoryId)
        );
        const snap = await getDocs(q);
        const loaded: any[] = [];
        snap.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        setTrainings(loaded);
      } catch (error) {
        console.error("Error al traer entrenamientos del club:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrainings();
  }, [activeCategoryId, selectedSession]); 

  if (!activeCategoryId) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-6 bg-slate-50/50">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
          <CalendarIcon size={48} className="text-blue-500 opacity-80" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Calendario de Temporada</h2>
        <p className="font-medium mt-2 text-center max-w-md text-slate-500">
          Seleccioná un Club y una Categoría en el menú izquierdo para empezar a programar entrenamientos.
        </p>
      </div>
    );
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="h-full flex flex-col bg-slate-50/50 animate-in fade-in duration-300">
      <div className="p-5 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-3xl font-black text-slate-800 capitalize tracking-tight">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          {isLoading && <Loader2 size={20} className="text-blue-500 animate-spin" />}
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200">
            <ChevronLeft size={24}/>
          </button>
          <button onClick={nextMonth} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200">
            <ChevronRight size={24}/>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-black text-slate-400 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 sm:p-4 rounded-2xl bg-transparent" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
            const existingTraining = trainings.find(t => t.date === dateStr);
            
            return (
              <div 
                key={day} 
                className={`
                  min-h-[90px] sm:min-h-[120px] p-2 sm:p-3 border rounded-3xl transition-all group relative flex flex-col
                  ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg'}
                `}
              >
                <span className={`text-sm font-black ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day}</span>
                {existingTraining ? (
                  <button 
                    onClick={() => setSelectedSession({ 
                      id: existingTraining.id, 
                      date: dateStr + "T12:00:00", 
                      title: existingTraining.sessionType 
                    })}
                    className="mt-auto mb-1 w-full bg-blue-100 hover:bg-blue-200 border border-blue-200 text-blue-700 p-2 rounded-xl text-left transition-colors flex items-center gap-1.5"
                  >
                    <Dumbbell size={14} className="shrink-0" />
                    <span className="text-[10px] sm:text-xs font-bold truncate">
                      {existingTraining.sessionType || 'Sesión'}
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedSession({ 
                      id: Date.now().toString(), 
                      date: dateStr + "T12:00:00", 
                      title: 'Nuevo Entrenamiento' 
                    })}
                    className="absolute inset-0 m-auto w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl scale-75 group-hover:scale-100 hover:bg-blue-500"
                    title="Planificar Sesión"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}