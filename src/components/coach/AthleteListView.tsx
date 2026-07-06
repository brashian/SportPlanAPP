import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { Athlete } from "../../types/models";

interface AthleteListViewProps {
  athletes: Athlete[];
  onCreateAthlete: (data: { name: string; sport: string; email?: string; phone?: string }) => void;
}

export default function AthleteListView({ athletes, onCreateAthlete }: AthleteListViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", sport: "", email: "", phone: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sport) return;
    
    onCreateAthlete(formData);
    
    setFormData({ name: "", sport: "", email: "", phone: "" });
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* --- AQUÍ ESTÁ EL BOTÓN QUE FALTA --- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mis Atletas</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm"
        >
          + Nuevo Atleta
        </button>
      </div>

      {athletes.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Aún no tienes atletas registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map((athlete) => {
            const fullName = athlete.firstName 
              ? `${athlete.firstName} ${athlete.lastName}` 
              : athlete.name;

            return (
              <Link
                key={athlete.id}
                to={`/athletes/${athlete.id}`}
                className="block p-5 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-gray-800">{fullName}</h2>
                <p className="text-sm text-gray-500 mb-2">{athlete.sport || "Deporte no especificado"}</p>
                <div className="text-xs text-gray-400 mt-4 flex justify-between">
                  <span>{athlete.macrocycles?.length || 0} Macrociclos</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* MODAL PARA CREAR ATLETA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Nuevo Atleta</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" placeholder="Ej: Lionel Messi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deporte *</label>
                <input type="text" required value={formData.sport} onChange={(e) => setFormData({ ...formData, sport: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" placeholder="Ej: Fútbol, Atletismo..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Opcional)</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-blue-500" placeholder="+54 9 2995..." />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md">Guardar Atleta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}