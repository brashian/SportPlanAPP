import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { RoutineTemplate, TemplateDay } from '../../types/models';
import { BookOpen, FileText, Plus, Trash2, Edit3, X, Dumbbell, AlertTriangle, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function RoutineLibrary({ coachId }: { coachId: string }) {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Editor / Creador
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [formData, setFormData] = useState<{ id?: string, name: string, days: TemplateDay[] }>({
    name: "",
    days: [{ dayNumber: 1, sessionType: "", exercises: [], notesHtml: "" }]
  });

  // Estado para eliminar
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // 1. CARGAR LA BIBLIOTECA
  useEffect(() => {
    async function loadLibrary() {
      try {
        const q = query(collection(db, "routineTemplates"), where("coachId", "==", coachId));
        const snap = await getDocs(q);
        const data: RoutineTemplate[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as RoutineTemplate));
        
        // Ordenar alfabéticamente
        data.sort((a, b) => a.name.localeCompare(b.name));
        setTemplates(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLibrary();
  }, [coachId]);

  // 2. ABRIR EDITOR (Crear o Editar)
  const handleOpenEditor = (template?: RoutineTemplate) => {
    if (template) {
      // Editar
      setFormData({
        id: template.id,
        name: template.name,
        days: template.days.map(d => ({
          ...d,
          exercises: d.exercises ? d.exercises.map(ex => ({ ...ex, sets: ex.sets || "", groupId: ex.groupId || "", videoUrl: ex.videoUrl || "" })) : []
        }))
      });
    } else {
      // Nuevo
      setFormData({
        name: "",
        days: [{ dayNumber: 1, sessionType: "", exercises: [], notesHtml: "" }]
      });
    }
    setActiveTab(1);
    setIsModalOpen(true);
  };

  // 3. LÓGICA DE PESTAÑAS (DÍAS)
  const addDay = () => {
    setFormData(prev => ({
      ...prev,
      days: [...prev.days, { dayNumber: prev.days.length + 1, sessionType: "", exercises: [], notesHtml: "" }]
    }));
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
    setFormData(prev => ({
      ...prev,
      days: prev.days.map(d => d.dayNumber === activeTab ? { ...d, ...data } : d)
    }));
  };

  // 4. GUARDAR EN FIREBASE
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Ponele un nombre a la plantilla.");
    
    setIsSubmitting(true);
    try {
      if (formData.id) {
        // Actualizar existente
        const docRef = doc(db, "routineTemplates", formData.id);
        await updateDoc(docRef, {
          name: formData.name,
          daysCount: formData.days.length,
          days: formData.days
        });
        setTemplates(prev => prev.map(t => t.id === formData.id ? { ...t, name: formData.name, daysCount: formData.days.length, days: formData.days } : t));
      } else {
        // Crear nueva
        const newRef = doc(collection(db, "routineTemplates"));
        const newTemplate: RoutineTemplate = {
          id: newRef.id,
          coachId,
          name: formData.name,
          daysCount: formData.days.length,
          days: formData.days,
          createdAt: new Date().toISOString()
        };
        await setDoc(newRef, newTemplate);
        setTemplates(prev => [...prev, newTemplate].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Error al guardar la plantilla.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. ELIMINAR DE FIREBASE
  const confirmDelete = async () => {
    if (!templateToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "routineTemplates", templateToDelete));
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete));
    } catch (error) {
      alert("Error al eliminar la plantilla.");
    } finally {
      setIsSubmitting(false);
      setTemplateToDelete(null);
    }
  };

  // UI: Colores de los bloques de ejercicios
  const getBlockColor = (groupId?: string) => {
    if (!groupId || groupId.trim() === "") return "bg-slate-50 border-slate-100";
    const colors = [
      "bg-blue-50 border-blue-200 border-l-4 border-l-blue-500",
      "bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500",
      "bg-purple-50 border-purple-200 border-l-4 border-l-purple-500",
      "bg-amber-50 border-amber-200 border-l-4 border-l-amber-500",
      "bg-rose-50 border-rose-200 border-l-4 border-l-rose-500",
      "bg-cyan-50 border-cyan-200 border-l-4 border-l-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < groupId.length; i++) hash += groupId.toUpperCase().charCodeAt(i);
    return colors[hash % colors.length];
  };

  const activeDay = formData.days.find(d => d.dayNumber === activeTab);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in pb-24">
      
      {/* HEADER BIBLIOTECA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <BookOpen className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Biblioteca Maestra</h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Creá rutinas globales para inyectarlas en cualquier atleta.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenEditor()}
          className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Nueva Plantilla
        </button>
      </div>
      
      {/* GRILLA DE PLANTILLAS */}
      {loading ? (
        <div className="p-12 text-center text-blue-600 font-bold animate-pulse">Cargando biblioteca...</div>
      ) : templates.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center">
          <FileText size={48} className="text-slate-300 mb-4" />
          <p className="text-xl font-black text-slate-700">Biblioteca vacía</p>
          <p className="text-slate-500 mt-2 font-medium max-w-sm">Aún no creaste plantillas. Armá tu primera rutina para reutilizarla con tus atletas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
              <div className="flex-1 mb-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">
                    {t.daysCount} {t.daysCount === 1 ? 'Día' : 'Días'}
                  </span>
                </div>
                <h3 className="font-black text-lg text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">{t.name}</h3>
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => handleOpenEditor(t)}
                  className="flex-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit3 size={16} /> Editar
                </button>
                <button 
                  onClick={() => setTemplateToDelete(t.id)}
                  className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                  title="Eliminar plantilla"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EDITOR DE PLANTILLAS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-blue-400" />
                <div>
                  <h2 className="font-black text-xl tracking-tight">{formData.id ? 'Editar Plantilla' : 'Nueva Plantilla Maestra'}</h2>
                  <p className="text-xs text-slate-400 font-medium">Configurá los días y ejercicios de esta rutina base.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 custom-scrollbar">
              <form id="libraryForm" onSubmit={handleSave} className="space-y-6">
                
                {/* Nombre */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de la Plantilla</label>
                  <input type="text" required placeholder="Ej: Fuerza Maxima - 3 Días" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl p-3.5 focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
                </div>

                {/* Días */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex overflow-x-auto bg-slate-100 p-2 gap-2 border-b border-slate-200 custom-scrollbar">
                    {formData.days.map(d => (
                      <button 
                        key={d.dayNumber} type="button" onClick={() => setActiveTab(d.dayNumber)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === d.dayNumber ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        Día {d.dayNumber}
                      </button>
                    ))}
                    <button type="button" onClick={addDay} className="px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-sm flex items-center gap-1 transition-colors"><Plus size={16}/> Día</button>
                  </div>

                  {activeDay && (
                    <div className="p-5 sm:p-6 space-y-6 animate-in fade-in">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enfoque de este día</label>
                          <input type="text" required placeholder="Ej: Tren Superior" value={activeDay.sessionType} onChange={e => updateActiveDay({ sessionType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3 focus:ring-2 focus:ring-blue-600 outline-none" />
                        </div>
                        {formData.days.length > 1 && (
                          <button type="button" onClick={() => removeDay(activeDay.dayNumber)} className="mt-6 p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors" title="Eliminar Día"><Trash2 size={18}/></button>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-black text-slate-800 flex items-center gap-2"><Dumbbell size={18} className="text-blue-500" /> Ejercicios</h3>
                          <button type="button" onClick={() => updateActiveDay({ exercises: [...activeDay.exercises, { id: Date.now().toString(), name: "", sets: "", reps: "", weight: "", groupId: "", videoUrl: "" }] })} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors">
                            <Plus size={14} /> Añadir Ejercicio
                          </button>
                        </div>
                        
                        {activeDay.exercises.length === 0 ? (
                          <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm font-medium">Agregá los ejercicios para este día.</div>
                        ) : (
                          <div className="overflow-x-auto pb-2">
                            <div className="min-w-[800px] space-y-2">
                              <div className="flex gap-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <div className="w-[30%]">Ejercicio</div>
                                <div className="w-[10%] text-center">Series</div>
                                <div className="w-[10%] text-center">Reps</div>
                                <div className="w-[15%]">Carga / Int.</div>
                                <div className="w-[20%]">Video URL</div>
                                <div className="w-[8%] text-center">Blq</div>
                                <div className="w-[7%] text-center">Acción</div>
                              </div>
                              {activeDay.exercises.map(ex => (
                                <div key={ex.id} className={`flex gap-2 p-2 rounded-xl border items-center focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${getBlockColor(ex.groupId)}`}>
                                  <input type="text" placeholder="Sentadilla" value={ex.name} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, name: e.target.value} : x) })} className="w-[30%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm" />
                                  <input type="text" placeholder="4" value={ex.sets || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, sets: e.target.value} : x) })} className="w-[10%] text-center bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm" />
                                  <input type="text" placeholder="10-12" value={ex.reps} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, reps: e.target.value} : x) })} className="w-[10%] text-center bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm" />
                                  <input type="text" placeholder="RIR 2" value={ex.weight} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, weight: e.target.value} : x) })} className="w-[15%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-blue-600 outline-none focus:border-blue-400 shadow-sm" />
                                  <input type="url" placeholder="https://youtu..." value={ex.videoUrl || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, videoUrl: e.target.value} : x) })} className="w-[20%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-500 outline-none focus:border-blue-400 shadow-sm" />
                                  <input type="text" maxLength={2} placeholder="-" value={ex.groupId || ""} onChange={e => updateActiveDay({ exercises: activeDay.exercises.map(x => x.id === ex.id ? {...x, groupId: e.target.value.toUpperCase()} : x) })} className="w-[8%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-black text-center outline-none focus:border-blue-400 shadow-sm" />
                                  <div className="w-[7%] flex justify-center">
                                    <button type="button" onClick={() => updateActiveDay({ exercises: activeDay.exercises.filter(x => x.id !== ex.id) })} className="text-slate-400 hover:text-red-500 p-2 rounded-lg bg-white shadow-sm border border-slate-200"><X size={16}/></button>
                                  </div>
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
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all active:scale-95">Cancelar</button>
              <button type="submit" form="libraryForm" disabled={isSubmitting} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-2">
                <Save size={16} /> {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {templateToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner"><AlertTriangle size={36} /></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¿Borrar Plantilla?</h3>
            <p className="text-sm font-medium text-slate-500 mb-8">Esta acción es irreversible y la plantilla desaparecerá de tu biblioteca.</p>
            <div className="flex gap-3">
              <button onClick={() => setTemplateToDelete(null)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">Cancelar</button>
              <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 active:scale-95">Sí, borrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}