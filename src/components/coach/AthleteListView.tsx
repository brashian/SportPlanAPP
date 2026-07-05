import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Athlete } from "../../types/models";
import { athleteFullName } from "../../types/models";

interface AthleteListViewProps {
  athletes: Athlete[];
}

/**
 * AthleteListView
 * ----------------------------------------------------------------------------
 * Directorio de atletas a cargo del Coach autenticado (ya filtrados server-side
 * por coachId). Cada tarjeta muestra Nombre y Apellido y navega al detalle
 * en /athletes/:athleteId al hacer click.
 */
export default function AthleteListView({ athletes }: AthleteListViewProps) {
  const navigate = useNavigate();

  if (athletes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Todavía no tenés atletas asignados.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Mis Atletas</h1>
      <p className="text-sm text-gray-500 mb-6">
        Seleccioná un atleta para ver y planificar su historial de entrenamiento.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {athletes.map((athlete) => {
          const fullName = athleteFullName(athlete);
          const activeSeasons = athlete.macrocycles.length;

          return (
            <button
              key={athlete.id}
              onClick={() => navigate(`/athletes/${athlete.id}`)}
              className="text-left rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-card transition-all"
            >
              <div className="h-11 w-11 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-500 overflow-hidden">
                {athlete.avatarUrl ? (
                  <img src={athlete.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  `${athlete.firstName.charAt(0)}${athlete.lastName.charAt(0)}`.toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {activeSeasons} {activeSeasons === 1 ? "macrociclo" : "macrociclos"} en su historial
                </p>
              </div>

              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
