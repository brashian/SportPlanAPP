import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { RoutineTemplate, TemplateDay } from '../../types/models';
import { FileText, Plus, Trash2, Edit3, X, Dumbbell, AlertTriangle, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import BrandLogo from '../ui/BrandLogo';
import { SkeletonCard } from '../ui/Skeleton'; // <-- Agregado

// ... (Acá va el mismo const tokens y getBlockColor de antes sin cambios)
const tokens = {
  "--ink-950": "#0A0E14", "--ink-900": "#10161F", "--ink-850": "#161D29", "--ink-800": "#1D2530",
  "--line-800": "#232B37", "--mist-500": "#6B7684", "--mist-300": "#9AA4B2", "--mist-100": "#E7EAEE",
  "--signal-500": "#FF5A1F", "--signal-600": "#E64A0F", "--pulse-500": "#34D399",
} as React.CSSProperties;

const getBlockColor = (groupId?: string) => {
  if (!groupId || groupId.trim() === "") return "bg-[var(--ink-850)] border-[var(--line-800)]";
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

export default function RoutineLibrary({ coachId }: { coachId: string }) {
  // Lógica intacta
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<{ id?: string, name: string, days: TemplateDay[] }>({
    name: "", days: [{ dayNumber: 1, sessionType: "", exercises: [], notesHtml: "" }]
  });

  useEffect(() => {
    async function loadLibrary() {
      try {
        const q = query(collection(db, "routineTemplates"), where("coachId", "==", coachId));
        const snap = await getDocs(q);
        const data: RoutineTemplate[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as RoutineTemplate));
        data.sort((a, b) => a.name.localeCompare(b.name));
        setTemplates(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadLibrary();
  }, [coachId]);

  const handleOpenEditor = (template?: RoutineTemplate) => {
    if (template) {
      setFormData({
        id: template.id, name: template.name,
        days: template.days.map(d => ({
          ...d, exercises: d.exercises ? d.exercises.map(ex => ({ ...ex, sets: ex.sets || "", groupId: ex.groupId || "", videoUrl: ex.videoUrl || "" })) : []
        }))
      });
    } else {
      setFormData({ name: "", days: [{ dayNumber: 1, sessionType: "", exercises: [], notesHtml: "" }] });
    }
    setActiveTab(1); setIsModalOpen(true);
  };

  const addDay = () => {
    setFormData(prev => ({ ...prev, days: [...prev.days, { dayNumber: prev.days.length + 1, sessionType: "", exercises: [], notesHtml: "" }] }));
    setActiveTab(formData.days.length + 1);
  };

  const removeDay = (dayNum: number) => {
    setFormData(prev => {
      const filtered = prev.days.filter(d => d.dayNumber !== dayNum);
      const reindexed = filtered.map((d, i) => ({ ...d, dayNumber: i + 1 }));
      return { ...prev, days: reindexed };
    });
    setActiveTab(1); 
  };

  const updateActiveDay = (data: Partial<TemplateDay>) => {
    setFormData(prev => ({ ...prev, days: prev.days.map(d => d.dayNumber === activeTab ? { ...d, ...data } : d) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Ponele un nombre a la plantilla.");
    setIsSubmitting(true);
    try {
      if (formData.id) {
        const docRef = doc(db, "routineTemplates", formData.id);
        await updateDoc(docRef, { name: formData.name, daysCount: formData.days.length, days: formData.days });
        setTemplates(prev => prev.map(t => t.id === formData.id ? { ...t, name: formData.name, daysCount: formData.days.length, days: formData.days } : t));
      } else {
        const newRef = doc(collection(db, "routineTemplates"));
        const newTemplate: RoutineTemplate = { id: newRef.id, coachId, name: formData.name, daysCount: formData.days.length, days: formData.days, createdAt: new Date().toISOString() };
        await setDoc(newRef, newTemplate);
        setTemplates(prev => [...prev, newTemplate].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setIsModalOpen(false);
    } catch (error) { alert("Error al guardar la plantilla."); } 
    finally { setIsSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "routineTemplates", templateToDelete));
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete));
    } catch (error) { alert("Error al eliminar la plantilla."); } 
    finally { setIsSubmitting(false); setTemplateToDelete(null); }
  };

  const activeDay = formData.days.find(d => d.dayNumber === activeTab);

  return (
    <div style={tokens} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in pb-24 bg-[var(--ink-950)] min-h-screen font-sans text-[var(--mist-100)] selection:bg-[var(--signal-500)]/30">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--signal-500)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--signal-500)]/20 shrink-0 overflow-hidden">
            <BrandLogo className="w-8 h-8 text-[var(--ink-950)]" /> 
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--mist-100)] tracking-tight">Biblioteca Maestra</h1>
            <p className="text-sm sm:text-base text-[var(--mist-500)] font-medium mt-1">Creá rutinas globales para inyectarlas en cualquier atleta.</p>
          </div>
        </div>
        <button onClick={() => handleOpenEditor()} className="w-full sm:w-auto bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
          <Plus size={20} /> Nueva Plantilla
        </button>
      </div>
      
      {/* IMPLEMENTACIÓN DEL SKELETON EN LUGAR DE TEXTO */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : templates.length === 0 ? (
        <div className="p-16 text-center border border-[var(--line-800)] rounded-3xl bg-[var(--ink-900)]/50 flex flex-col items-center">
          <FileText size={48} className="text-[var(--mist-500)] mb-4" />
          <p className="font-display text-2xl font-bold text-[var(--mist-100)]">Biblioteca vacía</p>
          <p className="text-[var(--mist-500)] mt-2 font-medium max-w-sm">Aún no creaste plantillas. Armá tu primera rutina para reutilizarla con tus atletas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {templates.map((t, idx) => (
            <div key={t.id} className="bg-[var(--ink-900)] border border-[var(--line-800)] rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:bg-[var(--ink-850)] transition-all duration-300 flex flex-col motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in" style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}>
              {/* Contenido de la tarjeta igual que antes */}
              <div className="flex-1 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-[var(--ink-800)] text-[var(--signal-500)] rounded-xl border border-[var(--line-800)]"><FileText size={20} /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-[var(--signal-500)]/10 text-[var(--signal-500)] px-3 py-1.5 rounded-lg border border-[var(--signal-500)]/20">{t.daysCount} {t.daysCount === 1 ? 'Día' : 'Días'}</span>
                </div>
                <h3 className="font-display font-bold text-2xl text-[var(--mist-100)] leading-tight">{t.name}</h3>
              </div>
              <div className="flex gap-2 pt-4 border-t border-[var(--line-800)]">
                <button onClick={() => handleOpenEditor(t)} className="flex-1 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"><Edit3 size={16} /> Editar</button>
                <button onClick={() => setTemplateToDelete(t.id)} className="p-2.5 bg-[var(--ink-800)] hover:bg-red-500/20 text-[var(--mist-500)] hover:text-red-400 rounded-xl transition-colors active:scale-95"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALES IGUALES */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[var(--ink-950)]/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[var(--ink-900)] rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden border border-[var(--line-800)] animate-in zoom-in-95 duration-300">
            <div className="p-5 sm:p-6 bg-[var(--ink-900)] text-[var(--mist-100)] flex justify-between items-center shrink-0 border-b border-[var(--line-800)]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[var(--ink-800)] rounded-2xl hidden sm:block"><FileText size={24} className="text-[var(--signal-500)]" /></div>
                <div>
                  <h2 className="font-display font-bold text-2xl tracking-tight">{formData.id ? 'Editar Plantilla' : 'Nueva Plantilla Maestra'}</h2>
                  <p className="text-xs text-[var(--mist-500)] font-medium">Configurá los días y ejercicios de esta rutina base.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--ink-800)] rounded-full transition-colors active:scale-95"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[var(--ink-950)] p-4 sm:p-6 custom-scrollbar">
              <form id="libraryForm" onSubmit={handleSave} className="space-y-6">
                <div className="bg-[var(--ink-900)] p-5 rounded-2xl border border-[var(--line-800)] shadow-sm">
                  <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Nombre de la Plantilla</label>
                  <input type="text" required placeholder="Ej: Fuerza Maxima - 3 Días" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--ink-950)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold text-lg rounded-xl p-3.5 focus:ring-1 focus:ring-[var(--signal-500)] focus:border-[var(--signal-500)] outline-none transition-all placeholder-[var(--mist-500)]" />
                </div>

                <div className="bg-[var(--ink-900)] rounded-2xl border border-[var(--line-800)] shadow-sm overflow-hidden">
                  <div className="flex overflow-x-auto bg-[var(--ink-850)] p-2 gap-2 border-b border-[var(--line-800)] custom-scrollbar">
                    {formData.days.map(d => (
                      <button key={d.dayNumber} type="button" onClick={() => setActiveTab(d.dayNumber)} className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === d.dayNumber ? 'bg-[var(--signal-500)] text-[var(--ink-950)] shadow-sm' : 'text-[var(--mist-300)] hover:bg-[var(--ink-800)]'}`}>Día {d.dayNumber}</button>
                    ))}
                    <button type="button" onClick={addDay} className="px-4 py-2.5 bg-[var(--ink-800)] text-[var(--mist-100)] hover:bg-[var(--line-800)] rounded-xl font-bold text-sm flex items-center gap-1 transition-colors"><Plus size={16}/> Día</button>
                  </div>

                  {activeDay && (
                    <div className="p-5 sm:p-6 space-y-6 animate-in fade-in">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Enfoque de este día</label>
                          <input type="text" required placeholder="Ej: Tren Superior" value={activeDay.sessionType} onChange={e => updateActiveDay({ sessionType: e.target.value })} className="w-full bg-[var(--ink-950)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3 focus:ring-1 focus:ring-[var(--signal-500)] focus:border-[var(--signal-500)] outline-none placeholder-[var(--mist-500)]" />
                        </div>
                        {formData.days.length > 1 && <button type="button" onClick={() => removeDay(activeDay.dayNumber)} className="mt-6 p-3 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors active:scale-95"><Trash2 size={18}/></button>}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-display font-bold text-xl text-[var(--mist-100)] flex items-center gap-2"><Dumbbell size={18} className="text-[var(--signal-500)]" /> Ejercicios</h3>
                          <button type="button" onClick={() => updateActiveDay({ exercises: [...activeDay.exercises, { id: Date.now().toString(), name: "", sets: "", reps: "", weight: "", groupId: "", videoUrl: "" }] })} className="bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors active:scale-95"><Plus size={14} /> Añadir Ejercicio</button>
                        </div>
                        {activeDay.exercises.length === 0 ? (
                          <div className="p-6 border border-dashed border-[var(--line-800)] rounded-2xl text-center text-[var(--mist-500)] text-sm font-medium bg-[var(--ink-950)]">Agregá los ejercicios para este día.</div>
                        ) : (
                          <div className="overflow-x-auto pb-2">
                            <div className="min-w-[800px] space-y-2">
                              <div className="flex gap-2 px-2 text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-widest"><div className="w-[30%]">Ejercicio</div><div className="w-[10%] text-center">Series</div><div className="w-[10%] text-center">Reps</div><div className="w-[15%]">Carga / Int.</div><div className="w-[20%]">Video URL</div><div className="w-[8%] text-center">Blq</div><div className="w-[7%] text-center">Acción</div></div>
                              {activeDay.exercises.map(ex => (
                                <div key={ex.id} className={`flex gap-2 p-2 rounded-xl border items-center focus-within:border-[var(--signal-500)] transition-all ${getBlockColor(ex.groupId)}`}>
                                  <input type="text" placeholder="Sentadilla" value={ex.name} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, name: e.target.value} : x) })} className="w-[30%] bg-[var(--ink-950)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)] shadow-sm placeholder-[var(--mist-500)]" />
                                  <input type="text" placeholder="4" value={ex.sets || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, sets: e.target.value} : x) })} className="w-[10%] text-center bg-[var(--ink-950)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)] shadow-sm placeholder-[var(--mist-500)]" />
                                  <input type="text" placeholder="10-12" value={ex.reps} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, reps: e.target.value} : x) })} className="w-[10%] text-center bg-[var(--ink-950)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] outline-none focus:border-[var(--signal-500)] shadow-sm placeholder-[var(--mist-500)]" />
                                  <input type="text" placeholder="RIR 2" value={ex.weight} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, weight: e.target.value} : x) })} className="w-[15%] bg-[var(--ink-950)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--pulse-500)] outline-none focus:border-[var(--signal-500)] shadow-sm placeholder-[var(--mist-500)]" />
                                  <input type="url" placeholder="https://youtu..." value={ex.videoUrl || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, videoUrl: e.target.value} : x) })} className="w-[20%] bg-[var(--ink-950)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm text-[var(--mist-300)] outline-none focus:border-[var(--signal-500)] shadow-sm placeholder-[var(--mist-500)]" />
                                  <input type="text" maxLength={2} placeholder="-" value={ex.groupId || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, groupId: e.target.value.toUpperCase()} : x) })} className="w-[8%] bg-[var(--ink-950)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-black text-[var(--mist-100)] text-center uppercase outline-none focus:border-[var(--signal-500)] shadow-sm placeholder-[var(--mist-500)]" />
                                  <div className="w-[7%] flex justify-center"><button type="button" onClick={() => updateActiveDay({ exercises: activeDay.exercises.filter(x => x.id !== ex.id) })} className="text-[var(--mist-500)] hover:text-red-400 p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-lg active:scale-95 transition-colors"><X size={16}/></button></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Notas opcionales</label>
                         <textarea rows={2} value={activeDay.notesHtml} onChange={e => updateActiveDay({ notesHtml: e.target.value })} placeholder="Descansos, ritmos, indicaciones extra..." className="w-full bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl p-3 text-sm font-medium text-[var(--mist-100)] outline-none focus:ring-1 focus:ring-[var(--signal-500)] focus:border-[var(--signal-500)] placeholder-[var(--mist-500)]" />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-4 sm:p-5 border-t border-[var(--line-800)] bg-[var(--ink-900)] flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-xl font-bold text-sm text-[var(--mist-100)] transition-all active:scale-95">Cancelar</button>
              <button type="submit" form="libraryForm" disabled={isSubmitting} className="px-8 py-3 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2">
                <Save size={16} /> {formData.id ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {templateToDelete && (
        <div className="fixed inset-0 bg-[var(--ink-950)]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-[var(--ink-900)] border border-[var(--line-800)] rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner"><AlertTriangle size={36} /></div>
            <h3 className="font-display font-bold text-2xl text-[var(--mist-100)] mb-2">¿Borrar Plantilla?</h3>
            <p className="text-sm font-medium text-[var(--mist-500)] mb-8">Esta acción es irreversible y desaparecerá de tu biblioteca.</p>
            <div className="flex gap-3">
              <button onClick={() => setTemplateToDelete(null)} className="flex-1 py-3.5 rounded-xl font-bold text-[var(--mist-100)] bg-[var(--ink-800)] hover:bg-[var(--line-800)] transition-all active:scale-95">Cancelar</button>
              <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg active:scale-95">Sí, borrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}