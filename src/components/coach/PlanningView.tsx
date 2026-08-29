import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase'; // <-- AGREGAMOS AUTH
import { usePlanningStore } from '../../store/usePlanningStore';
import SeasonCalendar from './planning/SeasonCalendar';
import TrainingEditor from './planning/TrainingEditor';
import { Club } from '../../types/planning';
import { ChevronDown, Users, Plus, Menu, X, Shield, Pencil, Trash2 } from 'lucide-react';

export default function PlanningView() {
  const { clubs, setClubs, activeClubId, activeCategoryId, setActiveClub, setActiveCategory, selectedSession } = usePlanningStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [isAddingClub, setIsAddingClub] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [addingCategoryTo, setAddingCategoryTo] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [editingClubName, setEditingClubName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  const [clubToDelete, setClubToDelete] = useState<string | null>(null);
  const [catToDelete, setCatToDelete] = useState<{clubId: string, catId: string} | null>(null);

  // 1. FILTRAMOS CLUBES POR ENTRENADOR LOGUEADO
  useEffect(() => {
    async function fetchClubs() {
      const coachId = auth.currentUser?.uid;
      if (!coachId) return;

      const q = query(collection(db, "clubs"), where("coachId", "==", coachId));
      const snap = await getDocs(q);
      const loaded: Club[] = [];
      snap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Club));
      setClubs(loaded);
    }
    fetchClubs();
  }, [setClubs]);

  // 2. GUARDAMOS EL NUEVO CLUB CON EL ID DEL ENTRENADOR
  const submitClub = async () => {
    if (!newClubName.trim()) { setIsAddingClub(false); return; }
    const coachId = auth.currentUser?.uid;
    if (!coachId) return;

    const newRef = doc(collection(db, "clubs"));
    const newClub: any = { id: newRef.id, coachId: coachId, name: newClubName.trim(), categories: [] };
    
    await setDoc(newRef, newClub);
    setClubs([...clubs, newClub as Club]);
    setNewClubName("");
    setIsAddingClub(false);
  };

  const submitEditClub = async (clubId: string) => {
    if (!editingClubName.trim()) { setEditingClubId(null); return; }
    await updateDoc(doc(db, "clubs", clubId), { name: editingClubName.trim() });
    setClubs(clubs.map((c: Club) => c.id === clubId ? { ...c, name: editingClubName.trim() } : c));
    setEditingClubId(null);
  };

  const confirmDeleteClub = async () => {
    if (!clubToDelete) return;
    await deleteDoc(doc(db, "clubs", clubToDelete));
    setClubs(clubs.filter((c: Club) => c.id !== clubToDelete));
    if (activeClubId === clubToDelete) setActiveClub(null);
    setClubToDelete(null);
  };

  const submitCategory = async (clubId: string) => {
    if (!newCategoryName.trim()) { setAddingCategoryTo(null); return; }
    const newCat = { id: Date.now().toString(), clubId, name: newCategoryName.trim() };
    await updateDoc(doc(db, "clubs", clubId), { categories: arrayUnion(newCat) });
    setClubs(clubs.map((c: Club) => c.id === clubId ? { ...c, categories: [...c.categories, newCat] } : c));
    setNewCategoryName("");
    setAddingCategoryTo(null);
  };

  const submitEditCategory = async (clubId: string, catId: string) => {
    if (!editingCatName.trim()) { setEditingCatId(null); return; }
    const club = clubs.find((c: Club) => c.id === clubId);
    if (!club) return;
    const updatedCats = club.categories.map((cat: any) => cat.id === catId ? { ...cat, name: editingCatName.trim() } : cat);
    await updateDoc(doc(db, "clubs", clubId), { categories: updatedCats });
    setClubs(clubs.map((c: Club) => c.id === clubId ? { ...c, categories: updatedCats } : c));
    setEditingCatId(null);
  };

  const confirmDeleteCategory = async () => {
    if (!catToDelete) return;
    const { clubId, catId } = catToDelete;
    const club = clubs.find((c: Club) => c.id === clubId);
    if (!club) return;
    const updatedCats = club.categories.filter((cat: any) => cat.id !== catId);
    await updateDoc(doc(db, "clubs", clubId), { categories: updatedCats });
    setClubs(clubs.map((c: Club) => c.id === clubId ? { ...c, categories: updatedCats } : c));
    if (activeCategoryId === catId) setActiveCategory(null);
    setCatToDelete(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50 relative font-sans animate-in fade-in">
      {!selectedSession && (
        <div className="md:hidden p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 text-slate-800">
            <Shield size={20} className="text-blue-600" />
            <span className="font-black tracking-tight text-lg">Clubes</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setMobileMenuOpen(true);
                setIsAddingClub(true);
                setNewClubName("");
              }} 
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
              title="Agregar Nuevo Club"
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-[85%] max-w-[320px] md:w-72 bg-white md:bg-slate-50 border-r border-slate-200 flex-col shrink-0 h-full transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none flex
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        <div className="p-4 md:p-5 flex items-center justify-between border-b border-slate-200 bg-white md:bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <Shield size={20} className="text-blue-600" />
            <h2 className="font-black tracking-tight text-lg">Clubes</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setIsAddingClub(true); setNewClubName(""); }} 
              className="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 transition-colors p-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 text-xs px-2" 
              title="Nuevo Club"
            >
              <Plus size={14} /> Nuevo
            </button>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 bg-slate-100 p-1.5 rounded-lg hover:text-slate-800">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white md:bg-slate-50 pb-20 custom-scrollbar">
          
          {isAddingClub && (
            <div className="p-3 bg-white border border-blue-200 rounded-2xl shadow-sm mb-4 animate-in slide-in-from-top-2 duration-200">
              <label className="block text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1.5">Nombre del Club</label>
              <input 
                autoFocus type="text" value={newClubName} onChange={e => setNewClubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitClub()}
                placeholder="Ej: Club Atlético..."
                className="w-full text-sm bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-2.5 mb-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/10 transition-all"
              />
              <div className="flex gap-2">
                <button onClick={() => setIsAddingClub(false)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button onClick={submitClub} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm">Guardar</button>
              </div>
            </div>
          )}

          {clubs.length === 0 && !isAddingClub && (
            <div className="text-center mt-8 p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Shield size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-500">No hay clubes en tu radar. Creá el primero para empezar.</p>
            </div>
          )}
          
          {clubs.map((club: Club) => (
            <div key={club.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden transition-all">
              
              {clubToDelete === club.id ? (
                <div className="p-4 bg-red-50 text-center animate-in fade-in duration-200">
                  <p className="text-xs font-bold text-red-600 mb-3">¿Borrar este club y todo lo que contiene?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setClubToDelete(null)} className="flex-1 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg">Cancelar</button>
                    <button onClick={confirmDeleteClub} className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm">Borrar</button>
                  </div>
                </div>
              ) : editingClubId === club.id ? (
                <div className="p-3 bg-blue-50/50">
                  <input 
                    autoFocus type="text" value={editingClubName} onChange={e => setEditingClubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitEditClub(club.id)}
                    className="w-full text-sm bg-white border border-blue-200 text-slate-800 font-bold rounded-xl p-2.5 mb-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 transition-all"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingClubId(null)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg">Cancelar</button>
                    <button onClick={() => submitEditClub(club.id)} className="flex-1 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 p-1">
                  <button 
                    onClick={() => setActiveClub(club.id)}
                    className={`flex-1 flex items-center gap-2 px-3 py-3 md:py-2.5 text-sm rounded-xl transition-colors font-bold
                      ${activeClubId === club.id ? 'text-blue-700 bg-blue-50' : 'text-slate-700 hover:bg-slate-100'}
                    `}
                  >
                    <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${activeClubId === club.id ? 'rotate-0 text-blue-500' : '-rotate-90 text-slate-400'}`} />
                    <span className="truncate text-left">{club.name}</span>
                  </button>
                  
                  {activeClubId === club.id && (
                    <div className="flex items-center shrink-0 pr-1">
                      <button onClick={() => { setEditingClubId(club.id); setEditingClubName(club.name); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Editar Club"><Pencil size={15}/></button>
                      <button onClick={() => setClubToDelete(club.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar Club"><Trash2 size={15}/></button>
                      <button onClick={() => { setAddingCategoryTo(club.id); setNewCategoryName(""); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors ml-1" title="Agregar Categoría"><Plus size={16}/></button>
                    </div>
                  )}
                </div>
              )}

              <div className={`grid transition-all duration-300 ease-in-out ${activeClubId === club.id && clubToDelete !== club.id && editingClubId !== club.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="px-3 pb-3 pt-1 space-y-1">
                    {club.categories.length === 0 && addingCategoryTo !== club.id && (
                      <p className="text-xs text-slate-400 italic px-3 py-2">Sin categorías cargadas</p>
                    )}
                    
                    {club.categories.map((cat: any) => (
                      <div key={cat.id}>
                        {catToDelete?.catId === cat.id ? (
                          <div className="p-3 bg-red-50 rounded-xl my-1 border border-red-100 text-center animate-in fade-in">
                            <p className="text-[11px] font-bold text-red-600 mb-2">¿Eliminar categoría?</p>
                            <div className="flex gap-2">
                              <button onClick={() => setCatToDelete(null)} className="flex-1 py-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md">Cancelar</button>
                              <button onClick={confirmDeleteCategory} className="flex-1 py-1 text-[11px] font-bold text-white bg-red-600 rounded-md">Borrar</button>
                            </div>
                          </div>
                        ) : editingCatId === cat.id ? (
                          <div className="p-2 bg-slate-100 rounded-xl my-1 border border-slate-200 animate-in fade-in">
                            <input 
                              autoFocus type="text" value={editingCatName} onChange={e => setEditingCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitEditCategory(club.id, cat.id)}
                              className="w-full text-xs bg-white border border-slate-300 text-slate-800 font-bold rounded-lg p-2 mb-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingCatId(null)} className="flex-1 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg">Cancelar</button>
                              <button onClick={() => submitEditCategory(club.id, cat.id)} className="flex-1 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded-lg">Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center group">
                            <button
                              onClick={() => { setActiveCategory(cat.id); setMobileMenuOpen(false); }}
                              className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-all duration-200
                                ${activeCategoryId === cat.id 
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/20 font-bold transform scale-[1.02]' 
                                  : 'text-slate-600 hover:bg-slate-100 font-medium'
                                }
                              `}
                            >
                              <Users size={16} className={activeCategoryId === cat.id ? 'text-blue-200' : 'text-slate-400'} />
                              <span className="truncate text-left">{cat.name}</span>
                            </button>
                            
                            {(activeCategoryId === cat.id) && (
                              <div className="flex items-center pr-1 shrink-0">
                                <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} className={`p-2 transition-colors ${activeCategoryId === cat.id ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}><Pencil size={13}/></button>
                                <button onClick={() => setCatToDelete({clubId: club.id, catId: cat.id})} className={`p-2 transition-colors ${activeCategoryId === cat.id ? 'text-blue-100 hover:text-red-200' : 'text-slate-400 hover:text-red-500'}`}><Trash2 size={13}/></button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {addingCategoryTo === club.id && (
                      <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-xl mt-2 animate-in slide-in-from-top-2 duration-200">
                        <input 
                          autoFocus type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitCategory(club.id)}
                          placeholder="Ej: Sub 16 Femenino"
                          className="w-full text-xs bg-white border border-slate-200 text-slate-800 font-bold rounded-lg p-2 mb-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/10 transition-all"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setAddingCategoryTo(null)} className="flex-1 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                          <button onClick={() => submitCategory(club.id)} className="flex-1 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Crear</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden h-full bg-slate-50/50">
        {selectedSession ? <TrainingEditor /> : <SeasonCalendar />}
      </div>
    </div>
  );
}