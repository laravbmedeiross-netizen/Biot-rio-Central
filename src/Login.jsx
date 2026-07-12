import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    onLogin(data.session);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f4ef",
      fontFamily: "sans-serif",
    }}>
      <form onSubmit={handleLogin} style={{
        background: "#fff",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        width: "320px",
      }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Biotério Central</h2>
        <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Entre com seu e-mail e senha
        </p>

        <label style={{ fontSize: "0.8rem", fontWeight: "bold" }}>E-MAIL</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "1rem", marginTop: "4px" }}
        />

        <label style={{ fontSize: "0.8rem", fontWeight: "bold" }}>SENHA</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "1rem", marginTop: "4px" }}
        />

        {erro && <p style={{ color: "red", fontSize: "0.85rem" }}>{erro}</p>}

        <button type="submit" disabled={carregando} style={{
          width: "100%",
          padding: "10px",
          background: "#1e2b3c",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
        }}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
