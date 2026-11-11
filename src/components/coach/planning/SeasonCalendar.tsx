import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Dumbbell, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { usePlanningStore } from '../../../store/usePlanningStore';
import { waitForClubTrainingsMigration } from './clubTrainingsMigration';

export default function SeasonCalendar() {
  const { activeCategoryId, setSelectedSession } = usePlanningStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [trainings, setTrainings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Se recarga al cambiar de categoría y cada vez que el calendario se vuelve a
  // montar (al volver del editor), así aparece lo recién guardado.
  useEffect(() => {
    // Descarta la respuesta de una categoría anterior si el coach cambia rápido
    let cancelled = false;
    async function fetchTrainings() {
      if (!activeCategoryId) return;
      setIsLoading(true);
      try {
        await waitForClubTrainingsMigration();
        const coachId = auth.currentUser?.uid;
        if (!coachId) return;
        // El filtro por coachId lo exigen las reglas de Firestore para poder listar
        const q = query(collection(db, "clubTrainings"), where("teamId", "==", activeCategoryId), where("coachId", "==", coachId));
        const snap = await getDocs(q);
        const loaded: any[] = [];
        snap.forEach(doc => { loaded.push({ id: doc.id, ...doc.data() }); });
        if (!cancelled) setTrainings(loaded);
      } catch (error) {
        if (!cancelled) console.error("Error al traer entrenamientos:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchTrainings();
    return () => { cancelled = true; };
  }, [activeCategoryId]);

  if (!activeCategoryId) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-[var(--mist-500)] p-6 bg-transparent">
        <div className="w-24 h-24 bg-[var(--ink-900)]/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-[var(--line-800)] mb-6 motion-safe:animate-in motion-safe:zoom-in-95">
          <CalendarIcon size={48} className="text-[var(--mist-300)] opacity-80" />
        </div>
        <h2 className="font-display text-3xl font-bold text-[var(--mist-100)] tracking-tight">Calendario de Temporada</h2>
        <p className="font-medium mt-2 text-center max-w-md text-[var(--mist-500)]">
          Seleccioná un Club y una Categoría en el menú izquierdo para empezar a programar.
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
    <div className="h-full flex flex-col bg-transparent animate-in fade-in duration-300">
      
      {/* CABECERA */}
      <div className="p-5 sm:p-6 border-b border-[var(--line-800)] flex justify-between items-center bg-[var(--ink-900)]/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--mist-100)] capitalize tracking-tight">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          {isLoading && <Loader2 size={20} className="text-[var(--signal-500)] animate-spin" />}
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2.5 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] rounded-xl transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
            <ChevronLeft size={24}/>
          </button>
          <button onClick={nextMonth} className="p-2.5 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] rounded-xl transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
            <ChevronRight size={24}/>
          </button>
        </div>
      </div>

      {/* GRILLA DEL MES */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold text-[var(--mist-500)] uppercase tracking-widest py-2">
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
                  min-h-[90px] sm:min-h-[120px] p-2 sm:p-3 border rounded-2xl transition-all group relative flex flex-col
                  ${isToday ? 'bg-[var(--signal-500)]/10 border-[var(--signal-500)]/50 shadow-[0_0_15px_rgba(255,90,31,0.1)]' : 'bg-[var(--ink-900)]/40 border-[var(--line-800)] hover:border-[var(--signal-500)]/30 hover:bg-[var(--ink-850)]'}
                `}
              >
                <span className={`text-sm font-black ${isToday ? 'text-[var(--signal-500)]' : 'text-[var(--mist-500)] group-hover:text-[var(--mist-300)]'}`}>{day}</span>
                
                {existingTraining ? (
                  <button 
                    onClick={() => setSelectedSession({ id: existingTraining.id, date: dateStr + "T12:00:00", title: existingTraining.sessionType })}
                    className="mt-auto mb-1 w-full bg-[var(--ink-800)] hover:bg-[var(--line-800)] border border-[var(--line-800)] text-[var(--mist-100)] p-2 rounded-xl text-left transition-all flex items-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
                  >
                    <Dumbbell size={14} className="shrink-0 text-[var(--signal-500)]" />
                    <span className="text-[10px] sm:text-xs font-bold truncate">
                      {existingTraining.sessionType || 'Sesión'}
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedSession({ id: Date.now().toString(), date: dateStr + "T12:00:00", title: 'Nuevo Entrenamiento' })}
                    className="absolute inset-0 m-auto w-10 h-10 bg-[var(--signal-500)] text-[var(--ink-950)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl shadow-[var(--signal-500)]/20 scale-75 group-hover:scale-100 hover:bg-[var(--signal-600)] focus-visible:opacity-100 focus-visible:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mist-100)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
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