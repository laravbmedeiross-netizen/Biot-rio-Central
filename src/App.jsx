import React, { useState, useEffect, useCallback } from "react";
import { Home, PawPrint, Stethoscope, Heart, Skull, Plus, Edit3, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// Mantenha aqui as suas constantes (LINHAGENS, MODULOS, etc.) como estavam antes

export default function App() {
  const [session, setSession] = useState(undefined);
  const [modulo, setModulo] = useState("animais");
  const [animais, setAnimais] = useState([]);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const loadAll = useCallback(async () => {
    const { data } = await supabase.from("animais").select("*");
    if (data) setAnimais(data);
  }, []);

  useEffect(() => { if (session) loadAll(); }, [session, loadAll]);

  if (!session) return <Login onLogin={setSession} />;

  return (
    <div className="min-h-screen flex bg-[#F7F5F0]">
      <aside className="w-56 bg-[#1B3A54] text-white">
        <div className="p-4 font-bold border-b border-white/10">Biotério Central</div>
        {["dashboard", "animais", "atendimentos", "reproducao", "necropsias"].map(m => (
          <button key={m} onClick={() => setModulo(m)} className={`w-full p-4 capitalize text-left ${modulo === m ? "bg-[#4A7C7C]" : ""}`}>
            {m}
          </button>
        ))}
      </aside>
      <main className="flex-1 p-8">
        {modulo === "animais" ? (
          <ModuloAnimais animais={animais} reload={loadAll} />
        ) : (
          <div className="text-gray-500">Módulo de {modulo} carregado com sucesso.</div>
        )}
      </main>
    </div>
  );
}

function ModuloAnimais({ animais, reload }) {
  const [form, setForm] = useState(null);

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold">Mapeamento de Espécimes</h2>
        <button onClick={() => setForm({})} className="bg-[#1B3A54] text-white px-3 py-1 rounded">+ Novo</button>
      </div>

      {form && (
        <form className="bg-white p-4 border rounded mb-4" onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("animais").upsert(form);
          if (error) alert(error.message);
          else { setForm(null); reload(); }
        }}>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="SIP" className="border p-1" onChange={e => setForm({...form, sip: e.target.value})} />
            <input placeholder="Protocolo CEUA" className="border p-1" onChange={e => setForm({...form, ceua_protocolo: e.target.value})} />
          </div>
          <button className="mt-2 bg-green-600 text-white px-3 py-1 rounded">Salvar</button>
        </form>
      )}

      {animais.map(a => (
        <div key={a.sip} className="bg-white p-2 border mb-1 flex justify-between">
          {a.sip}
        </div>
      ))}
    </div>
  );
}
