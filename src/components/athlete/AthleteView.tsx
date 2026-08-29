import React, { useState, useMemo } from "react";
import type { Athlete, DailyBlock } from "../../types/models";
import { Flame, Dumbbell, ChevronDown, Calendar as CalendarIcon, Activity, Trophy, ChevronRight, CheckCircle2 } from "lucide-react";
import DailyRoutineModal from "./DailyRoutineModal";

interface Props {
  athlete: Athlete;
  blocksByMesocycle: Record<string, DailyBlock[]>;
}

// PERFORMANCE: Helper puro afuera del componente
const getWeeksInRange = (start: string, end: string) => {
  const weeks = [];
  let current = new Date(start + "T12:00:00");
  const day = current.getDay();
  current.setDate(current.getDate() - day + (day === 0 ? -6 : 1));
  const endDate = new Date(end + "T12:00:00");
  let weekNum = 1;

  while (current <= endDate || current.getDay() !== 1) { 
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    weeks.push({ label: `Semana ${weekNum}`, days });
    weekNum++;
    if (current > endDate) break;
  }
  return weeks;
};

const dayNamesShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const getGroupColorClass = (groupId?: string) => {
  if (!groupId || groupId.trim() === "") return "bg-blue-500";
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) hash += groupId.charCodeAt(i);
  return colors[hash % colors.length];
};

export default function AthleteView({ athlete, blocksByMesocycle }: Props) {
  const [selectedDailyBlock, setSelectedDailyBlock] = useState<DailyBlock | null>(null);

  // PERFORMANCE: Pre-calculamos fechas y semanas una sola vez
  const { todayStr, currentWeekDays } = useMemo(() => {
    const now = new Date();
    const tStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const weekDays = [];
    let tempDate = new Date();
    const currentDayOfWeek = tempDate.getDay();
    const diffToMonday = tempDate.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
    tempDate.setDate(diffToMonday);
    
    for(let i=0; i<7; i++) {
      weekDays.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return { todayStr: tStr, currentWeekDays: weekDays };
  }, []);

  // UX & PERFORMANCE: Lazy Initializer para que nazca expandido (sin salto visual ni useEffect)
  const [expandedMesos, setExpandedMesos] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    athlete.macrocycles?.forEach(macro => {
      macro.mesocycles?.forEach(meso => {
        if (todayStr >= meso.startDate && todayStr <= meso.endDate) {
          initial[meso.id] = true;
        }
      });
    });
    return initial;
  });

  // PERFORMANCE: Único Map O(1) para buscar entrenamientos
  const blocksByDate = useMemo(() => {
    const map = new Map<string, DailyBlock>();
    Object.values(blocksByMesocycle).forEach(blocks => {
      blocks.forEach(b => map.set(b.date, b));
    });
    return map;
  }, [blocksByMesocycle]);

  const todayBlock = blocksByDate.get(todayStr) || null;
  const nameDisplay = athlete.firstName ? athlete.firstName : (athlete.name?.split(' ')[0] || "Atleta");

  const toggleMeso = (id: string) => setExpandedMesos(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* PERFORMANCE: blur bajado a 80px + will-change para no asfixiar GPUs mobile */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none z-0 will-change-transform"></div>

      <div className="relative z-10 max-w-3xl mx-auto p-4 sm:p-6 space-y-8 pb-24">
        
        {/* ACCESIBILIDAD: motion-safe agregado */}
        <header className="flex items-center justify-between pt-4 motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:fade-in motion-safe:duration-500">
          <div>
            <p className="text-blue-400 font-bold tracking-widest uppercase text-xs sm:text-sm">Hola de nuevo,</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{nameDisplay}.</h1>
          </div>
          <div className="w-14 h-14 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-full flex items-center justify-center border border-slate-600/50 shadow-xl">
             <Trophy className="text-amber-400" size={24} />
          </div>
        </header>

        {/* HERO CARD (Hoy) - A11Y + Focus Visible */}
        <div 
          className="relative overflow-hidden rounded-[2rem] shadow-2xl transition-all duration-500 cursor-pointer group motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-500 delay-100 fill-mode-both hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0B0F19]" 
          onClick={() => todayBlock && setSelectedDailyBlock(todayBlock)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && todayBlock) {
              e.preventDefault();
              setSelectedDailyBlock(todayBlock);
            }
          }}
          role={todayBlock ? "button" : "region"}
          tabIndex={todayBlock ? 0 : -1}
          aria-label={todayBlock ? `Entrenamiento de hoy: ${todayBlock.sessionType}` : "Hoy es día de descanso"}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${todayBlock ? 'from-blue-600 via-indigo-700 to-purple-900' : 'from-slate-800 to-slate-900'}`}></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
          
          <div className="relative p-8 sm:p-10 flex flex-col items-start h-full text-white">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/10">
              {todayBlock ? <><Flame size={14} className="text-orange-400" /> Entrenamiento Activo</> : <><Activity size={14} className="text-emerald-400"/> Día de Recuperación</>}
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 leading-tight text-white drop-shadow-sm">
              {todayBlock ? todayBlock.sessionType : "Descanso Activo"}
            </h2>
            
            <p className="text-white/70 mb-8 text-sm sm:text-base font-medium max-w-sm">
              {todayBlock ? "Tus ejercicios, videos y parámetros están listos. A romperla." : "Aprovechá para hidratarte bien, estirar y prepararte mentalmente para la próxima sesión."}
            </p>

            {todayBlock && (
              <button tabIndex={-1} className="bg-white text-indigo-900 font-black py-4 px-8 rounded-2xl shadow-xl hover:bg-slate-50 flex items-center justify-center gap-3 transition-all group-hover:px-10 active:scale-95">
                <Dumbbell size={20} /> Iniciar Sesión <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* STRIP SEMANAL - A11Y + Focus Visible */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-500 delay-200 fill-mode-both">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Tu Semana</h3>
          </div>
          <div className="flex justify-between items-center gap-2">
            {currentWeekDays.map((d, i) => {
              const dateS = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const isToday = dateS === todayStr;
              const blockForThisDay = blocksByDate.get(dateS);
              // TODO futuro: conectar con campo real "isCompleted"
              const isCompleted = false; 

              return (
                <button 
                  key={i} 
                  onClick={() => blockForThisDay && setSelectedDailyBlock(blockForThisDay)}
                  disabled={!blockForThisDay}
                  aria-label={`${dayNamesShort[d.getDay()]} ${d.getDate()}${blockForThisDay ? `, Entrenamiento: ${blockForThisDay.sessionType}` : ', Sin entrenamiento'}`}
                  className={`flex flex-col items-center p-3 rounded-2xl flex-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                    ${blockForThisDay ? 'cursor-pointer hover:bg-slate-700/50 active:scale-90 hover:-translate-y-1' : 'cursor-default opacity-50'} 
                    ${isToday ? 'bg-blue-600 shadow-lg shadow-blue-600/30 scale-105 ring-1 ring-blue-400 opacity-100' : 'bg-transparent'}
                  `}
                >
                  <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isToday ? 'text-blue-100' : 'text-slate-400'}`}>{dayNamesShort[d.getDay()]}</span>
                  <span className={`text-lg sm:text-xl font-black mt-1 ${isToday ? 'text-white' : 'text-slate-200'}`}>{d.getDate()}</span>
                  
                  <div className="mt-2 h-4 flex items-center justify-center">
                    {blockForThisDay && (
                      isCompleted ? (
                        <CheckCircle2 size={14} className={isToday ? "text-white" : "text-emerald-400"} />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${isToday ? 'bg-white shadow-[0_0_8px_white]' : 'bg-blue-400'}`}></div>
                      )
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* CALENDARIO PREMIUM */}
        <div className="pt-4 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-500 delay-300 fill-mode-both">
          <div className="flex items-center gap-3 mb-6 px-2">
            <CalendarIcon className="text-blue-400" size={24}/>
            <h2 className="text-2xl font-black text-white tracking-tight">Próximos Bloques</h2>
          </div>
          
          {!athlete.macrocycles || athlete.macrocycles.length === 0 ? (
            <div className="p-8 text-center border border-slate-700/50 rounded-[2rem] text-slate-400 bg-slate-800/20 backdrop-blur-sm text-sm font-medium">
              Tu entrenador aún no ha programado bloques a futuro.
            </div>
          ) : (
            <div className="space-y-6">
              {athlete.macrocycles.map((macro) => (
                <div key={macro.id} className="space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-4">{macro.name}</h3>

                  {macro.mesocycles?.map((meso) => {
                    const isOpen = expandedMesos[meso.id] || false;
                    const mesoWeeks = getWeeksInRange(meso.startDate, meso.endDate);

                    return (
                      <div key={meso.id} className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] overflow-hidden shadow-lg transition-all duration-500">
                        
                        <button 
                          onClick={() => toggleMeso(meso.id)}
                          aria-expanded={isOpen}
                          className="w-full p-6 flex justify-between items-center hover:bg-slate-700/30 transition-colors text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset rounded-[2rem]"
                        >
                          <div>
                            <h4 className="font-black text-white text-xl leading-tight drop-shadow-sm">{meso.name}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mt-1.5 inline-block">{meso.phase}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="hidden sm:inline-block text-xs font-bold text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700">
                              {meso.startDate.slice(5).replace('-','/')} - {meso.endDate.slice(5).replace('-','/')}
                            </span>
                            <div className={`p-2.5 rounded-full bg-slate-700/50 border border-slate-600/50 text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180 bg-slate-600 text-white' : ''}`}>
                              <ChevronDown size={18} />
                            </div>
                          </div>
                        </button>
                        
                        {isOpen && (
                          <div className="p-4 sm:p-6 bg-slate-900/50 space-y-4 border-t border-slate-700/50 motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:duration-300">
                            {mesoWeeks.map((week, idx) => (
                              <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sm:p-5">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 pl-1">{week.label}</h5>
                                
                                <div className="grid grid-cols-7 gap-2 sm:gap-3">
                                  {week.days.map((dateStr) => {
                                    const d = new Date(dateStr + "T12:00:00");
                                    const isOutside = dateStr < meso.startDate || dateStr > meso.endDate;
                                    const block = blocksByDate.get(dateStr);
                                    const isToday = dateStr === todayStr;
                                    const isCompleted = false; // TODO
                                    
                                    // Colores de grupo para renderizar en la barrita inferior
                                    const groupIds = Array.from(new Set(block?.exercises?.map(e => e.groupId).filter(Boolean)));

                                    return (
                                      <button 
                                        key={dateStr} 
                                        onClick={() => block && setSelectedDailyBlock(block)}
                                        disabled={!block}
                                        aria-label={`${d.getDate()} de ${d.toLocaleString('es', { month: 'long' })}${block ? `, Sesión: ${block.sessionType}` : ''}`}
                                        className={`flex flex-col items-center py-3 rounded-xl transition-all relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                                          ${isOutside ? 'opacity-20' : ''} 
                                          ${block ? 'cursor-pointer hover:bg-slate-700 active:scale-90' : 'cursor-default bg-transparent opacity-50'}
                                          ${isToday && block ? 'bg-blue-600 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400 opacity-100' : block ? 'bg-slate-700/50 border border-slate-600/50 opacity-100' : ''}
                                        `}
                                      >
                                        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider z-10 ${isToday && block ? 'text-blue-100' : 'text-slate-400'}`}>{dayNamesShort[d.getDay()]}</span>
                                        <span className={`text-base sm:text-lg font-black z-10 mt-0.5 ${isToday && block ? 'text-white' : block ? 'text-blue-300' : 'text-slate-600'}`}>{d.getDate()}</span>
                                        
                                        <div className="mt-1.5 h-3 flex items-center justify-center z-10 transition-all group-hover:scale-125">
                                          {block && (
                                            isCompleted ? (
                                              <CheckCircle2 size={12} className={isToday ? "text-white" : "text-emerald-400"} />
                                            ) : (
                                              <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white shadow-[0_0_5px_white]' : 'bg-blue-400'}`}></div>
                                            )
                                          )}
                                        </div>

                                        {/* FRanja de colores por Grupo (Detalle Visual) */}
                                        {block && groupIds.length > 0 && !isToday && (
                                          <div className="absolute bottom-0 left-0 right-0 h-1 flex opacity-80">
                                            {groupIds.map((g, i) => (
                                              <div key={i} className={`flex-1 ${getGroupColorClass(g)}`}></div>
                                            ))}
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDailyBlock && (
        <DailyRoutineModal block={selectedDailyBlock} onClose={() => setSelectedDailyBlock(null)} />
      )}
    </div>
  );
}