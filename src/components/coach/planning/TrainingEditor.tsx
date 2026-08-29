import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, ArrowLeft, Save, Clock, Flame, Eraser, PenTool, Minus, Circle, X as XIcon } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { usePlanningStore } from '../../../store/usePlanningStore';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type DrawTool = 'freehand' | 'line' | 'playerO' | 'playerX';

export default function TrainingEditor() {
  const { activeCategoryId, selectedSession, setSelectedSession } = usePlanningStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    ? `${activeCategoryId}_${selectedSession.date.split('T')[0]}` 
    : "";

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) return;
      // CORREGIDO: clubTrainings con minúscula
      const docRef = doc(db, "clubTrainings", sessionId);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data();
        setFormData({
          sessionType: data.sessionType || "",
          intensity: data.intensity || "Media",
          durationMinutes: data.durationMinutes || 90,
          notesHtml: data.notesHtml || "",
          drawingData: data.drawingData || ""
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
    }
    loadSession();
  }, [sessionId]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const saveDrawingState = () => {
    if (canvasRef.current) {
      setFormData(prev => ({ ...prev, drawingData: canvasRef.current!.toDataURL() }));
    }
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
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (tool === 'line') {
        setStartPos({ x, y });
        setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
    } else if (tool === 'playerO') {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      saveDrawingState();
    } else if (tool === 'playerX') {
      ctx.beginPath();
      const s = 7;
      ctx.moveTo(x - s, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x - s, y + s);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
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
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'line' && snapshot) {
      ctx.putImageData(snapshot, 0, 0); 
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveDrawingState();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setFormData(prev => ({ ...prev, drawingData: "" }));
    }
  };

  const handleSave = async () => {
    if (!sessionId || !activeCategoryId) return;
    setIsSubmitting(true);
    try {
      // CORREGIDO: clubTrainings con minúscula
      const docRef = doc(db, "clubTrainings", sessionId);
      await setDoc(docRef, {
        ...formData,
        teamId: activeCategoryId,
        date: selectedSession?.date.split('T')[0],
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      alert("¡Entrenamiento guardado con éxito!");
    } catch (error) {
      console.error(error);
      alert("Error al guardar la sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedSession) return null;
  const sessionDate = new Date(selectedSession.date);

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-in slide-in-from-right-8 duration-300">
      <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedSession(null)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 font-bold flex items-center gap-2"
          >
            <ArrowLeft size={18} /> <span className="hidden sm:inline">Volver</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Diseñar Entrenamiento</h2>
            <p className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-wider mt-0.5">
              {sessionDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 active:scale-95"
        >
          <Save size={18} /> <span className="hidden sm:inline">{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enfoque Principal</label>
               <input 
                  type="text" 
                  value={formData.sessionType}
                  onChange={(e) => setFormData({...formData, sessionType: e.target.value})}
                  placeholder="Ej: Recepción y Armado Rápido" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 transition-all text-lg" 
               />
               <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Flame size={14}/> Intensidad</label>
                    <select 
                      value={formData.intensity}
                      onChange={(e) => setFormData({...formData, intensity: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option>Baja</option>
                      <option>Media</option>
                      <option>Alta</option>
                      <option>Máxima</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={14}/> Duración</label>
                    <input 
                      type="number" 
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({...formData, durationMinutes: Number(e.target.value)})}
                      placeholder="Minutos" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle de Ejercicios y Tareas</label>
              <div className="h-64 mb-12">
                <ReactQuill 
                  theme="snow" 
                  value={formData.notesHtml} 
                  onChange={(content: string) => setFormData({...formData, notesHtml: content})}
                  className="h-full rounded-b-xl" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <PenTool size={20} className="text-blue-500"/> Pizarra Táctica
              </h3>

              <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                <button 
                  onClick={() => setTool('freehand')}
                  className={`p-2 rounded-lg transition-all ${tool === 'freehand' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Dibujo Libre"
                ><PenTool size={18}/></button>
                <button 
                  onClick={() => setTool('line')}
                  className={`p-2 rounded-lg transition-all ${tool === 'line' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Línea Recta"
                ><Minus size={18}/></button>
                <button 
                  onClick={() => setTool('playerO')}
                  className={`p-2 rounded-lg transition-all ${tool === 'playerO' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Jugador Local"
                ><Circle size={18}/></button>
                <button 
                  onClick={() => setTool('playerX')}
                  className={`p-2 rounded-lg transition-all ${tool === 'playerX' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Jugador Rival"
                ><XIcon size={18}/></button>
                <div className="w-px bg-slate-300 mx-1 my-2"></div>
                <button 
                  onClick={clearCanvas}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Borrar Todo"
                ><Eraser size={18}/></button>
              </div>
            </div>

            <div 
              className="relative w-full max-w-[300px] aspect-[1/2] bg-orange-300 border-4 border-white shadow-inner rounded-md overflow-hidden mx-auto touch-none"
              style={{
                backgroundImage: `
                  linear-gradient(to bottom, transparent 49.5%, white 49.5%, white 50.5%, transparent 50.5%), 
                  linear-gradient(to bottom, transparent 33%, rgba(255,255,255,0.4) 33%, rgba(255,255,255,0.4) 33.5%, transparent 33.5%),
                  linear-gradient(to bottom, transparent 66.5%, rgba(255,255,255,0.4) 66.5%, rgba(255,255,255,0.4) 67%, transparent 67%)
                `
              }}
            >
              <div className="absolute inset-x-2 inset-y-2 bg-blue-500/90 border-2 border-white pointer-events-none"></div>
              <canvas
                ref={canvasRef}
                width={300}
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className={`absolute inset-0 w-full h-full z-10 ${tool === 'freehand' || tool === 'line' ? 'cursor-crosshair' : 'cursor-pointer'}`}
              />
            </div>
            <p className="text-xs text-slate-400 mt-5 text-center font-medium">
              Elegí la herramienta arriba y diagramá sobre la cancha. Todo se guarda automático al hacer clic en "Guardar".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}