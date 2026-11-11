import type { Dispatch, FormEvent, SetStateAction } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Calendar, Dumbbell, Loader2, Plus, X } from "lucide-react";
import type { VolumeLevel } from "../../../types/models";
import ModalShell from "../../shared/ModalShell";
import type { BlockContext, BlockFormData } from "./types";

// Colores por grupo de bloque (superserie/circuito), adaptados a fondo oscuro:
// fondo del color al 10% + borde sólido, para que se distingan sin "quemar" la vista.
const BLOCK_COLORS = [
  "bg-blue-500/10 border-l-4 border-blue-500",
  "bg-emerald-500/10 border-l-4 border-emerald-500",
  "bg-purple-500/10 border-l-4 border-purple-500",
  "bg-amber-500/10 border-l-4 border-amber-500",
  "bg-rose-500/10 border-l-4 border-rose-500",
  "bg-cyan-500/10 border-l-4 border-cyan-500",
];

const getBlockColor = (groupId?: string) => {
  if (!groupId || groupId.trim() === "") return "bg-[var(--ink-800)] border-l-4 border-transparent";
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) hash += groupId.toUpperCase().charCodeAt(i);
  return BLOCK_COLORS[hash % BLOCK_COLORS.length];
};

interface DailyBlockEditorModalProps {
  context: BlockContext;
  formData: BlockFormData;
  // Setter de useState: el editor usa actualizaciones funcionales (prev => ...)
  setFormData: Dispatch<SetStateAction<BlockFormData>>;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

// Editor de la sesión de un día: enfoque, volumen, ejercicios y notas
export default function DailyBlockEditorModal({ context, formData, setFormData, isSubmitting, onSubmit, onClose }: DailyBlockEditorModalProps) {
  return (
    <ModalShell
      onClose={onClose}
      labelledBy="block-modal-title"
      overlayClassName="bg-[var(--ink-950)]/90 backdrop-blur-sm motion-reduce:backdrop-blur-none"
      panelClassName="max-w-5xl flex flex-col max-h-[95vh] overflow-hidden p-0"
    >
      {(close) => (
        <>
          <div className="p-5 sm:p-6 bg-[var(--ink-950)] text-[var(--mist-100)] flex justify-between items-center shrink-0 border-b border-[var(--line-800)]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--signal-500)]/10 rounded-2xl hidden sm:block">
                <Calendar size={24} className="text-[var(--signal-500)]" />
              </div>
              <div>
                <h2 id="block-modal-title" className="font-display font-bold text-lg sm:text-2xl uppercase tracking-wide">{context.name} {context.date.split('-').reverse().join('/')}</h2>
                <p className="text-xs sm:text-sm text-[var(--mist-500)] font-medium mt-0.5">Diseñá el entrenamiento exacto para este día.</p>
              </div>
            </div>
            <button onClick={close} aria-label="Cerrar editor de sesión" className="p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-full transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"><X size={20} /></button>
          </div>

          <div className="p-4 sm:p-8 overflow-y-auto bg-[var(--ink-950)] flex-1 space-y-8 custom-scrollbar">
            <form id="blockForm" onSubmit={onSubmit} className="space-y-8">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-[var(--ink-900)] p-6 rounded-2xl border border-[var(--line-800)]">
                <div>
                  <label htmlFor="session-type" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Enfoque de la sesión</label>
                  <input id="session-type" type="text" required value={formData.sessionType} onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all" placeholder="Ej: Empuje y Tríceps" />
                </div>
                <div>
                  <label htmlFor="session-volume" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Volumen Estimado</label>
                  <select id="session-volume" value={formData.volume} onChange={(e) => setFormData({ ...formData, volume: e.target.value as VolumeLevel })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 outline-none focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] transition-all cursor-pointer">
                    <option value="Bajo">Bajo</option><option value="Medio">Medio</option><option value="Alto">Alto</option>
                  </select>
                </div>
              </div>

              <div className="bg-[var(--ink-900)] p-5 sm:p-6 rounded-2xl border border-[var(--line-800)]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-display font-bold text-[var(--mist-100)] uppercase tracking-wide flex items-center gap-2">
                      <Dumbbell size={20} className="text-[var(--signal-500)]" /> Esquema de Ejercicios
                    </h3>
                  </div>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, exercises: [...prev.exercises, { id: Date.now().toString(), name: "", sets: "", reps: "", weight: "", groupId: "", videoUrl: "" }] }))} className="w-full sm:w-auto bg-[var(--signal-500)]/10 hover:bg-[var(--signal-500)]/20 text-[var(--signal-500)] font-black py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
                    <Plus size={16} strokeWidth={3} /> Agregar Ejercicio
                  </button>
                </div>

                {formData.exercises.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-[var(--line-800)] rounded-2xl text-center text-[var(--mist-500)] text-sm font-medium">No hay ejercicios cargados para este día.</div>
                ) : (
                  <div className="overflow-x-auto pb-2">
                    <div className="min-w-[800px] space-y-3">
                      <div className="flex gap-2 px-2 text-[10px] font-black text-[var(--mist-500)] uppercase tracking-widest">
                        <div className="w-[30%]">Ejercicio</div>
                        <div className="w-[10%] text-center">Series</div>
                        <div className="w-[10%] text-center">Reps</div>
                        <div className="w-[15%]">Carga</div>
                        <div className="w-[20%]">Link Video</div>
                        <div className="w-[8%] text-center">Blq</div>
                        <div className="w-[7%]"></div>
                      </div>
                      {formData.exercises.map((ex) => {
                        const groupColor = getBlockColor(ex.groupId);
                        return (
                          <div key={ex.id} className={`flex gap-2 mb-2 p-2 rounded-xl border items-center transition-all focus-within:ring-2 focus-within:ring-[var(--signal-500)]/30 border-[var(--line-800)] ${groupColor}`}>
                            <input type="text" aria-label="Nombre del ejercicio" value={ex.name} onChange={(e) => setFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, name: e.target.value } : x) }))} className="w-[30%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] focus:border-[var(--signal-500)] outline-none" placeholder="Sentadilla" />
                            <input type="text" aria-label="Cantidad de series" value={ex.sets || ""} onChange={(e) => setFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, sets: e.target.value } : x) }))} className="w-[10%] text-center bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] focus:border-[var(--signal-500)] outline-none" placeholder="4" />
                            <input type="text" aria-label="Repeticiones" value={ex.reps} onChange={(e) => setFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, reps: e.target.value } : x) }))} className="w-[10%] text-center bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--mist-100)] focus:border-[var(--signal-500)] outline-none" placeholder="10" />
                            <input type="text" aria-label="Carga o intensidad" value={ex.weight} onChange={(e) => setFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, weight: e.target.value } : x) }))} className="w-[15%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-bold text-[var(--signal-500)] focus:border-[var(--signal-500)] outline-none" placeholder="RIR 2" />
                            <input type="url" aria-label="Link del video demostrativo" value={ex.videoUrl || ""} onChange={(e) => setFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, videoUrl: e.target.value } : x) }))} className="w-[20%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-medium text-[var(--mist-300)] focus:border-[var(--signal-500)] outline-none" placeholder="https://youtu.be/..." />
                            <input type="text" aria-label="Identificador de bloque o grupo" maxLength={2} value={ex.groupId || ""} onChange={(e) => setFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, groupId: e.target.value.toUpperCase() } : x) }))} className="w-[8%] bg-[var(--ink-900)] border border-[var(--line-800)] rounded-lg p-2.5 text-sm font-black text-[var(--mist-100)] text-center uppercase focus:border-[var(--signal-500)] outline-none" placeholder="-" />
                            <div className="w-[7%] flex justify-center">
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, exercises: prev.exercises.filter(x => x.id !== ex.id) }))} aria-label={`Eliminar ejercicio ${ex.name || 'sin nombre'}`} className="text-[var(--mist-500)] hover:text-red-400 hover:bg-red-500/10 p-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><X size={18} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Nota: react-quill (tema "snow") viene con estilos claros hardcodeados;
                  se deja en un panel claro deliberado para mantener legibilidad sin
                  tener que overridear su CSS interno a ciegas. */}
              <div className="bg-[var(--ink-900)] p-5 sm:p-6 rounded-2xl border border-[var(--line-800)]">
                <label className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-3">Notas y Observaciones</label>
                <div className="h-40 sm:h-48 mb-12 sm:mb-10 bg-[var(--mist-100)] rounded-xl overflow-hidden">
                  <ReactQuill
                    key={`quill-block-${context.date || 'new'}`}
                    theme="snow"
                    value={formData.notesHtml}
                    onChange={(content: string, _delta: unknown, source: string) => {
                      if (source === "user") setFormData(prev => ({ ...prev, notesHtml: content }));
                    }}
                    className="h-full rounded-b-xl"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="p-4 sm:p-6 border-t border-[var(--line-800)] bg-[var(--ink-900)] flex justify-end gap-3 shrink-0">
            <button type="button" onClick={close} className="px-6 py-3.5 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-xl font-bold text-sm text-[var(--mist-100)] transition-all active:scale-95">Cancelar</button>
            <button type="submit" form="blockForm" disabled={isSubmitting} className="px-8 py-3.5 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] rounded-xl font-display font-bold uppercase tracking-wide text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />} Guardar Sesión
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
