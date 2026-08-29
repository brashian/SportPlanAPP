import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Users, Calendar, BookOpen, LogOut, Menu, X, Dumbbell } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

export default function CoachLayout({ coachName }: { coachName: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navLinks = [
    { to: '/athletes', icon: Users, label: 'Mis Atletas' },
    { to: '/planificacion', icon: Calendar, label: 'Clubes' },
    { to: '/library', icon: BookOpen, label: 'Biblioteca' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2 font-black text-xl tracking-tight">
          <Dumbbell className="text-blue-500" /> SportPlan
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-800 rounded-lg">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-20 flex items-center gap-3 px-8 font-black text-2xl tracking-tight border-b border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Dumbbell size={20} />
          </div>
          SportPlan
        </div>

        <div className="p-6 border-b border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Entrenador</p>
          <p className="font-bold text-slate-200 truncate">{coachName}</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
              `}
            >
              <link.icon size={20} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all font-bold"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}