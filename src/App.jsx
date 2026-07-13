import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronRight, Home, PawPrint, Stethoscope, Heart, Skull, LogOut, Edit3, Calendar, ArrowLeft, Trash2, Check, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

const LINHAGENS = ["Wistar", "Swiss", "C57BL/6", "BALB/c"];
const MODULOS = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "animais", label: "Animais", icon: PawPrint },
  { id: "atendimentos", label: "Atendimentos", icon: Stethoscope },
  { id: "reproducao", label: "Reprodução", icon: Heart },
  { id: "necropsias", label: "Necropsias", icon: Skull },
];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [modulo, setModulo] = useState("dashboard");
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animalParaEditar, setAnimalParaEditar] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const loadAnimais = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("animais").select("*");
    if (data) setAnimais(data.sort((a, b) => a.sip.localeCompare(b.sip)));
    setLoading(false);
  }, []);

  useEffect(() => { if (session) loadAnimais(); }, [session, loadAnimais]);

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  return (
    <div className="min-h-screen flex bg-[#F7F5F0] text-gray-800 font-sans">
      <aside className="w-56 bg-[#1B3A54] text-[#E9E5D8] flex flex-col">
        <div className="p-5 bg-[#15293D]"><h1 className="font-bold">Biotério Central</h1></div>
        <nav className="flex-1">
          {MODULOS.map(m => (
            <button key={m.id} onClick={() => setModulo(m.id)} className={`w-full flex items-center gap-3 px-5 py-3 ${modulo === m.id ? "bg-[#4A7C7C] text-white" : "hover:bg-white/5"}`}>
              <m.icon size={16} /> {m.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8">
        {modulo === "animais" ? (
          <ModuloAnimais 
            animais={animais} 
            reload={loadAnimais} 
            forcarEdicao={animalParaEditar} 
            limparForcarEdicao={() => setAnimalParaEditar(null)}
            onEditar={setAnimalParaEditar}
          />
        ) : (
          <div className="text-center mt-20 text-gray-400">Módulo {modulo} em construção.</div>
        )}
      </main>
    </div>
  );
}

function ModuloAnimais({ animais, reload, forcarEdicao, limparForcarEdicao, onEditar }) {
  const [form, setForm] = useState(null);

  useEffect(() => { if (forcarEdicao) setForm(forcarEdicao); }, [forcarEdicao]);

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-lg font-bold uppercase">Mapeamento de Espécimes</h2>
        <button onClick={() => setForm({ sip: "", linhagem: "Swiss", sexo: "Fêmea", categoria: "Matriz" })} className="bg-[#1B3A54] text-white px-4 py-2 rounded text-sm">+ Cadastrar Animal</button>
      </div>

      {form && (
        <form className="bg-white p-6 rounded border shadow-sm mb-6" onSubmit={async (e) => {
          e.preventDefault();
          const payload = { ...form };
          // Mapeamento corrigido para o seu banco
          payload.ceua_protocolo = form.ceua_protocolo || form.protocolo_ceua; 
          
          const { error } = await supabase.from("animais").upsert(payload);
          if (error) alert("Erro: " + error.message);
          else { setForm(null); limparForcarEdicao(); reload(); }
        }}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input placeholder="SIP" className="border p-2" value={form.sip || ""} onChange={e => setForm({...form, sip: e.target.value})} />
            <input placeholder="Protocolo CEUA" className="border p-2" value={form.ceua_protocolo || form.protocolo_ceua || ""} onChange={e => setForm({...form, ceua_protocolo: e.target.value})} />
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button>
        </form>
      )}

      {animais.map(a => (
        <div key={a.sip} className="bg-white p-4 border rounded mb-2 flex justify-between">
          <span>{a.sip} - {a.linhagem}</span>
          <button onClick={() => onEditar(a)} className="text-blue-600 font-bold underline">Editar</button>
        </div>
      ))}
    </div>
  );
}
