import React, { useState } from 'react';
import { auth, db } from '../../firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function LoginView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'athlete'>('athlete');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // INICIAR SESIÓN
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // REGISTRARSE
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Guardar el rol en Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          role: role,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h1>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500" />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soy un...</label>
              <select value={role} onChange={e => setRole(e.target.value as 'coach' | 'athlete')} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500 bg-white">
                <option value="athlete">Atleta</option>
                <option value="coach">Entrenador (Coach)</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
            {isLoading ? 'Cargando...' : (isLogin ? 'Entrar' : 'Registrarme')}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold ml-1 hover:underline">
            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}