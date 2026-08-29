import React, { useState } from 'react';
import type { MonthlyRoutine, RoutineTemplate, TemplateDay } from '../../types/models';
import { FileText, Import, Plus, X, Dumbbell, Trash2, CheckCircle2, History, Edit3, Save } from 'lucide-react';

interface Props {
  athleteId: string;
  coachId: string;
  templates: RoutineTemplate[];
  monthlyRoutines: MonthlyRoutine[]; 
  onInjectRequest: (routine: MonthlyRoutine) => void;
  onSaveAthleteRoutine: (routine: Omit<MonthlyRoutine, 'id' | 'createdAt'>) => Promise<MonthlyRoutine>;
  onUpdateAthleteRoutine?: (routineId: string, data: Partial<MonthlyRoutine>) => Promise<void>;
  onDeleteAthleteRoutine?: (routineId: string) => Promise<void>;
}

export default function MonthlyRoutineManager({ 
  athleteId, coachId, templates, monthlyRoutines, onInjectRequest, onSaveAthleteRoutine, onUpdateAthleteRoutine, onDeleteAthleteRoutine 
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [successRoutine, setSuccessRoutine] = useState<MonthlyRoutine | null>(null);
  
  // Nuevo estado para saber si estamos EDITANDO o CREANDO
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  
  const [newTemplate, setNewTemplate] = useState<{name: string, days: TemplateDay[]}>({
    name: "",
    days: [{ dayNumber: 1, sessionType: "", exercises: [], notesHtml: "" }]
  });
  const [activeTab, setActiveTab] = useState(1);

  const handleInject = () => {
    if (!selectedTemplate) return;
    let template = monthlyRoutines.find(r => r.id === selectedTemplate) as MonthlyRoutine;
    if (!template) template = templates.find(t => t.id === selectedTemplate) as unknown as MonthlyRoutine;
    if (!template) return;
    onInjectRequest(template);
    setSelectedTemplate("");
  };

  const addDay = () => {
    setNewTemplate(prev => ({
      ...prev, days: [...prev.days, { dayNumber: prev.days.length + 1, sessionType: "", exercises: [], notesHtml: "" }]
    }));
    setActiveTab(newTemplate.days.length + 1);
  };

  const removeDay = (dayNum: number) => {
    setNewTemplate(prev => {
      const filtered = prev.days.filter(d => d.dayNumber !== dayNum);
      const reindexed = filtered.map((d, i) => ({ ...d, dayNumber: i + 1 }));
      return { ...prev, days: reindexed };
    });
    setActiveTab(1);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) return alert("Ponele un nombre a la rutina.");
    
    setIsSubmitting(true);
    try {
      if (editingRoutineId && onUpdateAthleteRoutine) {
        // ACTUALIZAR EXISTENTE
        await onUpdateAthleteRoutine(editingRoutineId, {
          monthName: newTemplate.name,
          days: newTemplate.days
        });
        setIsCreating(false);
        setEditingRoutineId(null);
      } else {
        // CREAR NUEVA
        const saved = await onSaveAthleteRoutine({
          athleteId, coachId, monthName: newTemplate.name, days: newTemplate.days
        });
        setSuccessRoutine(saved);
        setSelectedTemplate(saved.id);
      }
    } catch (error) {
      alert("Error al guardar la rutina.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditor = (routine?: MonthlyRoutine) => {
    if (routine) {
      setEditingRoutineId(routine.id);
      setNewTemplate({ name: routine.monthName, days: routine.days });
    } else {
      setEditingRoutineId(null);
      setNewTemplate({ name: "", days: [{ dayNumber: 1, sessionType: "", exercises: [], notesHtml: "" }] });
    }
    setActiveTab(1);
    setIsCreating(true);
  };

  const resetCreator = () => {
    setIsCreating(false);
    setSuccessRoutine(null);
    setEditingRoutineId(null);
    setNewTemplate({ name: "", days: [{ dayNumber: 1, sessionType: "", exercises: [], notesHtml: "" }] });
    setActiveTab(1);
  };

  const updateActiveDay = (data: Partial<TemplateDay>) => {
    setNewTemplate(prev => ({ ...prev, days: prev.days.map(d => d.dayNumber === activeTab ? { ...d, ...data } : d) }));
  };

  const activeDay = newTemplate.days.find(d => d.dayNumber === activeTab);

  const getBlockColor = (groupId?: string) => {
    if (!groupId || groupId.trim() === "") return "bg-slate-50 border-slate-100";
    const colors = [
      "bg-blue-50 border-blue-200 border-l-4 border-l-blue-500", "bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500",
      "bg-purple-50 border-purple-200 border-l-4 border-l-purple-500", "bg-amber-50 border-amber-200 border-l-4 border-l-amber-500",
      "bg-rose-50 border-rose-200 border-l-4 border-l-rose-500", "bg-cyan-50 border-cyan-200 border-l-4 border-l-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < groupId.length; i++) hash += groupId.toUpperCase().charCodeAt(i);
    return colors[hash % colors.length];
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm mt-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-blue-600" size={24} />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Plantillas y Rutinas</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">Gestioná el historial de este atleta o inyectale una plantilla maestra.</p>
        </div>
        <button 
          onClick={() => openEditor()}
          className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white px-5 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
        >
          <Plus size={18} /> Crear Rutina Nueva
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
        <select 
          value={selectedTemplate} 
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
        >
          <option value="">Seleccionar rutina para inyectar...</option>
          <optgroup label="Plantillas Maestra (Global)">
            {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.daysCount} días)</option>)}
          </optgroup>
          <optgroup label="Historial del Atleta">
            {monthlyRoutines.map(r => <option key={r.id} value={r.id}>{r.monthName} ({r.days.length} días)</option>)}
          </optgroup>
        </select>
        <button 
          onClick={handleInject}
          disabled={!selectedTemplate}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-black px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
        >
          <Import size={18} /> Inyectar
        </button>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <History size={16} /> Historial de este Atleta
        </h3>
        
        {monthlyRoutines.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
            <p className="text-sm font-bold text-slate-500">Este atleta aún no tiene rutinas guardadas en su historial.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyRoutines.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors pr-2">{r.monthName}</h4>
                  <span className="shrink-0 text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                    {r.days.length} Días
                  </span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={() => openEditor(r)} 
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button 
                    onClick={() => onInjectRequest(r)} 
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                  >
                    <Import size={14} /> Inyectar
                  </button>
                  <button 
                    onClick={() => { if (window.confirm("¿Eliminar esta rutina del historial?")) onDeleteAthleteRoutine?.(r.id); }} 
                    className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[80] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-blue-400" />
                <div>
                  <h2 className="font-black text-xl tracking-tight">{editingRoutineId ? 'Editar Rutina' : 'Nueva Rutina'}</h2>
                  <p className="text-xs text-slate-400 font-medium">Historial personal del atleta.</p>
                </div>
              </div>
              <button onClick={resetCreator} className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"><X size={20} /></button>
            </div>

            {successRoutine ? (
              <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-in zoom-in-95">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner"><CheckCircle2 size={48} strokeWidth={3} /></div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">¡Rutina Guardada!</h2>
                <p className="text-slate-500 font-medium mb-10 max-w-md">Ya forma parte del historial. Podés inyectarla ahora mismo.</p>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                  <button onClick={resetCreator} className="flex-1 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm transition-all active:scale-95">Cerrar</button>
                  <button onClick={() => { onInjectRequest(successRoutine); resetCreator(); }} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"><Import size={20} /> Inyectar Ahora</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 custom-scrollbar">
                  <form id="templateForm" onSubmit={handleSaveTemplate} className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de la Rutina</label>
                      <input type="text" required placeholder="Ej: Fuerza Hipertrofia - Mes 1" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl p-3.5 focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex overflow-x-auto bg-slate-100 p-2 gap-2 border-b border-slate-200 custom-scrollbar">
                        {newTemplate.days.map(d => (
                          <button key={d.dayNumber} type="button" onClick={() => setActiveTab(d.dayNumber)} className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === d.dayNumber ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Día {d.dayNumber}</button>
                        ))}
                        <button type="button" onClick={addDay} className="px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-sm flex items-center gap-1 transition-colors"><Plus size={16}/> Día</button>
                      </div>

                      {activeDay && (
                        <div className="p-5 sm:p-6 space-y-6 animate-in fade-in">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enfoque de este día</label>
                              <input type="text" required placeholder="Ej: Pecho y Tríceps" value={activeDay.sessionType} onChange={e => updateActiveDay({ sessionType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none" />
                            </div>
                            {newTemplate.days.length > 1 && <button type="button" onClick={() => removeDay(activeDay.dayNumber)} className="mt-6 p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"><Trash2 size={18}/></button>}
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-black text-slate-800 flex items-center gap-2"><Dumbbell size={18} className="text-blue-500" /> Ejercicios</h3>
                              <button type="button" onClick={() => updateActiveDay({ exercises: [...activeDay.exercises, { id: Date.now().toString(), name: "", sets: "", reps: "", weight: "", groupId: "", videoUrl: "" }] })} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors"><Plus size={14} /> Añadir Ejercicio</button>
                            </div>
                            
                            {activeDay.exercises.length === 0 ? (
                              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm font-medium">Agregá los ejercicios para este día.</div>
                            ) : (
                              <div className="overflow-x-auto pb-2">
                                <div className="min-w-[800px] space-y-2">
                                  <div className="flex gap-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-[30%]">Ejercicio</div><div className="w-[10%] text-center">Series</div><div className="w-[10%] text-center">Reps</div><div className="w-[15%]">Carga</div><div className="w-[20%]">Link Video</div><div className="w-[8%] text-center">Blq</div><div className="w-[7%]"></div></div>
                                  {activeDay.exercises.map(ex => (
                                    <div key={ex.id} className={`flex gap-2 p-2 rounded-xl border items-center transition-all ${getBlockColor(ex.groupId)}`}>
                                      <input type="text" placeholder="Press Banco" value={ex.name} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, name: e.target.value} : x) })} className="w-[30%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm" />
                                      <input type="text" placeholder="4" value={ex.sets || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, sets: e.target.value} : x) })} className="w-[10%] text-center bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm" />
                                      <input type="text" placeholder="10" value={ex.reps} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, reps: e.target.value} : x) })} className="w-[10%] text-center bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm" />
                                      <input type="text" placeholder="RIR 2" value={ex.weight} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, weight: e.target.value} : x) })} className="w-[15%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-blue-600 outline-none focus:border-blue-400 shadow-sm" />
                                      <input type="url" placeholder="https://youtu..." value={ex.videoUrl || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, videoUrl: e.target.value} : x) })} className="w-[20%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-500 outline-none focus:border-blue-400 shadow-sm" />
                                      <input type="text" maxLength={2} placeholder="-" value={ex.groupId || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, groupId: e.target.value.toUpperCase()} : x) })} className="w-[8%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-black text-center outline-none focus:border-blue-400 shadow-sm" />
                                      <div className="w-[7%] flex justify-center"><button type="button" onClick={() => updateActiveDay({ exercises: activeDay.exercises.filter(x => x.id !== ex.id) })} className="text-slate-400 hover:text-red-500 p-2 bg-white shadow-sm border border-slate-200 rounded-lg"><X size={16}/></button></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notas opcionales</label>
                             <textarea rows={2} value={activeDay.notesHtml} onChange={e => updateActiveDay({ notesHtml: e.target.value })} placeholder="Descansos, ritmos, indicaciones extra..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20" />
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                  <button type="button" onClick={resetCreator} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all active:scale-95">Cancelar</button>
                  <button type="submit" form="templateForm" disabled={isSubmitting} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-2">
                    <Save size={16} /> {editingRoutineId ? 'Actualizar Rutina' : 'Guardar Rutina'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}