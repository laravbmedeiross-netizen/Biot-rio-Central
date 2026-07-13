import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronRight, Home, PawPrint, Stethoscope, Heart, Skull, LogOut, Edit3, Calendar, ArrowLeft, Trash2, Check, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// ... [MANTENHA AQUI todas as suas constantes originais: LINHAGENS, MODULOS, CHECKBOXES_PELE_PELAGEM, etc.] ...

export default function App() {
  const [modulo, setModulo] = useState("dashboard");
  const [session, setSession] = useState(undefined);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animalParaEditar, setAnimalParaEditar] = useState(null);

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

  if (!session) return <Login onLogin={setSession} />;

  return (
    <div className="min-h-screen flex bg-[#F7F5F0]">
      <aside className="w-56 bg-[#1B3A54] text-white flex flex-col">
        {/* ... [MANTENHA AQUI seu menu lateral original] ... */}
        {MODULOS.map(m => (
            <button key={m.id} onClick={() => setModulo(m.id)} className={`w-full p-4 flex items-center gap-3 ${modulo === m.id ? "bg-[#4A7C7C]" : "hover:bg-white/5"}`}>
                <m.icon size={16} /> {m.label}
            </button>
        ))}
      </aside>
      <main className="flex-1 p-8">
        {modulo === "animais" && (
            <ModuloAnimais 
                animais={animais} 
                reload={loadAll} 
                forcarEdicao={animalParaEditar} 
                limparForcarEdicao={() => setAnimalParaEditar(null)} 
            />
        )}
        {/* ... [ADICIONE AQUI os outros módulos como estavam: atendimentos, reproducao, necropsias] ... */}
      </main>
    </div>
  );
}

function ModuloAnimais({ animais, reload, forcarEdicao, limparForcarEdicao }) {
  const [form, setForm] = useState(null);

  useEffect(() => { if (forcarEdicao) setForm(forcarEdicao); }, [forcarEdicao]);

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-lg font-bold uppercase">Mapeamento de Espécimes</h2>
        <button onClick={() => setForm({})} className="bg-[#1B3A54] text-white px-4 py-2 rounded">+ Cadastrar Animal</button>
      </div>

      {form && (
        <form className="bg-white p-6 border rounded shadow-sm mb-6" onSubmit={async (e) => {
          e.preventDefault();
          // Payload com as chaves exatas do seu banco
          const payload = {
              ...form,
              mae_id: form.mae_id || null,
              pai_id: form.pai_id || null,
              responsavel_tecnico: form.responsavel_tecnico || null,
              ceua_protocolo: form.ceua_protocolo || null
          };
          const { error } = await supabase.from("animais").upsert(payload);
          if (error) alert("Erro: " + error.message);
          else { setForm(null); limparForcarEdicao(); reload(); }
        }}>
          {/* ... [MANTENHA SEUS INPUTS ORIGINAIS AQUI] ... */}
          <input className="border p-2" placeholder="SIP" value={form.sip || ""} onChange={e => setForm({...form, sip: e.target.value})} />
          <input className="border p-2" placeholder="Mãe ID" value={form.mae_id || ""} onChange={e => setForm({...form, mae_id: e.target.value})} />
          <input className="border p-2" placeholder="Pai ID" value={form.pai_id || ""} onChange={e => setForm({...form, pai_id: e.target.value})} />
          <input className="border p-2" placeholder="Protocolo CEUA" value={form.ceua_protocolo || ""} onChange={e => setForm({...form, ceua_protocolo: e.target.value})} />
          <button type="submit" className="bg-green-600 text-white p-2">Salvar</button>
        </form>
      )}

      {animais.map(a => (
        <div key={a.sip} className="bg-white p-4 border rounded mb-2 flex justify-between">
            {a.sip} - {a.linhagem}
            <button onClick={() => setForm(a)} className="text-blue-600">Editar</button>
        </div>
      ))}
    </div>
  );
}
