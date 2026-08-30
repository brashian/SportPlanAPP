import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { usePlanningStore } from '../../store/usePlanningStore';
import SeasonCalendar from './planning/SeasonCalendar';
import TrainingEditor from './planning/TrainingEditor';
import { Club } from '../../types/planning';
import { ChevronDown, Users, Plus, Menu, X, Shield, Pencil, Trash2 } from 'lucide-react';

const tokens = {
  "--ink-950": "#0A0E14", "--ink-900": "#10161F", "--ink-850": "#161D29", "--ink-800": "#1D2530",
  "--line-800": "#232B37", "--mist-500": "#6B7684", "--mist-300": "#9AA4B2", "--mist-100": "#E7EAEE",
  "--signal-500": "#FF5A1F", "--signal-600": "#E64A0F", "--pulse-500": "#34D399",
} as React.CSSProperties;

const LogoPlaceholder = () => (
  <div className="flex items-center gap-2 text-[var(--mist-100)]">
    <Shield size={24} className="text-[var(--signal-500)]" />
    <span className="font-display font-bold text-2xl tracking-wide">CLUBES</span>
  </div>
);

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

  const submitClub = async () => {
    if (!newClubName.trim()) { setIsAddingClub(false); return; }
    const coachId = auth.currentUser?.uid;
    if (!coachId) return;
    const newRef = doc(collection(db, "clubs"));
    const newClub: any = { id: newRef.id, coachId: coachId, name: newClubName.trim(), categories: [] };
    await setDoc(newRef, newClub);
    setClubs([...clubs, newClub as Club]);
    setNewClubName(""); setIsAddingClub(false);
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
    setNewCategoryName(""); setAddingCategoryTo(null);
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
    <div style={tokens} className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-[var(--ink-950)] text-[var(--mist-100)] relative font-sans selection:bg-[var(--signal-500)]/30">
      
      {!selectedSession && (
        <div className="md:hidden p-4 border-b border-[var(--line-800)] bg-[var(--ink-900)]/80 backdrop-blur-md flex justify-between items-center shrink-0 z-20 relative">
          <LogoPlaceholder />
          <div className="flex items-center gap-2">
            <button onClick={() => { setMobileMenuOpen(true); setIsAddingClub(true); setNewClubName(""); }} className="p-2 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] rounded-xl transition-colors shadow-sm active:scale-95"><Plus size={20} /></button>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-xl transition-colors text-[var(--mist-100)] active:scale-95"><Menu size={24} /></button>
          </div>
        </div>
      )}

      {mobileMenuOpen && <div className="md:hidden fixed inset-0 bg-[var(--ink-950)]/80 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />}

      <div className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:static inset-y-0 left-0 z-50 w-[85%] max-w-[320px] md:w-80 bg-[var(--ink-900)] border-r border-[var(--line-800)] flex-col shrink-0 h-full transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none flex`}>
        <div className="p-5 flex items-center justify-between border-b border-[var(--line-800)] bg-[var(--ink-900)] shrink-0">
          <LogoPlaceholder />
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsAddingClub(true); setNewClubName(""); }} className="text-[var(--signal-500)] hover:text-[var(--ink-950)] bg-[var(--signal-500)]/10 hover:bg-[var(--signal-500)] transition-colors p-1.5 rounded-lg shadow-sm font-bold flex items-center gap-1 text-xs px-2 active:scale-95" title="Nuevo Club"><Plus size={14} /> Nuevo</button>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-[var(--mist-500)] bg-[var(--ink-800)] p-1.5 rounded-lg hover:text-[var(--mist-100)] active:scale-95"><X size={18} /></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 bg-[var(--ink-900)] custom-scrollbar">
          {isAddingClub && (
            <div className="p-4 bg-[var(--ink-850)] border border-[var(--signal-500)]/30 rounded-2xl shadow-sm mb-4">
              <label className="block text-[10px] font-bold text-[var(--signal-500)] uppercase tracking-wider mb-2">Nombre del Club</label>
              <input autoFocus type="text" value={newClubName} onChange={e => setNewClubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitClub()} placeholder="Ej: Club Atlético..." className="w-full text-sm bg-[var(--ink-950)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3 mb-3 outline-none focus:border-[var(--signal-500)] focus:ring-1 focus:ring-[var(--signal-500)] transition-all placeholder-[var(--mist-500)]" />
              <div className="flex gap-2">
                <button onClick={() => setIsAddingClub(false)} className="flex-1 py-2 text-xs font-bold text-[var(--mist-100)] bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-xl transition-all active:scale-95">Cancelar</button>
                <button onClick={submitClub} className="flex-1 py-2 text-xs font-bold text-[var(--ink-950)] bg-[var(--signal-500)] hover:bg-[var(--signal-600)] rounded-xl transition-all shadow-sm active:scale-95">Guardar</button>
              </div>
            </div>
          )}

          {clubs.length === 0 && !isAddingClub && (
            <div className="text-center mt-8 p-6 border border-[var(--line-800)] rounded-2xl bg-[var(--ink-850)]">
              <Shield size={32} className="mx-auto text-[var(--mist-500)] mb-2" />
              <p className="text-xs font-medium text-[var(--mist-500)]">No hay clubes en tu radar. Creá el primero.</p>
            </div>
          )}
          
          {clubs.map((club: Club) => (
            <div key={club.id} className="bg-[var(--ink-850)] border border-[var(--line-800)] rounded-2xl shadow-sm overflow-hidden transition-all">
              {clubToDelete === club.id ? (
                <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-center animate-in fade-in">
                  <p className="text-xs font-bold text-red-400 mb-3">¿Borrar este club y todo lo que contiene?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setClubToDelete(null)} className="flex-1 py-2 text-xs font-bold text-[var(--mist-100)] bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-lg active:scale-95">Cancelar</button>
                    <button onClick={confirmDeleteClub} className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm active:scale-95">Borrar</button>
                  </div>
                </div>
              ) : editingClubId === club.id ? (
                <div className="p-3 bg-[var(--signal-500)]/10 border-b border-[var(--signal-500)]/20">
                  <input autoFocus type="text" value={editingClubName} onChange={e => setEditingClubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitEditClub(club.id)} className="w-full text-sm bg-[var(--ink-950)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-2.5 mb-3 outline-none focus:border-[var(--signal-500)] transition-all" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingClubId(null)} className="flex-1 py-1.5 text-xs font-bold text-[var(--mist-100)] bg-[var(--ink-800)] hover:bg-[var(--line-800)] rounded-lg active:scale-95">Cancelar</button>
                    <button onClick={() => submitEditClub(club.id)} className="flex-1 py-1.5 text-xs font-bold text-[var(--ink-950)] bg-[var(--signal-500)] hover:bg-[var(--signal-600)] rounded-lg active:scale-95">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 p-1">
                  <button onClick={() => setActiveClub(club.id)} className={`flex-1 flex items-center gap-2 px-3 py-3 md:py-2.5 text-sm rounded-xl transition-all font-bold ${activeClubId === club.id ? 'text-[var(--signal-500)] bg-[var(--signal-500)]/10' : 'text-[var(--mist-100)] hover:bg-[var(--ink-800)]'}`}>
                    <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${activeClubId === club.id ? 'rotate-0 text-[var(--signal-500)]' : '-rotate-90 text-[var(--mist-500)]'}`} />
                    <span className="truncate text-left">{club.name}</span>
                  </button>
                  {activeClubId === club.id && (
                    <div className="flex items-center shrink-0 pr-1">
                      <button onClick={() => { setEditingClubId(club.id); setEditingClubName(club.name); }} className="p-2 text-[var(--mist-500)] hover:text-[var(--signal-500)] hover:bg-[var(--ink-800)] rounded-lg transition-colors active:scale-95"><Pencil size={15}/></button>
                      <button onClick={() => setClubToDelete(club.id)} className="p-2 text-[var(--mist-500)] hover:text-red-400 hover:bg-[var(--ink-800)] rounded-lg transition-colors active:scale-95"><Trash2 size={15}/></button>
                      <button onClick={() => { setAddingCategoryTo(club.id); setNewCategoryName(""); }} className="p-2 text-[var(--ink-950)] hover:bg-[var(--signal-600)] bg-[var(--signal-500)] rounded-lg transition-colors ml-1 active:scale-95"><Plus size={16}/></button>
                    </div>
                  )}
                </div>
              )}

              <div className={`grid transition-all duration-300 ease-in-out ${activeClubId === club.id && clubToDelete !== club.id && editingClubId !== club.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="px-3 pb-3 pt-1 space-y-1">
                    {club.categories.length === 0 && addingCategoryTo !== club.id && <p className="text-xs text-[var(--mist-500)] italic px-3 py-2">Sin categorías cargadas</p>}
                    {club.categories.map((cat: any) => (
                      <div key={cat.id}>
                        {catToDelete?.catId === cat.id ? (
                          <div className="p-3 bg-red-500/10 rounded-xl my-1 border border-red-500/20 text-center">
                            <p className="text-[11px] font-bold text-red-400 mb-2">¿Eliminar categoría?</p>
                            <div className="flex gap-2">
                              <button onClick={() => setCatToDelete(null)} className="flex-1 py-1.5 text-[11px] font-bold text-[var(--mist-100)] bg-[var(--ink-800)] rounded-md">Cancelar</button>
                              <button onClick={confirmDeleteCategory} className="flex-1 py-1.5 text-[11px] font-bold text-white bg-red-600 rounded-md">Borrar</button>
                            </div>
                          </div>
                        ) : editingCatId === cat.id ? (
                          <div className="p-2 bg-[var(--ink-800)] rounded-xl my-1 border border-[var(--line-800)]">
                            <input autoFocus type="text" value={editingCatName} onChange={e => setEditingCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitEditCategory(club.id, cat.id)} className="w-full text-xs bg-[var(--ink-950)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-lg p-2.5 mb-2 outline-none focus:border-[var(--signal-500)]" />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingCatId(null)} className="flex-1 py-1.5 text-[11px] font-bold text-[var(--mist-100)] bg-[var(--ink-900)] rounded-lg">Cancelar</button>
                              <button onClick={() => submitEditCategory(club.id, cat.id)} className="flex-1 py-1.5 text-[11px] font-bold text-[var(--ink-950)] bg-[var(--signal-500)] rounded-lg">Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center group">
                            <button onClick={() => { setActiveCategory(cat.id); setMobileMenuOpen(false); }} className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-all duration-200 ${activeCategoryId === cat.id ? 'bg-[var(--signal-500)] text-[var(--ink-950)] shadow-md font-bold' : 'text-[var(--mist-300)] hover:bg-[var(--ink-800)] font-medium'}`}>
                              <Users size={16} className={activeCategoryId === cat.id ? 'text-[var(--ink-950)]' : 'text-[var(--mist-500)]'} />
                              <span className="truncate text-left">{cat.name}</span>
                            </button>
                            {(activeCategoryId === cat.id) && (
                              <div className="flex items-center pr-1 shrink-0">
                                <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} className={`p-2 rounded-lg transition-colors active:scale-95 ${activeCategoryId === cat.id ? 'text-[var(--ink-900)] hover:text-white' : 'text-[var(--mist-500)] hover:text-[var(--signal-500)] hover:bg-[var(--ink-800)]'}`}><Pencil size={13}/></button>
                                <button onClick={() => setCatToDelete({clubId: club.id, catId: cat.id})} className={`p-2 rounded-lg transition-colors active:scale-95 ${activeCategoryId === cat.id ? 'text-[var(--ink-900)] hover:text-white' : 'text-[var(--mist-500)] hover:text-red-400 hover:bg-[var(--ink-800)]'}`}><Trash2 size={13}/></button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {addingCategoryTo === club.id && (
                      <div className="p-3 bg-[var(--signal-500)]/10 border border-[var(--signal-500)]/20 rounded-xl mt-2">
                        <input autoFocus type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitCategory(club.id)} placeholder="Ej: Sub 16 Femenino" className="w-full text-xs bg-[var(--ink-950)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-lg p-2.5 mb-2 outline-none focus:border-[var(--signal-500)]" />
                        <div className="flex gap-2">
                          <button onClick={() => setAddingCategoryTo(null)} className="flex-1 py-1.5 text-[11px] font-bold text-[var(--mist-100)] bg-[var(--ink-800)] rounded-lg">Cancelar</button>
                          <button onClick={() => submitCategory(club.id)} className="flex-1 py-1.5 text-[11px] font-bold text-[var(--ink-950)] bg-[var(--signal-500)] rounded-lg">Crear</button>
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

      <div className="flex-1 relative overflow-hidden h-full z-10 bg-[var(--ink-950)]">
        {selectedSession ? <TrainingEditor /> : <SeasonCalendar />}
      </div>
    </div>
  );
}