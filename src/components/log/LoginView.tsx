import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Mail, Lock, Loader2, AlertCircle, User, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';

const tokens = {
  "--ink-950": "#0A0E14",
  "--ink-900": "#10161F",
  "--ink-850": "#161D29",
  "--ink-800": "#1D2530",
  "--line-800": "#232B37",
  "--mist-500": "#6B7684",
  "--mist-300": "#9AA4B2",
  "--mist-100": "#E7EAEE",
  "--signal-500": "#FF5A1F",
  "--signal-600": "#E64A0F",
  "--pulse-500": "#34D399",
} as React.CSSProperties;

type AuthMode = 'login' | 'register' | 'forgot' | 'pending';

export default function LoginView() {
  const [mode, setMode] = useState<AuthMode>('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'athlete' | 'coach'>('athlete');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const coachRef = doc(db, 'coaches', userCredential.user.uid);
      const coachSnap = await getDoc(coachRef);
      if (coachSnap.exists() && coachSnap.data().isApproved === false) {
        await signOut(auth); setMode('pending'); setIsLoading(false); return;
      }
    } catch (err: any) { setError('Credenciales incorrectas. Verificá tu email y contraseña.'); setIsLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      if (role === 'coach') {
        await setDoc(doc(db, 'coaches', uid), { id: uid, name, email, role: 'coach', isApproved: false, athleteIds: [] });
        await signOut(auth); setMode('pending');
      } else {
        await setDoc(doc(db, 'athletes', uid), { id: uid, name, email, role: 'athlete', coachId: '', macrocycles: [] });
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('El email ya está registrado.');
      else if (err.code === 'auth/weak-password') setError('La contraseña debe tener al menos 6 caracteres.');
      else setError('Hubo un error al crear la cuenta.');
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccessMsg(''); setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email); setSuccessMsg('Te enviamos un enlace de recuperación a tu email.');
    } catch (err: any) { setError('No se pudo enviar el correo. Verificá que el email sea correcto.'); } finally { setIsLoading(false); }
  };

  const switchMode = (newMode: AuthMode) => { setMode(newMode); setError(''); setSuccessMsg(''); setPassword(''); };

  return (
    <div style={tokens} className="min-h-screen bg-[var(--ink-950)] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[var(--signal-500)]/30">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[var(--signal-500)]/20 rounded-full blur-[120px] pointer-events-none will-change-transform"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--pulse-500)]/10 rounded-full blur-[120px] pointer-events-none will-change-transform"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[var(--ink-900)]/80 backdrop-blur-xl border border-[var(--line-800)] rounded-[2rem] p-8 sm:p-10 shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-500">
          
          <div className="flex flex-col items-center mb-8">
            {/* LOGO GIGANTE Y LIMPIO */}
            <div className="w-32 h-24 sm:h-32 mb-2 flex items-center justify-center">
              <BrandLogo className="w-full h-full drop-shadow-lg" />
            </div>
            <p className="text-[var(--mist-500)] mt-2 font-medium tracking-widest uppercase text-[10px]">Plataforma de Rendimiento</p>
          </div>

          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in shake duration-300"><AlertCircle className="text-red-400 shrink-0" size={20} /><p className="text-sm text-red-400 font-medium leading-tight">{error}</p></div>}
          {successMsg && <div className="mb-6 p-4 bg-[var(--pulse-500)]/10 border border-[var(--pulse-500)]/20 rounded-xl flex items-center gap-3 animate-in fade-in duration-300"><CheckCircle2 className="text-[var(--pulse-500)] shrink-0" size={20} /><p className="text-sm text-[var(--pulse-500)] font-medium leading-tight">{successMsg}</p></div>}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-widest mb-2 ml-1">Email de Acceso</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="text-[var(--mist-500)]" size={18} /></div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl text-[var(--mist-100)] placeholder-[var(--mist-500)] focus:outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all" placeholder="tu@email.com" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2 ml-1 mr-1">
                  <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-widest">Contraseña</label>
                  <button type="button" onClick={() => switchMode('forgot')} className="text-[10px] font-bold text-[var(--signal-500)] hover:text-[var(--signal-600)] transition-colors focus-visible:outline-none focus-visible:underline">¿Olvidaste tu clave?</button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="text-[var(--mist-500)]" size={18} /></div>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl text-[var(--mist-100)] placeholder-[var(--mist-500)] focus:outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-black py-4 rounded-xl transition-all shadow-lg shadow-[var(--signal-500)]/20 active:scale-95 flex items-center justify-center gap-2 mt-6">{isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Ingresar a la Plataforma'}</button>
              <div className="text-center pt-4"><p className="text-sm text-[var(--mist-500)] font-medium">¿No tenés cuenta? <button type="button" onClick={() => switchMode('register')} className="text-[var(--mist-100)] font-bold hover:text-[var(--signal-500)] transition-colors focus-visible:outline-none focus-visible:underline">Registrate acá</button></p></div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="bg-[var(--ink-950)] p-1 rounded-xl border border-[var(--line-800)] flex">
                <button type="button" onClick={() => setRole('athlete')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${role === 'athlete' ? 'bg-[var(--ink-800)] text-[var(--mist-100)] shadow-sm' : 'text-[var(--mist-500)] hover:text-[var(--mist-300)]'}`}>Soy Atleta</button>
                <button type="button" onClick={() => setRole('coach')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${role === 'coach' ? 'bg-[var(--signal-500)] text-[var(--ink-950)] shadow-sm' : 'text-[var(--mist-500)] hover:text-[var(--mist-300)]'}`}>Soy Entrenador</button>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-widest mb-2 ml-1">Nombre Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="text-[var(--mist-500)]" size={18} /></div>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl text-[var(--mist-100)] placeholder-[var(--mist-500)] focus:outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all" placeholder="Nombre y Apellido" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-widest mb-2 ml-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="text-[var(--mist-500)]" size={18} /></div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl text-[var(--mist-100)] placeholder-[var(--mist-500)] focus:outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all" placeholder="tu@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mist-500)] uppercase tracking-widest mb-2 ml-1">Crear Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="text-[var(--mist-500)]" size={18} /></div>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl text-[var(--mist-100)] placeholder-[var(--mist-500)] focus:outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all" placeholder="Mínimo 6 caracteres" />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-black py-4 rounded-xl transition-all shadow-lg shadow-[var(--signal-500)]/20 active:scale-95 flex items-center justify-center gap-2 mt-6">{isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Crear Cuenta'}</button>
              <div className="text-center pt-4"><button type="button" onClick={() => switchMode('login')} className="text-sm font-bold text-[var(--mist-300)] hover:text-[var(--mist-100)] transition-colors focus-visible:outline-none focus-visible:underline flex items-center justify-center gap-2 w-full"><ArrowLeft size={16}/> Ya tengo cuenta</button></div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-left-4">
              <p className="text-sm text-[var(--mist-300)] font-medium text-center mb-6">Ingresá tu correo electrónico y te enviaremos un enlace para recuperar tu contraseña.</p>
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="text-[var(--mist-500)]" size={18} /></div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl text-[var(--mist-100)] placeholder-[var(--mist-500)] focus:outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all" placeholder="tu@email.com" />
                </div>
              </div>
              <button type="submit" disabled={isLoading || !email} className="w-full bg-[var(--mist-100)] hover:bg-white text-[var(--ink-950)] font-black py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 disabled:opacity-50">{isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Enlace'}</button>
              <div className="text-center pt-4"><button type="button" onClick={() => switchMode('login')} className="text-sm font-bold text-[var(--mist-300)] hover:text-[var(--mist-100)] transition-colors flex items-center justify-center gap-2 w-full"><ArrowLeft size={16}/> Volver al Login</button></div>
            </form>
          )}

          {mode === 'pending' && (
            <div className="text-center space-y-5 animate-in zoom-in-95 fade-in duration-500">
              <div className="w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><ShieldAlert size={36} /></div>
              <h2 className="font-display text-3xl font-bold text-[var(--mist-100)] tracking-tight">Cuenta en Revisión</h2>
              <p className="text-sm sm:text-base font-medium text-[var(--mist-300)] leading-relaxed pb-4">Tu cuenta de <strong className="text-white">Entrenador</strong> ha sido registrada, pero requiere validación manual por parte del equipo.</p>
              <div className="p-4 bg-[var(--ink-950)] border border-[var(--line-800)] rounded-xl text-xs text-[var(--mist-500)]">Contactá a un administrador para que habilite tu acceso al panel.</div>
              <button type="button" onClick={() => switchMode('login')} className="w-full bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] font-bold py-4 rounded-xl transition-all active:scale-95 mt-6 border border-[var(--line-800)]">Entendido, volver al inicio</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}