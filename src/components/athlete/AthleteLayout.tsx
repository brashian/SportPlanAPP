import React from "react";
import { LogOut } from "lucide-react"; // Importamos el ícono
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

interface AthleteLayoutProps {
  athleteName: string;
  avatarUrl?: string;
  children: React.ReactNode;
}

/**
 * AthleteLayout
 * ----------------------------------------------------------------------------
 * UI simplificada para el rol Atleta: sin Sidebar, solo un Topbar limpio.
 * El atleta accede a una vista única de solo lectura (su propia planificación).
 */
export default function AthleteLayout({ athleteName, avatarUrl, children }: AthleteLayoutProps) {
  
  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <p className="text-sm font-bold text-blue-600">Mi Planificación</p>
        
        <div className="flex items-center gap-4">
          {/* Info del Atleta */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{athleteName}</span>
            <div className="h-8 w-8 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center text-xs font-bold text-blue-600">
              {avatarUrl ? (
                <img src={avatarUrl} alt={athleteName} className="h-full w-full object-cover" />
              ) : (
                athleteName.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          {/* Línea divisoria */}
          <div className="h-6 w-px bg-gray-200"></div>

          {/* Botón de Cerrar Sesión */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}