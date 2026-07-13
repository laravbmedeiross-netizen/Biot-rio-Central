import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronRight, Home, PawPrint, Stethoscope, Heart, Skull, LogOut, Edit3, Calendar, ArrowLeft, Trash2, Check, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// Mantenha todas as suas constantes originais aqui (LINHAGENS, MODULOS, CHECKBOXES, etc.)
const LINHAGENS = ["Wistar", "Swiss", "C57BL/6", "BALB/c"];
const MODULOS = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "animais", label: "Animais", icon: PawPrint },
  { id: "atendimentos", label: "Atendimentos", icon: Stethoscope },
  { id: "reproducao", label: "Reprodução", icon: Heart },
  { id: "necropsias", label: "Necropsias", icon: Skull },
];

export default function App() {
  const [modulo, setModulo] = useState("dashboard");
  const [session, setSession] = useState(undefined);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("animais").select("*");
    if (data) setAnimais(data.sort((x, y) => (x.sip || "").localeCompare(y.sip || "")));
    setLoading(false);
  }, []);

  useEffect(() => { if (session) loadAll(); }, [session, loadAll]);

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  return (
    <div className="min-h-screen flex bg-[#F7F5F0]">
      <aside className="w-56 bg-[#1B3A54] text-white flex flex-col">
        <div className="p-5 font-bold border-b border-white/10">Biotério Central</div>
        {MODULOS.map(m => (
          <button key={m.id} onClick={() => setModulo(m.id)} className={`w-full p-4 flex items-center gap-3 ${modulo === m.id ? "bg-[#4A7C7C]" : "hover:bg-white/5"}`}>
            <m.icon size={16} /> {m.label}
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
        <form className="bg-white p-6 border rounded shadow-sm mb-6 grid grid-cols-2 gap-4" onSubmit={async (e) => {
          e.preventDefault();
          // Mapeamento correto para as colunas que você criou
          const payload = {
            ...form,
            mae_id: form.mae_id || null,
            pai_id: form.pai_id || null,
            responsavel_tecnico: form.responsavel_tecnico || null,
            ceua_protocolo: form.ceua_protocolo || null
          };
          const { error } = await supabase.from("animais").upsert(payload);
          if (error) alert("Erro ao salvar: " + error.message);
          else { setForm(null); reload(); }
        }}>
          <input className="border p-2" placeholder="SIP" onChange={e => setForm({...form, sip: e.target.value})} />
          <input className="border p-2" placeholder="Mãe ID" onChange={e => setForm({...form, mae_id: e.target.value})} />
          <input className="border p-2" placeholder="Pai ID" onChange={e => setForm({...form, pai_id: e.target.value})} />
          <input className="border p-2" placeholder="Protocolo CEUA" onChange={e => setForm({...form, ceua_protocolo: e.target.value})} />
          <button type="submit" className="bg-green-600 text-white p-2 col-span-2 rounded">Salvar</button>
        </form>
      )}

      {animais.map(a => (
        <div key={a.sip} className="bg-white p-4 border rounded mb-2 flex justify-between">
          <span>{a.sip}</span>
        </div>
      ))}
    </div>
  );
}
