import React from "react";

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
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-blue-500">Mi Planificación</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{athleteName}</span>
          <div className="h-8 w-8 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center text-xs font-medium text-blue-500">
            {avatarUrl ? (
              <img src={avatarUrl} alt={athleteName} className="h-full w-full object-cover" />
            ) : (
              athleteName.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}
