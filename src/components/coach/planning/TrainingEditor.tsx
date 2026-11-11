import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Clock, Flame, Eraser, PenTool, Minus, Circle, X as XIcon } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { usePlanningStore } from '../../../store/usePlanningStore';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Toast, { type ToastState } from '../../shared/Toast';
import { Skeleton } from '../../ui/Skeleton';

type DrawTool = 'freehand' | 'line' | 'playerO' | 'playerX';

export default function TrainingEditor() {
  const { activeCategoryId, selectedSession, setSelectedSession } = usePlanningStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Mientras llega la sesión guardada no se puede editar ni guardar: evita pisarla con campos vacíos
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((type: ToastState['type'], message: string) => setToast({ type, message }), []);
  // Referencia estable: si cambiara en cada render, el temporizador del Toast se reiniciaría sin parar
  const dismissToast = useCallback(() => setToast(null), []);

  const [tool, setTool] = useState<DrawTool>('freehand');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    sessionType: "",
    intensity: "Media",
    durationMinutes: 90,
    notesHtml: "",
    drawingData: ""
  });

  const sessionId = selectedSession && activeCategoryId 
    ? `${activeCategoryId}_${selectedSession.date.split('T')[0]}` : "";

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) { setIsLoadingSession(false); return; }
      setIsLoadingSession(true);
      try {
        const docRef = doc(db, "clubTrainings", sessionId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            sessionType: data.sessionType || "", intensity: data.intensity || "Media",
            durationMinutes: data.durationMinutes || 90, notesHtml: data.notesHtml || "", drawingData: data.drawingData || ""
          });

          if (data.drawingData && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();
            img.onload = () => {
              ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
              ctx?.drawImage(img, 0, 0);
            };
            img.src = data.drawingData;
          }
        }
      } catch (error) {
        console.error("Error al cargar la sesión del club:", error);
        showToast('error', 'No se pudo cargar la sesión.');
      } finally {
        setIsLoadingSession(false);
      }
    }
    loadSession();
  }, [sessionId, showToast]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const saveDrawingState = () => {
    if (canvasRef.current) setFormData(prev => ({ ...prev, drawingData: canvasRef.current!.toDataURL() }));
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (tool === 'freehand' || tool === 'line') {
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = '#FFFFFF'; // Lápiz blanco para la cancha oscura
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (tool === 'line') {
        setStartPos({ x, y });
        setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
    } else if (tool === 'playerO') {
      ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6'; ctx.fill(); // Azul
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      saveDrawingState();
    } else if (tool === 'playerX') {
      ctx.beginPath(); const s = 7;
      ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      saveDrawingState();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (tool === 'freehand') {
      ctx.lineTo(x, y); ctx.stroke();
    } else if (tool === 'line' && snapshot) {
      ctx.putImageData(snapshot, 0, 0); 
      ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(x, y); ctx.stroke();
    }
  };

  const stopDrawing = () => { if (isDrawing) { setIsDrawing(false); saveDrawingState(); } };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setFormData(prev => ({ ...prev, drawingData: "" }));
    }
  };

  const handleSave = async () => {
    if (!sessionId || !activeCategoryId || isLoadingSession) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, "clubTrainings", sessionId);
      await setDoc(docRef, {
        // coachId: dueño del documento para las reglas de Firestore
        ...formData, teamId: activeCategoryId, coachId: auth.currentUser?.uid, date: selectedSession?.date.split('T')[0], updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast('success', 'Entrenamiento guardado.');
    } catch (error) {
      console.error("Error al guardar la sesión del club:", error);
      showToast('error', 'No se pudo guardar la sesión.');
    }
    finally { setIsSubmitting(false); }
  };

  if (!selectedSession) return null;
  const sessionDate = new Date(selectedSession.date);

  return (
    <div className="h-full flex flex-col bg-transparent animate-in slide-in-from-right-8 duration-300">
      
      {/* HEADER EDITOR */}
      <div className="p-4 sm:p-6 border-b border-[var(--line-800)] flex justify-between items-center bg-[var(--ink-900)]/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedSession(null)}
            className="p-2.5 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-xl transition-all text-[var(--mist-100)] font-bold flex items-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
          >
            <ArrowLeft size={18} /> <span className="hidden sm:inline">Volver</span>
          </button>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--mist-100)] tracking-tight">Diseñar Entrenamiento</h2>
            <p className="text-xs sm:text-sm font-bold text-[var(--mist-500)] uppercase tracking-wider mt-0.5">
              {sessionDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleSave} disabled={isSubmitting || isLoadingSession}
          className="bg-[var(--signal-500)] hover:bg-[var(--signal-600)] disabled:bg-[var(--signal-500)]/50 text-[var(--ink-950)] font-black px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mist-100)]"
        >
          <Save size={18} /> <span className="hidden sm:inline">{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {isLoadingSession ? (
            <div className="space-y-6" aria-busy="true" aria-live="polite">
              <Skeleton className="h-52 w-full rounded-[2rem]" />
              <Skeleton className="h-72 w-full rounded-[2rem]" />
            </div>
          ) : (
          <div className="space-y-6">
            {/* PANEL DE DATOS */}
            <div className="bg-[var(--ink-850)] p-6 sm:p-8 rounded-[2rem] border border-[var(--line-800)] shadow-lg">
               <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Enfoque Principal</label>
               <input 
                  type="text" value={formData.sessionType} onChange={(e) => setFormData({...formData, sessionType: e.target.value})}
                  placeholder="Ej: Recepción y Armado Rápido" 
                  className="w-full bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl p-4 text-[var(--mist-100)] font-bold outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all text-lg placeholder-[var(--mist-500)]" 
               />
               <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2 flex items-center gap-1"><Flame size={14}/> Intensidad</label>
                    <select 
                      value={formData.intensity} onChange={(e) => setFormData({...formData, intensity: e.target.value})}
                      className="w-full bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl p-3.5 text-[var(--mist-100)] font-bold outline-none focus:ring-1 focus:ring-[var(--signal-500)] focus:border-[var(--signal-500)] cursor-pointer"
                    >
                      <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Máxima">Máxima</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={14}/> Duración</label>
                    <input 
                      type="number" value={formData.durationMinutes} onChange={(e) => setFormData({...formData, durationMinutes: Number(e.target.value)})}
                      placeholder="Min" 
                      className="w-full bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl p-3.5 text-[var(--mist-100)] font-bold outline-none focus:ring-1 focus:ring-[var(--signal-500)] focus:border-[var(--signal-500)] placeholder-[var(--mist-500)]" 
                    />
                  </div>
               </div>
            </div>

            {/* EDITOR QUILL MODO OSCURO (INYECCIÓN DE CSS) */}
            <div className="bg-[var(--ink-850)] p-6 sm:p-8 rounded-[2rem] border border-[var(--line-800)] shadow-lg">
              <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-wider mb-3">Detalle de Ejercicios y Tareas</label>
              
              <div className="
                [&_.ql-toolbar]:bg-[var(--ink-900)] [&_.ql-toolbar]:border-[var(--line-800)] [&_.ql-toolbar]:rounded-t-xl 
                [&_.ql-container]:bg-[var(--ink-950)] [&_.ql-container]:border-[var(--line-800)] [&_.ql-container]:rounded-b-xl 
                [&_.ql-editor]:text-[var(--mist-100)] [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm
                [&_button]:text-[var(--mist-500)] [&_.ql-stroke]:stroke-[var(--mist-500)] [&_.ql-fill]:fill-[var(--mist-500)]
              ">
                <ReactQuill 
                  theme="snow" 
                  value={formData.notesHtml} 
                  onChange={(content: string) => setFormData({...formData, notesHtml: content})}
                />
              </div>
            </div>
          </div>
          )}

          <div className="bg-[var(--ink-850)] p-6 sm:p-8 rounded-[2rem] border border-[var(--line-800)] shadow-lg flex flex-col items-center">
            
            <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="font-display text-xl font-bold text-[var(--mist-100)] flex items-center gap-2">
                <PenTool size={20} className="text-[var(--signal-500)]"/> Pizarra Táctica
              </h3>

              {/* TOOLBAR PIZARRA */}
              <div className="flex bg-[var(--ink-950)] p-1 rounded-xl shadow-inner border border-[var(--line-800)]">
                <button onClick={() => setTool('freehand')} className={`p-2 rounded-lg transition-all ${tool === 'freehand' ? 'bg-[var(--ink-800)] text-[var(--signal-500)] shadow-sm' : 'text-[var(--mist-500)] hover:text-[var(--mist-100)]'}`} title="Dibujo Libre"><PenTool size={18}/></button>
                <button onClick={() => setTool('line')} className={`p-2 rounded-lg transition-all ${tool === 'line' ? 'bg-[var(--ink-800)] text-[var(--signal-500)] shadow-sm' : 'text-[var(--mist-500)] hover:text-[var(--mist-100)]'}`} title="Línea Recta"><Minus size={18}/></button>
                <button onClick={() => setTool('playerO')} className={`p-2 rounded-lg transition-all ${tool === 'playerO' ? 'bg-[var(--ink-800)] text-[var(--signal-500)] shadow-sm' : 'text-[var(--mist-500)] hover:text-[var(--mist-100)]'}`} title="Jugador Local"><Circle size={18}/></button>
                <button onClick={() => setTool('playerX')} className={`p-2 rounded-lg transition-all ${tool === 'playerX' ? 'bg-[var(--ink-800)] text-[var(--signal-500)] shadow-sm' : 'text-[var(--mist-500)] hover:text-[var(--mist-100)]'}`} title="Jugador Rival"><XIcon size={18}/></button>
                <div className="w-px bg-[var(--line-800)] mx-1 my-2"></div>
                <button onClick={clearCanvas} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Borrar Todo"><Eraser size={18}/></button>
              </div>
            </div>

            {/* CANCHA DE VÓLEY (DISEÑO NOCTURNO/CRONÓMETRO) */}
            <div 
              className="relative w-full max-w-[300px] aspect-[1/2] bg-[var(--ink-900)] border-4 border-[var(--line-800)] rounded-md overflow-hidden mx-auto touch-none"
              style={{
                backgroundImage: `
                  linear-gradient(to bottom, transparent 49.5%, var(--line-800) 49.5%, var(--line-800) 50.5%, transparent 50.5%), 
                  linear-gradient(to bottom, transparent 33%, rgba(255,255,255,0.05) 33%, rgba(255,255,255,0.05) 33.5%, transparent 33.5%),
                  linear-gradient(to bottom, transparent 66.5%, rgba(255,255,255,0.05) 66.5%, rgba(255,255,255,0.05) 67%, transparent 67%)
                `
              }}
            >
              {/* Zona de ataque con un sutil resplandor naranja */}
              <div className="absolute inset-x-2 inset-y-2 bg-[var(--signal-500)]/5 border-2 border-[var(--line-800)] pointer-events-none"></div>
              
              <canvas
                ref={canvasRef} width={300} height={600}
                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                className={`absolute inset-0 w-full h-full z-10 ${isLoadingSession ? 'pointer-events-none' : ''} ${tool === 'freehand' || tool === 'line' ? 'cursor-crosshair' : 'cursor-pointer'}`}
              />
            </div>
            <p className="text-xs text-[var(--mist-500)] mt-5 text-center font-medium">
              Diagramá la táctica. Los cambios se guardan automático al hacer clic en "Guardar".
            </p>
          </div>
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}