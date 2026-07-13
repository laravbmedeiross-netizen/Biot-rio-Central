import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";
// (Mantenha aqui os imports dos ícones que você já tinha: Search, Plus, etc)

export default function App() {
  const [session, setSession] = useState(undefined);
  const [modulo, setModulo] = useState("animais");
  const [animais, setAnimais] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadAnimais = useCallback(async () => {
    const { data } = await supabase.from("animais").select("*");
    if (data) setAnimais(data);
  }, []);

  useEffect(() => { if (session) loadAnimais(); }, [session, loadAnimais]);

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Mapeamento de Espécimes</h1>
      
      {/* Botão de teste para salvar */}
      <button 
        onClick={async () => {
          const novoAnimal = {
            sip: "TESTE-" + Date.now(),
            linhagem: "Swiss",
            sexo: "Fêmea",
            categoria: "Matriz",
            // Campos que você criou no Supabase
            mae_id: "MB-TESTE",
            pai_id: "PB-TESTE",
            responsavel_tecnico: "Lara",
            ceua_protocolo: "123"
          };
          
          const { error } = await supabase.from("animais").upsert(novoAnimal);
          if (error) {
            alert("Erro ao salvar: " + error.message);
          } else {
            alert("Salvo com sucesso!");
            loadAnimais();
          }
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Testar Salvamento
      </button>

      <div className="mt-6">
        {animais.map(a => (
          <div key={a.sip} className="border-b py-2">{a.sip} - {a.linhagem}</div>
        ))}
      </div>
    </div>
  );
}
