import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Plus, X, ChevronRight, Activity } from "lucide-react";
import type { Athlete } from "../../types/models";
import { athleteFullName } from "../../types/models";

interface Props {
  athletes: Athlete[];
  onCreateAthlete: (data: { name: string; sport: string; email?: string; phone?: string }) => Promise<void>;
}

export default function AthleteListView({ athletes, onCreateAthlete }: Props) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", sport: "", email: "", phone: "",
  });

  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      const full = athleteFullName(a).toLowerCase() || (a.name || "").toLowerCase();
      return full.includes(searchTerm.toLowerCase()) || a.sport.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [athletes, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const nameCombo = `${formData.firstName} ${formData.lastName}`.trim();
      await onCreateAthlete({
        name: nameCombo, sport: formData.sport, email: formData.email, phone: formData.phone,
      });
      setIsModalOpen(false);
      setFormData({ firstName: "", lastName: "", sport: "", email: "", phone: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-blue-600" size={36} /> Mis Atletas
          </h1>
          <p className="text-slate-500 font-medium mt-2">Gestioná los perfiles y planificaciones de tu equipo.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-slate-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Nuevo Atleta
        </button>
      </div>

      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all">
        <Search className="text-slate-400 ml-3 shrink-0" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o deporte..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-transparent border-none focus:outline-none text-slate-800 font-medium placeholder:text-slate-400"
        />
      </div>

      {athletes.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center">
          <Users size={64} className="text-slate-300 mb-4" />
          <p className="text-xl font-black text-slate-700">Aún no tenés atletas.</p>
          <p className="text-slate-500 mt-2 font-medium">Hacé clic en "Nuevo Atleta" para empezar a armar tu equipo.</p>
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          No se encontraron atletas que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredAthletes.map((athlete) => {
            const name = athleteFullName(athlete) || athlete.name;
            return (
              <div 
                key={athlete.id} 
                onClick={() => navigate(`/athletes/${athlete.id}`)}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
                    {name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 tracking-tight leading-tight group-hover:text-blue-700 transition-colors">
                      {name}
                    </h3>
                    <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                      {athlete.sport || "Sin Deporte"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <Activity size={14} /> {(athlete.macrocycles || []).length} Macros
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Atleta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nuevo Atleta</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre *</label>
                  <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellido *</label>
                  <input required type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deporte o Categoría *</label>
                <input required type="text" placeholder="Ej: Fútbol Primera" value={formData.sport} onChange={(e) => setFormData({ ...formData, sport: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email (Para que pueda ingresar)</label>
                <input type="email" placeholder="atleta@correo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl disabled:bg-blue-300 transition-all shadow-lg shadow-blue-600/30 active:scale-95">
                  {isSubmitting ? 'Guardando...' : 'Registrar Atleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}