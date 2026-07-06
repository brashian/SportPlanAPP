import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import type { Athlete, DailyBlock, Mesocycle, MesocyclePhase, Macrocycle } from "../../types/models";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface AthleteDetailViewProps {
  athletes: Athlete[];
  onLoadMacrocycles: (athleteId: string, macros: Macrocycle[]) => void;
  onLoadBlocks: (mesocycleId: string, blocks: DailyBlock[]) => void;
  onCreateMacrocycle: (athleteId: string, data: { name: string; startDate: string; endDate: string }) => void;
  onUpdateMacrocycle: (macrocycleId: string, data: { name: string; startDate: string; endDate: string }) => void;
  onCreateMesocycle: (macrocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => void;
  onUpdateMesocycle: (mesocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => void;
  onReorderMesocycles: (macrocycleId: string, reordered: Mesocycle[]) => void;
  blocksByMesocycle: Record<string, DailyBlock[]>;
  onSaveBlock: (mesocycleId: string, block: Omit<DailyBlock, "id" | "createdAt" | "updatedAt">, existingBlockId?: string) => void;
  onDeleteBlock: (mesocycleId: string, blockId: string) => void;
}

export default function AthleteDetailView({
  athletes,
  onLoadMacrocycles,
  onLoadBlocks,
  onCreateMacrocycle,
  onCreateMesocycle,
  blocksByMesocycle,
  onSaveBlock,
  onDeleteBlock,
}: AthleteDetailViewProps) {
  const { athleteId } = useParams<{ athleteId: string }>();
  const athlete = athletes.find((a) => a.id === athleteId);
  const [isLoadingMacros, setIsLoadingMacros] = useState(true);

  // =========================================================================
  // HELPERS: TIMELINE Y SEMANAS (Lunes a Domingo)
  // =========================================================================
  const phaseColors: Record<MesocyclePhase, string> = {
    "Preparación General": "bg-green-400",
    "Preparación Específica": "bg-blue-400",
    "Pre-Competitiva": "bg-yellow-400",
    "Competitiva": "bg-red-500",
    "Transición": "bg-purple-400"
  };

  const calculateWidth = (macroStart: string, macroEnd: string, mesoStart: string, mesoEnd: string) => {
    const mStart = new Date(macroStart).getTime();
    const mEnd = new Date(macroEnd).getTime();
    const sStart = new Date(mesoStart).getTime();
    const sEnd = new Date(mesoEnd).getTime();
    const totalDuration = mEnd - mStart;
    if (totalDuration <= 0) return "0%";
    return `${((sEnd - sStart) / totalDuration) * 100}%`;
  };

  const getWeeksInRange = (start: string, end: string) => {
    const weeks: { label: string; days: { date: string, name: string }[] }[] = [];
    let current = new Date(start + "T12:00:00"); 
    
    // Retroceder al Lunes de esa semana
    const day = current.getDay();
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diffToMonday);

    const endDate = new Date(end + "T12:00:00");
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    let weekNumber = 1;
    // Iteramos hasta superar la fecha de fin Y cerrar la semana actual (domingo)
    while (current <= endDate || current.getDay() !== 1) { 
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push({
          date: current.toISOString().split("T")[0],
          name: dayNames[current.getDay()]
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push({ label: `Semana ${weekNumber}`, days });
      weekNumber++;
      
      if (current > endDate) break;
    }
    return weeks;
  };

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  // =========================================================================
  // ESTADOS DEL MODAL: MACROCICLO
  // =========================================================================
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [macroFormData, setMacroFormData] = useState({ name: "", startDate: "", endDate: "" });

  const handleMacroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateMacrocycle(athleteId, macroFormData);
      setMacroFormData({ name: "", startDate: "", endDate: "" });
      setIsMacroModalOpen(false);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // =========================================================================
  // ESTADOS DEL MODAL: MESOCICLO
  // =========================================================================
  const [isMesoModalOpen, setIsMesoModalOpen] = useState(false);
  const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
  const [mesoFormData, setMesoFormData] = useState({
    name: "", phase: "Preparación General" as MesocyclePhase, startDate: "", endDate: "",
  });

  const handleMesoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMacroId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateMesocycle(activeMacroId, mesoFormData);
      setMesoFormData({ name: "", phase: "Preparación General", startDate: "", endDate: "" });
      setIsMesoModalOpen(false);
      setActiveMacroId(null);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // =========================================================================
  // ESTADOS Y FUNCIÓN: VER BLOQUES DIARIOS (ENTRENAMIENTOS)
  // =========================================================================
  const [activeViewMesoId, setActiveViewMesoId] = useState<string | null>(null);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  const handleViewBlocks = async (mesocycleId: string) => {
    if (activeViewMesoId === mesocycleId) { 
      setActiveViewMesoId(null); 
      return; 
    }
    setActiveViewMesoId(mesocycleId);
    
    // Si ya los tenemos en memoria, no hacemos la petición para ahorrar datos
    if (blocksByMesocycle[mesocycleId]) return;

    setIsLoadingBlocks(true);
    try {
      const q = query(collection(db, "dailyBlocks"), where("mesocycleId", "==", mesocycleId));
      const snapshot = await getDocs(q);
      const fetchedBlocks: DailyBlock[] = [];
      
      snapshot.forEach((doc) => {
        // Obligamos a que el ID del documento de Firebase se pegue en nuestro objeto de React
        fetchedBlocks.push({ id: doc.id, ...doc.data() } as DailyBlock);
      });
      
      onLoadBlocks(mesocycleId, fetchedBlocks);
    } catch (error) { 
      console.error("Error al traer bloques:", error); 
    } finally { 
      setIsLoadingBlocks(false); 
    }
  };

  // =========================================================================
  // ESTADOS Y FUNCIÓN: MODAL DE BLOQUE DIARIO (RUTINA)
  // =========================================================================
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [activeBlockContext, setActiveBlockContext] = useState<{ mesoId: string, date: string, name: string, existingId?: string } | null>(null);
  
  const [blockFormData, setBlockFormData] = useState({
    sessionType: "", 
    intensity: 5, 
    volume: "Medio" as "Bajo" | "Medio" | "Alto", 
    durationMinutes: 60, 
    notesHtml: "",
    exercises: [] as { id: string; name: string; reps: string; weight: string }[]
  });

  const handleOpenBlockModal = (mesoId: string, date: string, dayName: string, existingBlock?: DailyBlock) => {
    setActiveBlockContext({ mesoId, date, name: dayName, existingId: existingBlock?.id });
    
    if (existingBlock) {
      setBlockFormData({
        sessionType: existingBlock.sessionType, 
        intensity: existingBlock.intensity,
        volume: existingBlock.volume, 
        durationMinutes: existingBlock.durationMinutes, 
        notesHtml: existingBlock.notesHtml,
        exercises: existingBlock.exercises || []
      });
    } else {
      setBlockFormData({ 
        sessionType: "", intensity: 5, volume: "Medio", durationMinutes: 60, notesHtml: "", exercises: [] 
      });
    }
    setIsBlockModalOpen(true);
  };

  // Helpers para la tabla de ejercicios
  const handleAddExercise = () => {
    setBlockFormData(prev => ({
      ...prev,
      exercises: [...prev.exercises, { id: Date.now().toString(), name: "", reps: "", weight: "" }]
    }));
  };

  const handleUpdateExercise = (id: string, field: "name" | "reps" | "weight", value: string) => {
    setBlockFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex)
    }));
  };

  const handleRemoveExercise = (id: string) => {
    setBlockFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.id !== id)
    }));
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlockContext || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSaveBlock(activeBlockContext.mesoId, {
        date: activeBlockContext.date, 
        sessionType: blockFormData.sessionType,
        intensity: blockFormData.intensity, 
        volume: blockFormData.volume,
        durationMinutes: blockFormData.durationMinutes, 
        notesHtml: blockFormData.notesHtml,
        exercises: blockFormData.exercises
      }, activeBlockContext.existingId);
      
      setIsBlockModalOpen(false);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // =========================================================================
  // EFECTO: CARGAR MACROCICLOS
  // =========================================================================
  useEffect(() => {
    async function fetchMacrocycles() {
      if (!athleteId) return;
      setIsLoadingMacros(true);
      try {
        const q = query(collection(db, "macrocycles"), where("athleteId", "==", athleteId));
        const snapshot = await getDocs(q);
        const fetchedMacros: Macrocycle[] = [];
        snapshot.forEach((doc) => fetchedMacros.push(doc.data() as Macrocycle));
        
        fetchedMacros.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        onLoadMacrocycles(athleteId, fetchedMacros);
      } catch (error) { 
        console.error(error); 
      } finally { 
        setIsLoadingMacros(false); 
      }
    }
    fetchMacrocycles();
  }, [athleteId]);

  if (!athlete) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-700">Atleta no encontrado</h2>
        <Link to="/athletes" className="text-blue-600 hover:underline mt-4 inline-block">Volver a la lista</Link>
      </div>
    );
  }

  const fullName = athlete.firstName ? `${athlete.firstName} ${athlete.lastName}` : athlete.name;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* --- NAVEGACIÓN --- */}
      <div>
        <Link to="/athletes" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
          ← Volver a Mis Atletas
        </Link>
      </div>

      {/* --- TARJETA DEL ATLETA --- */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <span className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-medium">
              {athlete.sport || "Deporte no especificado"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-md w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Email:</span>
            {athlete.email ? (
              <a href={`mailto:${athlete.email}`} className="text-blue-600 hover:underline">{athlete.email}</a>
            ) : <span className="italic text-gray-400">No registrado</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Teléfono:</span>
            {athlete.phone ? (
              <a href={`tel:${athlete.phone}`} className="text-blue-600 hover:underline">{athlete.phone}</a>
            ) : <span className="italic text-gray-400">No registrado</span>}
          </div>
        </div>
      </div>

      {/* --- SECCIÓN DE PLANIFICACIÓN --- */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Planificación</h2>
          <button 
            onClick={() => setIsMacroModalOpen(true)} 
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + Nuevo Macrociclo
          </button>
        </div>

        {isLoadingMacros ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg text-gray-500 animate-pulse">Cargando historial de planificación...</div>
        ) : !athlete.macrocycles || athlete.macrocycles.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500 bg-gray-50">Este atleta no tiene ninguna planificación todavía.</div>
        ) : (
          <div className="space-y-6">
            {athlete.macrocycles.map((macro) => (
              <div key={macro.id} className="border border-gray-200 bg-white rounded-lg shadow-sm overflow-hidden">
                
                {/* Cabecera del Macrociclo y Timeline */}
                <div className="bg-white p-5 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{macro.name}</h3>
                      <p className="text-sm text-gray-500">{macro.startDate} al {macro.endDate}</p>
                    </div>
                    <button 
                      onClick={() => { setActiveMacroId(macro.id); setIsMesoModalOpen(true); }} 
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                    >
                      + Agregar Mesociclo
                    </button>
                  </div>
                  
                  {macro.mesocycles && macro.mesocycles.length > 0 && (
                    <div className="w-full h-4 bg-gray-100 rounded-full flex overflow-hidden mt-4 border border-gray-200 relative">
                      {/* Línea del Hoy */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-black z-10" style={{ left: calculateWidth(macro.startDate, macro.endDate, macro.startDate, new Date().toISOString().split("T")[0]) }} title="Día Actual" />
                      {macro.mesocycles.map(meso => (
                        <div 
                          key={`timeline-${meso.id}`} 
                          className={`h-full ${phaseColors[meso.phase as MesocyclePhase] || "bg-gray-400"}`} 
                          style={{ width: calculateWidth(macro.startDate, macro.endDate, meso.startDate, meso.endDate) }} 
                          title={`${meso.name} (${meso.phase})`} 
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Lista de Mesociclos */}
                <div className="p-5">
                  {!macro.mesocycles || macro.mesocycles.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">No hay mesociclos creados todavía.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {macro.mesocycles.map((meso) => (
                        <div key={meso.id} className="border border-gray-200 rounded-md p-4 bg-white hover:border-blue-300 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-800">{meso.name}</h4>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">{meso.phase}</span>
                              <p className="text-xs text-gray-500 mt-2">{meso.startDate} → {meso.endDate}</p>
                            </div>
                            <button 
                              onClick={() => handleViewBlocks(meso.id)} 
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm font-medium transition-colors"
                            >
                              {activeViewMesoId === meso.id ? "Ocultar Semanas" : "Ver Semanas"}
                            </button>
                          </div>

                          {/* Acordeón de Semanas (Lunes a Domingo) */}
                          {activeViewMesoId === meso.id && (
                            <div className="mt-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
                              {isLoadingBlocks ? (
                                <p className="text-sm text-blue-600 p-2">Cargando planificación...</p>
                              ) : (
                                <div className="space-y-2">
                                  {getWeeksInRange(meso.startDate, meso.endDate).map((week, idx) => {
                                    const weekKey = `${meso.id}-w${idx}`;
                                    const isExpanded = expandedWeek === weekKey;
                                    
                                    return (
                                      <div key={weekKey} className="border border-gray-200 bg-white rounded overflow-hidden shadow-sm">
                                        <button 
                                          onClick={() => setExpandedWeek(isExpanded ? null : weekKey)} 
                                          className="w-full flex justify-between items-center p-3 hover:bg-blue-50 transition-colors"
                                        >
                                          <span className="font-bold text-gray-800">{week.label}</span>
                                          <span className="text-xs text-gray-500 font-medium">Del {week.days[0].date} al {week.days[6].date}</span>
                                        </button>

                                        {isExpanded && (
                                          <div className="border-t border-gray-100 grid grid-cols-1 divide-y divide-gray-100">
                                            {week.days.map(day => {
                                              const existingBlock = blocksByMesocycle[meso.id]?.find(b => b.date === day.date);
                                              // Resaltar visualmente si el día cae fuera de las fechas exactas del mesociclo
                                              const isOutside = day.date < meso.startDate || day.date > meso.endDate;
                                              
                                              return (
                                                <div key={day.date} className={`flex justify-between items-center p-3 text-sm transition-colors ${isOutside ? 'bg-gray-50 opacity-70' : 'bg-white hover:bg-gray-50'}`}>
                                                  <div className="flex gap-4 items-center">
                                                    <span className={`font-bold w-24 ${isOutside ? 'text-gray-400' : 'text-gray-700'}`}>
                                                      {day.name} <span className="font-normal text-xs ml-1">{day.date.slice(-2)}</span>
                                                    </span>
                                                    {existingBlock ? (
                                                      <span className="text-gray-700 font-medium">{existingBlock.sessionType} • Vol: {existingBlock.volume}</span>
                                                    ) : (
                                                      <span className="text-gray-400 italic text-xs">Sin asignar</span>
                                                    )}
                                                  </div>
                                                  <button 
                                                    onClick={() => handleOpenBlockModal(meso.id, day.date, day.name, existingBlock)} 
                                                    className="text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold transition-colors"
                                                  >
                                                    {existingBlock ? "Editar" : "+ Cargar"}
                                                  </button>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREAR MACROCICLO */}
      {/* ========================================================= */}
      {isMacroModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Nuevo Macrociclo</h2>
            <form onSubmit={handleMacroSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" required value={macroFormData.name} 
                  onChange={(e) => setMacroFormData({ ...macroFormData, name: e.target.value })} 
                  className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                  <input 
                    type="date" required value={macroFormData.startDate} 
                    onChange={(e) => setMacroFormData({ ...macroFormData, startDate: e.target.value })} 
                    className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input 
                    type="date" required value={macroFormData.endDate} 
                    onChange={(e) => setMacroFormData({ ...macroFormData, endDate: e.target.value })} 
                    className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" 
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsMacroModalOpen(false)} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300">
                  {isSubmitting ? "Guardando..." : "Guardar Macrociclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREAR MESOCICLO */}
      {/* ========================================================= */}
      {isMesoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Mesociclo</h2>
            <form onSubmit={handleMesoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" required value={mesoFormData.name} 
                  onChange={(e) => setMesoFormData({ ...mesoFormData, name: e.target.value })} 
                  className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fase del Entrenamiento</label>
                <select 
                  required value={mesoFormData.phase} 
                  onChange={(e) => setMesoFormData({ ...mesoFormData, phase: e.target.value as MesocyclePhase })} 
                  className="w-full border border-gray-300 rounded-md p-2 outline-none bg-white focus:border-blue-500"
                >
                  <option value="Preparación General">Preparación General</option>
                  <option value="Preparación Específica">Preparación Específica</option>
                  <option value="Pre-Competitiva">Pre-Competitiva</option>
                  <option value="Competitiva">Competitiva</option>
                  <option value="Transición">Transición</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                  <input 
                    type="date" required value={mesoFormData.startDate} 
                    onChange={(e) => setMesoFormData({ ...mesoFormData, startDate: e.target.value })} 
                    className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input 
                    type="date" required value={mesoFormData.endDate} 
                    onChange={(e) => setMesoFormData({ ...mesoFormData, endDate: e.target.value })} 
                    className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" 
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => { setIsMesoModalOpen(false); setActiveMacroId(null); }} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300">
                  {isSubmitting ? "Guardando..." : "Guardar Mesociclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ENTRENAMIENTO Y TABLA DE RUTINA */}
      {/* ========================================================= */}
      {isBlockModalOpen && activeBlockContext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[95vh]">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">
                Planificación: <span className="text-blue-600">{activeBlockContext.name} {activeBlockContext.date}</span>
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="blockForm" onSubmit={handleBlockSubmit} className="space-y-6">
                
                {/* 1. Datos Generales */}
                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Sesión *</label>
                    <input 
                      type="text" required value={blockFormData.sessionType} 
                      onChange={(e) => setBlockFormData({ ...blockFormData, sessionType: e.target.value })} 
                      className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-200 outline-none" 
                      placeholder="Ej: Fuerza, Hipertrofia, Aeróbico..." 
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Intensidad ({blockFormData.intensity}/10)</label>
                      <input 
                        type="range" min="1" max="10" step="1" 
                        value={blockFormData.intensity} 
                        onChange={(e) => setBlockFormData({ ...blockFormData, intensity: Number(e.target.value) })} 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-3" 
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Volumen</label>
                      <select 
                        value={blockFormData.volume} 
                        onChange={(e) => setBlockFormData({ ...blockFormData, volume: e.target.value as "Bajo" | "Medio" | "Alto" })} 
                        className="w-full border border-gray-300 rounded p-2 outline-none bg-white"
                      >
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. TABLA DE RUTINA */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-lg font-bold text-gray-800">Cargar Rutina</label>
                    <button 
                      type="button" onClick={handleAddExercise} 
                      className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-1 px-3 rounded transition-colors"
                    >
                      + Agregar Ejercicio
                    </button>
                  </div>
                  
                  {blockFormData.exercises.length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                      No hay ejercicios cargados. Haz clic en "+ Agregar Ejercicio".
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Cabecera de la tabla */}
                      <div className="grid grid-cols-12 gap-2 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-5">Ejercicio</div>
                        <div className="col-span-3">Repeticiones</div>
                        <div className="col-span-3">Kilos / Peso</div>
                        <div className="col-span-1"></div>
                      </div>
                      
                      {/* Filas de ejercicios */}
                      {blockFormData.exercises.map((ex) => (
                        <div key={ex.id} className="grid grid-cols-12 gap-2 items-center bg-white">
                          <div className="col-span-5">
                            <input 
                              type="text" value={ex.name} 
                              onChange={(e) => handleUpdateExercise(ex.id, "name", e.target.value)} 
                              className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none" 
                              placeholder="Ej: Peso muerto" 
                            />
                          </div>
                          <div className="col-span-3">
                            <input 
                              type="text" value={ex.reps} 
                              onChange={(e) => handleUpdateExercise(ex.id, "reps", e.target.value)} 
                              className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none" 
                              placeholder="Ej: 10 10 8 8" 
                            />
                          </div>
                          <div className="col-span-3">
                            <input 
                              type="text" value={ex.weight} 
                              onChange={(e) => handleUpdateExercise(ex.id, "weight", e.target.value)} 
                              className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none" 
                              placeholder="Ej: 50 kg" 
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button 
                              type="button" onClick={() => handleRemoveExercise(ex.id)} 
                              className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors" 
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Notas Libres */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Desarrollo / Notas de la sesión</label>
                  <div className="h-48 mb-12">
                    <ReactQuill 
                      theme="snow" 
                      value={blockFormData.notesHtml} 
                      onChange={(content) => setBlockFormData({ ...blockFormData, notesHtml: content })} 
                      className="h-full" 
                    />
                  </div>
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-between items-center bg-white rounded-b-xl">
              {activeBlockContext.existingId ? (
                <button 
                  type="button" 
                  onClick={async () => { 
                    if (confirm("¿Seguro que quieres borrar este entrenamiento?")) { 
                      await onDeleteBlock(activeBlockContext.mesoId, activeBlockContext.existingId!); 
                      setIsBlockModalOpen(false); 
                    } 
                  }} 
                  className="text-red-600 hover:text-red-800 text-sm font-bold"
                >
                  Borrar Día
                </button>
              ) : <div></div>}
              
              <div className="flex space-x-3">
                <button 
                  type="button" onClick={() => setIsBlockModalOpen(false)} 
                  className="px-5 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" form="blockForm" disabled={isSubmitting} 
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-300 transition-colors shadow-sm"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Entrenamiento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}