import React, { useState, useEffect, useCallback } from "react";
import { Home, PawPrint, Stethoscope, Heart, Skull, Plus, Edit3, Trash2, ArrowLeft, Search, Check, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [modulo, setModulo] = useState("animais");
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("animais").select("*");
    if (data) setAnimais(data.sort((a, b) => a.sip.localeCompare(b.sip)));
    setLoading(false);
  }, []);

  useEffect(() => { if (session) loadAll(); }, [session, loadAll]);

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "animais", label: "Animais", icon: PawPrint },
    { id: "atendimentos", label: "Atendimentos", icon: Stethoscope },
    { id: "reproducao", label: "Reprodução", icon: Heart },
    { id: "necropsias", label: "Necropsias", icon: Skull },
  ];

  return (
    <div className="min-h-screen flex bg-[#F7F5F0]">
      <aside className="w-56 bg-[#1B3A54] text-white">
        <div className="p-5 font-bold border-b border-white/10">Biotério Central</div>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setModulo(item.id)} className={`w-full p-4 flex items-center gap-3 ${modulo === item.id ? "bg-[#4A7C7C]" : "hover:bg-white/5"}`}>
            <item.icon size={16} /> {item.label}
          </button>
        ))}
      </aside>
      <main className="flex-1 p-8">
        {modulo === "animais" ? <ModuloAnimais animais={animais} reload={loadAll} /> : <div className="text-gray-500">Módulo {modulo} em operação.</div>}
      </main>
    </div>
  );
}

function ModuloAnimais({ animais, reload }) {
  const [form, setForm] = useState(null);

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-lg font-bold uppercase">Mapeamento de Espécimes</h2>
        <button onClick={() => setForm({})} className="bg-[#1B3A54] text-white px-4 py-2 rounded">+ Cadastrar Animal</button>
      </div>

      {form && (
        <form className="bg-white p-6 rounded border shadow-sm mb-6 grid grid-cols-2 gap-4" onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("animais").upsert(form);
          if (error) alert("Erro: " + error.message);
          else { setForm(null); reload(); }
        }}>
          <input placeholder="SIP" className="border p-2" onChange={e => setForm({...form, sip: e.target.value})} />
          <input placeholder="Mãe ID" className="border p-2" onChange={e => setForm({...form, mae_id: e.target.value})} />
          <input placeholder="Pai ID" className="border p-2" onChange={e => setForm({...form, pai_id: e.target.value})} />
          <input placeholder="Protocolo CEUA" className="border p-2" onChange={e => setForm({...form, ceua_protocolo: e.target.value})} />
          <button type="submit" className="bg-green-600 text-white p-2 col-span-2 rounded">Salvar</button>
        </form>
      )}

      {animais.map(a => (
        <div key={a.sip} className="bg-white p-4 border rounded mb-2">{a.sip}</div>
      ))}
    </div>
  );
}
