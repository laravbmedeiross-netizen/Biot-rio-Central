import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [test, setTest] = useState("Carregando...");

  useEffect(() => {
    async function checkSupabase() {
      try {
        const { data, error } = await supabase.from("animais").select("*").limit(1);
        if (error) setTest("Erro: " + error.message);
        else setTest("Conexão com Supabase OK! Total de animais: " + (data ? data.length : 0));
      } catch (e) {
        setTest("Erro de execução.");
      }
    }
    checkSupabase();
  }, []);

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Biotério Central</h1>
      <p>{test}</p>
    </div>
  );
}
