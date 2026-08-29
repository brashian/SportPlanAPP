import React, { useState } from 'react';
import type { MonthlyRoutine, RoutineTemplate, TemplateDay } from '../../types/models';
import { FileText, Import, Plus, X, Dumbbell, Trash2, CheckCircle2, History, Edit3, Save, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import ModalShell from '../shared/ModalShell';

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
  const [formError, setFormError] = useState<string | null>(null);

  const [successRoutine, setSuccessRoutine] = useState<MonthlyRoutine | null>(null);

  // Nuevo estado para saber si estamos EDITANDO o CREANDO
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);

  // Reemplaza el window.confirm() original: confirmación de borrado con el
  // mismo ModalShell que usa el resto de la app (AthleteDetailView).
  const [routineToDelete, setRoutineToDelete] = useState<MonthlyRoutine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newTemplate, setNewTemplate] = useState<{name: string, days: TemplateDay[]}>({
    name: "",
    days: [{ dayNumber: 1, sessionType: "Día 1", exercises: [], notesHtml: "" }]
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
      ...prev, days: [...prev.days, { dayNumber: prev.days.length + 1, sessionType: `Día ${prev.days.length + 1}`, exercises: [], notesHtml: "" }]
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
    setFormError(null);
    if (!newTemplate.name.trim()) {
      setFormError("Ponele un nombre a la rutina antes de guardar.");
      return;
    }

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
      setFormError("No se pudo guardar la rutina. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditor = (routine?: MonthlyRoutine) => {
    setFormError(null);
    if (routine) {
      setEditingRoutineId(routine.id);
      setNewTemplate({ name: routine.monthName, days: routine.days });
    } else {
      setEditingRoutineId(null);
      setNewTemplate({ name: "", days: [{ dayNumber: 1, sessionType: "Día 1", exercises: [], notesHtml: "" }] });
    }
    setActiveTab(1);
    setIsCreating(true);
  };

  const resetCreator = () => {
    setIsCreating(false);
    setSuccessRoutine(null);
    setEditingRoutineId(null);
    setFormError(null);
    setNewTemplate({ name: "", days: [{ dayNumber: 1, sessionType: "Día 1", exercises: [], notesHtml: "" }] });
    setActiveTab(1);
  };

  const confirmDeleteRoutine = async () => {
    if (!routineToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteAthleteRoutine?.(routineToDelete.id);
    } finally {
      setIsDeleting(false);
      setRoutineToDelete(null);
    }
  };

  const updateActiveDay = (data: Partial<TemplateDay>) => {
    setNewTemplate(prev => ({ ...prev, days: prev.days.map(d => d.dayNumber === activeTab ? { ...d, ...data } : d) }));
  };

  const activeDay = newTemplate.days.find(d => d.dayNumber === activeTab);

  const getBlockColor = (groupId?: string) => {
    if (!groupId || groupId.trim() === "") return "bg-[var(--ink-800)] border-[var(--line-800)]";
    const colors = [
      "bg-blue-500/10 border-blue-500/30 border-l-4 border-l-blue-500",
      "bg-emerald-500/10 border-emerald-500/30 border-l-4 border-l-emerald-500",
      "bg-purple-500/10 border-purple-500/30 border-l-4 border-l-purple-500",
      "bg-amber-500/10 border-amber-500/30 border-l-4 border-l-amber-500",
      "bg-rose-500/10 border-rose-500/30 border-l-4 border-l-rose-500",
      "bg-cyan-500/10 border-cyan-500/30 border-l-4 border-l-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < groupId.length; i++) hash += groupId.toUpperCase().charCodeAt(i);
    return colors[hash % colors.length];
  };

  return (
    <div className="bg-[var(--ink-900)] p-6 sm:p-8 rounded-3xl border border-[var(--line-800)] mt-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-[var(--signal-500)]" size={22} />
            <h2 className="text-xl font-display font-bold text-[var(--mist-100)] uppercase tracking-wide">Plantillas y Rutinas</h2>
          </div>
          <p className="text-sm text-[var(--mist-500)] font-medium">Gestioná el historial de este atleta o inyectale una plantilla maestra.</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="w-full sm:w-auto bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] px-5 py-3.5 rounded-xl text-sm font-display font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
        >
          <Plus size={18} /> Crear Rutina Nueva
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-[var(--ink-850)] p-4 rounded-2xl border border-[var(--line-800)] mb-8">
        <label htmlFor="mrm-select-inject" className="sr-only">Seleccionar rutina para inyectar</label>
        <select
          id="mrm-select-inject"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="flex-1 bg-[var(--ink-800)] border border-[var(--line-800)] rounded-xl p-3.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:ring-2 focus:ring-[var(--signal-500)] cursor-pointer"
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
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-[var(--ink-800)] disabled:text-[var(--mist-500)] text-[var(--ink-950)] font-black px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Import size={18} /> Inyectar
        </button>
      </div>

      <div>
        <h3 className="text-xs font-black text-[var(--mist-500)] uppercase tracking-widest mb-4 flex items-center gap-2">
          <History size={15} /> Historial de este Atleta
        </h3>

        {monthlyRoutines.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[var(--line-800)] rounded-2xl text-center bg-[var(--ink-950)]/50">
            <p className="text-sm font-bold text-[var(--mist-500)]">Este atleta aún no tiene rutinas guardadas en su historial.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyRoutines.map(r => (
              <div key={r.id} className="bg-[var(--ink-850)] border border-[var(--line-800)] rounded-2xl p-5 hover:border-[var(--signal-500)]/40 transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-display font-bold text-[var(--mist-100)] text-lg leading-tight group-hover:text-[var(--signal-500)] transition-colors pr-2">{r.monthName}</h4>
                  <span className="shrink-0 text-[10px] font-black uppercase bg-[var(--signal-500)]/10 text-[var(--signal-500)] px-2 py-1 rounded-md">
                    {r.days.length} Días
                  </span>
                </div>

                <div className="mt-auto pt-4 border-t border-[var(--line-800)] flex gap-2">
                  <button
                    onClick={() => openEditor(r)}
                    className="flex-1 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => onInjectRequest(r)}
                    className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <Import size={14} /> Inyectar
                  </button>
                  <button
                    onClick={() => setRoutineToDelete(r)}
                    aria-label={`Eliminar rutina ${r.monthName}`}
                    className="p-2.5 bg-[var(--ink-800)] hover:bg-red-500/10 text-[var(--mist-500)] hover:text-red-400 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmación de borrado — reemplaza el window.confirm() original */}
      {routineToDelete && (
        <ModalShell
          onClose={() => setRoutineToDelete(null)}
          labelledBy="delete-routine-title"
          panelClassName="max-w-sm p-8 text-center"
          zIndexClassName="z-[90]"
        >
          {(close) => (
            <>
              <div className="w-20 h-20 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={36} />
              </div>
              <h3 id="delete-routine-title" className="text-2xl font-display font-bold text-[var(--mist-100)] mb-2 uppercase tracking-wide">
                ¿Eliminar Rutina?
              </h3>
              <p className="text-sm font-medium text-[var(--mist-500)] mb-8">
                "{routineToDelete.monthName}" se va a borrar del historial de este atleta de forma definitiva.
              </p>
              <div className="flex gap-3">
                <button onClick={close} className="flex-1 py-3.5 rounded-xl font-bold text-[var(--mist-100)] bg-[var(--ink-800)] hover:bg-[var(--line-800)] transition-all active:scale-95">
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteRoutine}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 size={16} className="animate-spin" />} Sí, borrar
                </button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {isCreating && (
        <ModalShell
          onClose={resetCreator}
          labelledBy="routine-editor-title"
          overlayClassName="bg-[var(--ink-950)]/90 backdrop-blur-sm motion-reduce:backdrop-blur-none"
          panelClassName="max-w-5xl flex flex-col max-h-[95vh] overflow-hidden p-0"
          zIndexClassName="z-[80]"
        >
          {(close) => (
            <>
              <div className="p-5 sm:p-6 bg-[var(--ink-950)] text-[var(--mist-100)] flex justify-between items-center shrink-0 border-b border-[var(--line-800)]">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-[var(--signal-500)]" />
                  <div>
                    <h2 id="routine-editor-title" className="font-display font-bold text-xl uppercase tracking-wide">
                      {editingRoutineId ? 'Editar Rutina' : 'Nueva Rutina'}
                    </h2>
                    <p className="text-xs text-[var(--mist-500)] font-medium">Historial personal del atleta.</p>
                  </div>
                </div>
                <button onClick={close} aria-label="Cerrar editor de rutina" className="p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-full transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
                  <X size={20} />
                </button>
              </div>

              {successRoutine ? (
                <div className="flex-1 bg-[var(--ink-950)] flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-[var(--pulse-500)]/10 text-[var(--pulse-500)] rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-[var(--mist-100)] uppercase tracking-wide mb-2">¡Rutina Guardada!</h2>
                  <p className="text-[var(--mist-500)] font-medium mb-10 max-w-md">Ya forma parte del historial. Podés inyectarla ahora mismo.</p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <button onClick={resetCreator} className="flex-1 py-4 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl transition-all active:scale-95">
                      Cerrar
                    </button>
                    <button
                      onClick={() => { onInjectRequest(successRoutine); resetCreator(); }}
                      className="flex-1 py-4 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-display font-bold uppercase tracking-wide rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Import size={20} /> Inyectar Ahora
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto bg-[var(--ink-950)] p-4 sm:p-6 custom-scrollbar">
                    <form id="templateForm" onSubmit={handleSaveTemplate} className="space-y-6">
                      {formError && (
                        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl px-4 py-3">
                          <AlertCircle size={16} className="shrink-0" /> {formError}
                        </div>
                      )}

                      <div className="bg-[var(--ink-900)] p-5 rounded-2xl border border-[var(--line-800)]">
                        <label htmlFor="mrm-routine-name" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Nombre de la Rutina</label>
                        <input
                          id="mrm-routine-name"
                          type="text" required placeholder="Ej: Fuerza Hipertrofia - Mes 1"
                          value={newTemplate.name}
                          onChange={e => { setNewTemplate({ ...newTemplate, name: e.target.value }); setFormError(null); }}
                          className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-display font-bold text-lg rounded-xl p-3.5 focus:ring-2 focus:ring-[var(--signal-500)] outline-none transition-all"
                        />
                      </div>

                      <div className="bg-[var(--ink-900)] rounded-2xl border border-[var(--line-800)] overflow-hidden">
                        <div className="flex overflow-x-auto bg-[var(--ink-850)] p-2 gap-2 border-b border-[var(--line-800)] custom-scrollbar">
                          {newTemplate.days.map(d => (
                            <button
                              key={d.dayNumber} type="button" onClick={() => setActiveTab(d.dayNumber)}
                              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] ${
                                activeTab === d.dayNumber ? 'bg-[var(--ink-950)] text-[var(--signal-500)]' : 'text-[var(--mist-500)] hover:bg-[var(--ink-800)]'
                              }`}
                            >
                              Día {d.dayNumber}
                            </button>
                          ))}
                          <button type="button" onClick={addDay} className="px-4 py-2.5 bg-[var(--signal-500)]/10 text-[var(--signal-500)] hover:bg-[var(--signal-500)]/20 rounded-xl font-bold text-sm flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
                            <Plus size={16} /> Día
                          </button>
                        </div>

                        {activeDay && (
                          <div className="p-5 sm:p-6 space-y-6 animate-in fade-in">
                            {newTemplate.days.length > 1 && (
                              <div className="flex justify-end -mb-2">
                                <button
                                  type="button" onClick={() => removeDay(activeDay.dayNumber)}
                                  aria-label={`Eliminar día ${activeDay.dayNumber}`}
                                  className="p-3 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="font-display font-bold text-[var(--mist-100)] uppercase tracking-wide text-sm flex items-center gap-2">
                                  <Dumbbell size={18} className="text-[var(--signal-500)]" /> Ejercicios
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => updateActiveDay({ exercises: [...activeDay.exercises, { id: Date.now().toString(), name: "", sets: "", reps: "", weight: "", groupId: "", videoUrl: "" }] })}
                                  className="bg-[var(--signal-500)]/10 hover:bg-[var(--signal-500)]/20 text-[var(--signal-500)] font-black py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
                                >
                                  <Plus size={14} /> Añadir Ejercicio
                                </button>
                              </div>

                              {activeDay.exercises.length === 0 ? (
                                <div className="p-6 border-2 border-dashed border-[var(--line-800)] rounded-2xl text-center text-[var(--mist-500)] text-sm font-medium">
                                  Agregá los ejercicios para este día.
                                </div>
                              ) : (
                                <div className="overflow-x-auto pb-2">
                                  <div className="min-w-[800px] space-y-2">
                                    <div className="flex gap-2 px-2 text-[10px] font-black text-[var(--mist-500)] uppercase tracking-widest">
                                      <div className="w-[30%]">Ejercicio</div><div className="w-[10%] text-center">Series</div><div className="w-[10%] text-center">Reps</div><div className="w-[15%]">Carga</div><div className="w-[20%]">Link Video</div><div className="w-[8%] text-center">Blq</div><div className="w-[7%]"></div>
                                    </div>
                                    {activeDay.exercises.map(ex => (
                                      <div key={ex.id} className={`flex gap-2 p-2 rounded-xl border items-center transition-all ${getBlockColor(ex.groupId)}`}>
                                        <input type="text" aria-label="Nombre del ejercicio" placeholder="Press Banco" value={ex.name} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? { ...x, name: e.target.value } : x) })} className="w-[30%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)]" />
                                        <input type="text" aria-label="Series" placeholder="4" value={ex.sets || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? { ...x, sets: e.target.value } : x) })} className="w-[10%] text-center bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)]" />
                                        <input type="text" aria-label="Repeticiones" placeholder="10" value={ex.reps} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? { ...x, reps: e.target.value } : x) })} className="w-[10%] text-center bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)]" />
                                        <input type="text" aria-label="Carga" placeholder="RIR 2" value={ex.weight} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? { ...x, weight: e.target.value } : x) })} className="w-[15%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--signal-500)] outline-none focus:border-[var(--signal-500)]" />
                                        <input type="url" aria-label="Link del video" placeholder="https://youtu..." value={ex.videoUrl || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? { ...x, videoUrl: e.target.value } : x) })} className="w-[20%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm text-[var(--mist-300)] outline-none focus:border-[var(--signal-500)]" />
                                        <input type="text" aria-label="Identificador de bloque" maxLength={2} placeholder="-" value={ex.groupId || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? { ...x, groupId: e.target.value.toUpperCase() } : x) })} className="w-[8%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-black text-[var(--mist-100)] text-center outline-none focus:border-[var(--signal-500)]" />
                                        <div className="w-[7%] flex justify-center">
                                          <button type="button" onClick={() => updateActiveDay({ exercises: activeDay.exercises.filter(x => x.id !== ex.id) })} aria-label={`Eliminar ejercicio ${ex.name || 'sin nombre'}`} className="text-[var(--mist-500)] hover:text-red-400 p-2 bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                                            <X size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div>
                              <label htmlFor="mrm-day-notes" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Notas opcionales</label>
                              <textarea
                                id="mrm-day-notes"
                                rows={2} value={activeDay.notesHtml}
                                onChange={e => updateActiveDay({ notesHtml: e.target.value })}
                                placeholder="Descansos, ritmos, indicaciones extra..."
                                className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] rounded-xl p-3 text-sm font-medium text-[var(--mist-100)] outline-none focus:ring-2 focus:ring-[var(--signal-500)]/20 focus:border-[var(--signal-500)]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                  <div className="p-4 sm:p-5 border-t border-[var(--line-800)] bg-[var(--ink-900)] flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={resetCreator} className="px-6 py-3 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-xl font-bold text-sm text-[var(--mist-100)] transition-all active:scale-95">
                      Cancelar
                    </button>
                    <button
                      type="submit" form="templateForm" disabled={isSubmitting}
                      className="px-8 py-3 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] rounded-xl font-display font-bold uppercase tracking-wide text-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {editingRoutineId ? 'Actualizar Rutina' : 'Guardar Rutina'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </ModalShell>
      )}
    </div>
  );
}