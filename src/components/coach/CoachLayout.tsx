import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Users, CalendarDays } from "lucide-react";

/**
 * CoachLayout
 * ----------------------------------------------------------------------------
 * Sidebar fijo con los dos módulos independientes, ahora conectados a rutas
 * reales (no a estado en memoria) para que /athletes, /athletes/:id y /club
 * sean URLs navegables, compartibles y con botón "atrás" del navegador
 * funcionando correctamente.
 */
export default function CoachLayout({ coachName }: { coachName: string }) {
  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="w-64 shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Panel del Coach</p>
          <p className="text-xs text-gray-500">{coachName}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <SidebarLink to="/athletes" icon={<Users size={16} />} label="Mis Atletas" />
          <SidebarLink to="/club" icon={<CalendarDays size={16} />} label="Planificación del Club" />
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Acá se monta la ruta activa: AthleteListView, AthleteDetailView o Club */}
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-blue-100/60"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
