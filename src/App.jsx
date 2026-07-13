import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronRight, X, Save, Home, PawPrint, Stethoscope,
  Heart, Skull, AlertTriangle, Trash2, ArrowLeft, Loader2, Check, LogOut, Edit3
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// ---------------------------------------------------------------------------
// Constantes de domínio
// ---------------------------------------------------------------------------

const LINHAGENS = ["Wistar", "Swiss", "C57BL/6", "BALB/c"];

const LINHAGEM_COR = {
  Wistar: "#8A5A3B",
  Swiss: "#4A7C7C",
  "C57BL/6": "#3E5C8A",
  "BALB/c": "#7C5A94",
};

const ALERTAS_LINHAGEM = {
  Wistar: ["Otite", "Porfiria"],
  Swiss: ["Oftalmopatia", "Tumor mamário"],
  "C57BL/6": ["Oftalmopatia"],
  "BALB/c": ["Oftalmopatia", "Alterações genéticas", "Kinked tail", "Anomalias reprodutivas"],
};

const BCS_OPCOES = [
  { v: "1", label: "1 — Caquético" },
  { v: "2", label: "2 — Magro" },
  { v: "3", label: "3 — Ideal" },
  { v: "4", label: "4 — Sobrepeso" },
  { v: "5", label: "5 — Obeso" },
];

const CROMO_OPCOES = [
  { v: "0", label: "0 — Ausente" },
  { v: "1", label: "1 — Leve" },
  { v: "2", label: "2 — Moderada" },
  { v: "3", label: "3 — Severa" },
];

const STATUS_ANIMAL = ["Ativo", "Óbito", "Eutanásia"];

const MODULOS = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "animais", label: "Animais", icon: PawPrint },
  { id: "atendimentos", label: "Atendimentos", icon: Stethoscope },
  { id: "reproducao", label: "Reprodução", icon: Heart },
  { id: "necropsias", label: "Necropsias", icon: Skull },
];

const SISTEMAS_ATENDIMENTO = [
  { k: "sist_comportamental", label: "Comportamental" },
  { k: "sist_dermatologico", label: "Dermatológico / tegumentar" },
  { k: "sist_respiratorio", label: "Respiratório" },
  { k: "sist_digestorio", label: "Digestório" },
  { k: "sist_neurologico", label: "Neurológico" },
  { k: "sist_reprodutivo", label: "Reprodutivo" },
];

const ACHADOS_SISTEMA_NECROPSIA = [
  { k: "ach_respiratorio", label: "Sistema respiratório" },
  { k: "ach_digestorio", label: "Sistema digestório" },
  { k: "ach_urogenital", label: "Sistema urogenital" },
  { k: "ach_cardiovascular", label: "Sistema cardiovascular" },
  { k: "ach_nervoso", label: "Sistema nervoso" },
  { k: "ach_outros", label: "Outros achados" },
];

// ---------------------------------------------------------------------------
// Camada de dados e Utilitários (Supabase)
// ---------------------------------------------------------------------------

async function listRecords(table, orderBy) {
  let query = supabase.from(table).select("*");
  if (orderBy) query = query.order(orderBy, { ascending: false });
  const { data, error } = await query;
  if (error) {
    console.error(`Erro ao carregar ${table}:`, error.message);
    return [];
  }
  return data || [];
}

async function saveRecord(table, record) {
  const { error } = await supabase.from(table).upsert(record);
  if (error) {
    console.error(`Erro ao salvar em ${table}:`, error.message);
    throw error;
  }
}

async function deleteRecord(table, idField, idValue) {
  const { error } = await supabase.from(table).delete().eq(idField, idValue);
  if (error) {
    console.error(`Erro ao excluir de ${table}:`, error.message);
    throw error;
  }
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function calcIdadeApenasMeses(dataNasc) {
  if (!dataNasc) return "—";
  const nasc = new Date(dataNasc + "T00:00:00");
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
  if (hoje.getDate() < nasc.getDate()) meses--;
  if (meses < 0) return "—";
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function totaisNinhadas(ninhadas = []) {
  if (!Array.isArray(ninhadas)) return { nascidos: 0, machos: 0, femeas: 0, mortos: 0, desmamados: 0 };
  return ninhadas.reduce(
    (acc, n) => ({
      nascidos: acc.nascidos + (Number(n.n_nascidos) || 0),
      machos: acc.machos + (Number(n.n_machos) || 0),
      femeas: acc.femeas + (Number(n.n_femeas) || 0),
      mortos: acc.mortos + (Number(n.n_mortos) || 0),
      desmamados: acc.desmamados + (Number(n.n_desmamados) || 0),
    }),
    { nascidos: 0, machos: 0, femeas: 0, mortos: 0, desmamados: 0 }
  );
}

// Componente Blocado Seguro para evitar Tela Branca
function DetalheCampo({ label, valor }) {
  if (!valor || String(valor).trim() === "" || String(valor) === "undefined") return null;
  return (
    <div className="mb-2 text-left bg-gray-50/40 p-1.5 rounded border border-gray-100/50">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-[#7C7A6E] mb-0.5">{label}</span>
      <p className="text-sm text-[#2B2B24] whitespace-pre-wrap">{String(valor)}</p>
    </div>
  );
}

function SipBadge({ sip, linhagem }) {
  const cor = LINHAGEM_COR[linhagem] || "#5C5C52";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs tracking-tight border"
      style={{ borderColor: cor, color: cor, backgroundColor: `${cor}14` }}
    >
      {sip || "sem SIP"}
    </span>
  );
}

function CardAnimalCompacto({ animal, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className="w-full flex items-center justify-between bg-white border border-[#E4E0D4] rounded-lg px-4 py-3 hover:border-[#4A7C7C] transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <SipBadge sip={animal.sip} linhagem={animal.linhagem} />
        <span className="text-sm text-[#5C5C52]">
          {animal.sexo} · {animal.linhagem} · {calcIdadeApenasMeses(animal.data_nascimento)}
        </span>
        {animal.categoria && (
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
            {animal.categoria}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${animal.status === "Ativo" ? "bg-[#4A7C7C]/10 text-[#3A6363]" : "bg-[#A6493C]/10 text-[#A6493C]"}`}>
          {animal.status || "Ativo"}
        </span>
        <ChevronRight size={16} className="text-[#B5AF9E]" />
      </div>
    </button>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="block mb-3 text-left">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-1">
        {label} {required && <span className="text-[#A6493C]">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-[#D8D3C7] bg-white px-3 py-2 text-sm text-[#2B2B24] focus:outline-none focus:ring-2 focus:ring-[#4A7C7C]";

function TextInput(props) { return <input {...props} className={inputCls} />; }
function TextArea(props) { return <textarea {...props} className={inputCls + " min-h-[80px] resize-y"} />; }
function Select({ children, ...props }) { return <select {...props} className={inputCls}>{children}</select>; }

function Btn({ children, variant = "primary", ...props }) {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors";
  const styles = {
    primary: "bg-[#1B3A54] text-white hover:bg-[#15293D]",
    ghost: "bg-transparent text-[#1B3A54] hover:bg-[#1B3A54]/8 border border-[#1B3A54]/10",
    danger: "bg-transparent text-[#A6493C] hover:bg-[#A6493C]/10 border border-[#A6493C]/20",
  };
  return <button {...props} className={`${base} ${styles[variant]} ${props.className || ""}`}>{children}</button>;
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#D8D3C7] rounded-lg bg-white/50">
      <Icon size={28} className="text-[#B5AF9E] mb-3" />
      <p className="text-[#2B2B24] font-medium mb-1">{title}</p>
      <p className="text-sm text-[#8A8574]">{subtitle}</p>
    </div>
  );
}

function SecaoForm({ titulo, children }) {
  return (
    <div className="mb-5 pb-4 border-b border-[#F0EEE5] last:border-0 last:mb-0 last:pb-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4A7C7C] mb-3">{titulo}</h4>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente de Exportação Principal (App)
// ---------------------------------------------------------------------------

export default function App() {
  const [modulo, setModulo] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [animais, setAnimais] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  const [reproducoes, setReproducoes] = useState([]);
  const [necropsias, setNecropsias] = useState([]);
  const [busca, setBusca] = useState("");
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(undefined);
  const [animalParaEditar, setAnimalParaEditar] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [a, at, r, n] = await Promise.all([
      listRecords("animais"),
      listRecords("atendimentos", "data"),
      listRecords("reproducao"),
      listRecords("necropsias", "data"),
    ]);
    setAnimais(a.sort((x, y) => (x.sip || "").localeCompare(y.sip || "")));
    setAtendimentos(at);
    setReproducoes(r);
    setNecropsias(n);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [loadAll, session]);

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return <div className="min-h-screen bg-[#F7F5F0] p-10 font-mono">Variáveis Supabase ausentes (.env).</div>;
  }

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function tratarExcluirAnimal(sip) {
    try {
      await deleteRecord("animais", "sip", sip);
      showToast("Animal excluído com sucesso");
      setModulo("animais");
      loadAll();
    } catch {
      showToast("Erro ao excluir. Remova fichas clínicas associadas antes.");
    }
  }

  const buscaLower = busca.trim().toLowerCase();
  const resultadosBusca = buscaLower ? animais.filter(a => (a.sip || "").toLowerCase().includes(buscaLower) || (a.linhagem || "").toLowerCase().includes(buscaLower)) : [];

  return (
    <div className="min-h-screen flex bg-[#F7F5F0] text-[#2B2B24]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#1B3A54] text-[#E9E5D8] flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3B3] mb-1">Centro de Biociências · UFRN</p>
          <h1 className="text-lg font-semibold leading-tight">Biotério Central</h1>
        </div>
        <nav className="flex-1 py-3">
          {MODULOS.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => { setModulo(m.id); setAnimalParaEditar(null); }} className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${modulo === m.id ? "bg-white/10 text-white font-medium" : "text-[#B8CBD6] hover:bg-white/5"}`}>
                <Icon size={16} /> {m.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs">
          <p className="truncate text-[#7C93A0] mb-2">{session.user?.email}</p>
          <button onClick={() => supabase.auth.signOut()} className="text-[#B8CBD6] hover:text-white flex items-center gap-1.5"><LogOut size={13} /> Sair</button>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 min-w-0">
        <div className="border-b border-[#E4E0D4] bg-white/60 px-8 py-3 flex items-center gap-3">
          <Search size={16} className="text-[#8A8574]" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar animal por SIP ou linhagem…" className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400" />
          {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>

        <div className="px-8 py-6">
          {buscaLower ? (
            <BuscaResultados resultados={resultadosBusca} onSelect={(sip) => { setBusca(""); setModulo(`animal-detalhe:${sip}`); }} />
          ) : (
            <>
              {modulo === "dashboard" && <Dashboard animais={animais} atendimentos={atendimentos} necropsias={necropsias} reproducoes={reproducoes} goTo={setModulo} />}
              {modulo === "animais" && <ModuloAnimais animais={animais} reload={loadAll} showToast={showToast} goTo={setModulo} forcarEdicao={animalParaEditar} limparForcarEdicao={() => setAnimalParaEditar(null)} />}
              {modulo === "atendimentos" && <ModuloAtendimentos atendimentos={atendimentos} animais={animais} reload={loadAll} showToast={showToast} />}
              {modulo === "reproducao" && <ModuloReproducao reproducoes={reproducoes} animais={animais} reload={loadAll} showToast={showToast} />}
              {modulo === "necropsias" && <ModuloNecropsias necropsias={necropsias} animais={animais} reload={loadAll} showToast={showToast} />}
              {modulo.startsWith("animal-detalhe:") && (
                <AnimalDetalhe sip={modulo.split(":")[1]} animais={animais} atendimentos={atendimentos} reproducoes={reproducoes} voltar={() => setModulo("animais")} onExcluirAnimal={tratarExcluirAnimal} onEditarAnimal={(d) => { setAnimalParaEditar(d); setModulo("animais"); }} />
              )}
            </>
          )}
        </div>
      </main>

      {toast && <div className="fixed bottom-6 right-6 bg-[#1B3A54] text-white px-4 py-2.5 rounded-md text-sm shadow-lg z-50 flex items-center gap-1.5"><Check size={14} /> {toast}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resultados Busca Global
// ---------------------------------------------------------------------------
function BuscaResultados({ resultados, onSelect }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase text-gray-500">Resultados da Pesquisa ({resultados.length})</h2>
      {resultados.length === 0 ? <p className="text-sm text-gray-400">Nenhum espécime correspondente encontrado.</p> : <div className="grid gap-2">{resultados.map(a => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => onSelect(a.sip)} />)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel Inicial (Dashboard)
// ---------------------------------------------------------------------------
function Dashboard({ animais, atendimentos, necropsias, reproducoes, goTo }) {
  const animaisAtivos = animais.filter(a => a.status === "Ativo" || !a.status);
  const casaisAtivos = reproducoes.filter(r => !r.data_displacement && !r.data_id && !r.data_rendering && !r.data_enclosure && !r.data_encerramento);
  const casaisInativos = reproducoes.filter(r => !!r.data_displacement || !!r.data_id || !!r.data_rendering || !!r.data_enclosure || !!r.data_encerramento);
  const atendimentosEmAndamento = atendimentos.filter(at => !at.desfecho || at.desfecho.trim() === "");
  const atendimentosFinalizados = atendimentos.filter(at => at.desfecho && at.desfecho.trim() !== "");

  const obterDadosPorLinhagem = () => {
    let mapa = {};
    LINHAGENS.forEach(l => { mapa[l] = { ativa: { nascidos: 0, desmamados: 0 }, inativa: { nascidos: 0, desmamados: 0 } }; });
    reproducoes.forEach(r => {
      const animalMatriz = animais.find(a => a.sip === r.sip);
      const linhagem = animalMatriz?.linhagem || "Wistar";
      if (!LINHAGENS.includes(linhagem)) return;
      const tipoStatus = (!r.data_displacement && !r.data_id && !r.data_rendering && !r.data_enclosure && !r.data_encerramento) ? "ativa" : "inativa";
      const totalFicha = totaisNinhadas(r.ninhadas);
      mapa[linhagem][tipoStatus].nascidos += totalFicha.nascidos;
      mapa[linhagem][tipoStatus].desmamados += totalFicha.desmamados;
    });
    return mapa;
  };

  const dadosLinhagem = obterDadosPorLinhagem();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <button onClick={() => goTo("animais")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C] transition-colors">
          <PawPrint size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{animaisAtivos.length}</div>
          <div className="text-xs text-[#5C5C52] font-semibold">Animais Ativos</div>
        </button>
        <button onClick={() => goTo("atendimentos")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C] transition-colors">
          <Stethoscope size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{atendimentosEmAndamento.length}</div>
          <div className="text-xs text-[#5C5C52] font-semibold">Atendimentos Ativos</div>
          <div className="text-[10px] text-gray-400">{atendimentosFinalizados.length} concluídos</div>
        </button>
        <button onClick={() => goTo("reproducao")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C] transition-colors">
          <Heart size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{casaisAtivos.length}</div>
          <div className="text-xs text-[#5C5C52] font-semibold">Casais Ativos</div>
          <div className="text-[10px] text-gray-400">{casaisInativos.length} inativos</div>
        </button>
        <button onClick={() => goTo("necropsias")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C] transition-colors">
          <Skull size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{necropsias.length}</div>
          <div className="text-xs text-[#5C5C52] font-semibold">Necropsias</div>
        </button>
      </div>

      <div className="bg-white border rounded-lg p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5C52] mb-3">Produção e Desmame por Linhagem</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 font-semibold">
                <th className="p-2.5">Linhagem</th>
                <th className="p-2.5 text-center bg-emerald-50/40">Nascidos (Ativas)</th>
                <th className="p-2.5 text-center bg-emerald-50/40">Desmamados (Ativas)</th>
                <th className="p-2.5 text-center bg-amber-50/30">Nascidos (Inativas)</th>
                <th className="p-2.5 text-center bg-amber-50/30">Desmamados (Inativas)</th>
              </tr>
            </thead>
            <tbody>
              {LINHAGENS.map(l => (
                <tr key={l} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-2.5 font-medium">{l}</td>
                  <td className="p-2.5 text-center text-emerald-800 font-medium">{dadosLinhagem[l].ativa.nascidos}</td>
                  <td className="p-2.5 text-center text-emerald-900 font-bold">{dadosLinhagem[l].ativa.desmamados}</td>
                  <td className="p-2.5 text-center text-amber-800">{dadosLinhagem[l].inativa.nascidos}</td>
                  <td className="p-2.5 text-center text-amber-900 font-bold">{dadosLinhagem[l].inativa.desmamados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Módulo Animais
// ---------------------------------------------------------------------------
function ModuloAnimais({ animais, reload, showToast, goTo, forcarEdicao, limparForcarEdicao }) {
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { if (forcarEdicao) setForm(forcarEdicao); }, [forcarEdicao]);

  async function executarSalvar(d) {
    setSalvando(true);
    try {
      await saveRecord("animais", d);
      setForm(null);
      limparForcarEdicao();
      showToast("Animal salvo com sucesso");
      reload();
    } catch {
      showToast("Erro ao processar salvamento");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Mapeamento de Animais</h2>
          <p className="text-xs text-gray-400">Banco central corporativo indexado por códigos SIP.</p>
        </div>
        <Btn onClick={() => { setForm({}); limparForcarEdicao(); }}><Plus size={14} /> Novo Animal</Btn>
      </div>

      {form && <AnimalForm inicial={form} animaisExistentes={animais} onCancelar={() => { setForm(null); limparForcarEdicao(); }} onSalvar={executarSalvar} salvando={salvando} />}

      <div className="grid gap-2">
        {animais.map(a => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => goTo(`animal-detalhe:${a.sip}`)} />)}
      </div>
    </div>
  );
}

function AnimalForm({ inicial, animaisExistentes, onSalvar, onCancelar, salvando }) {
  const isEdicao = !!inicial?.sip;
  const [f, setF] = useState({ sip: "", linhagem: LINHAGENS[0], sexo: "Fêmea", data_nascimento: "", origem: "", categoria: "", status: "Ativo", observacoes: "", ...inicial });
  const [erro, setErro] = useState("");

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!f.sip.trim()) return setErro("Código SIP obrigatório."); onSalvar(f); }} className="bg-white border rounded-lg p-5 shadow-sm space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Field label="Código SIP Identificador" required><TextInput value={f.sip} onChange={e => setF({...f, sip: e.target.value})} disabled={isEdicao} placeholder="Ex: BC_WS_001" /></Field>
        <Field label="Linhagem Genética" required><Select value={f.linhagem} onChange={e => setF({...f, linhagem: e.target.value})}>{LINHAGENS.map(l => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Sexo Anatômico"><Select value={f.sexo} onChange={e => setF({...f, sexo: e.target.value})}><option>Fêmea</option><option>Macho</option></Select></Field>
        <Field label="Data de Nascimento (Maternidade)"><TextInput type="date" value={f.data_nascimento || ""} onChange={e => setF({...f, data_nascimento: e.target.value})} /></Field>
        <Field label="Categoria de Destinação"><Select value={f.categoria} onChange={e => setF({...f, categoria: e.target.value})}><option value="">Selecione...</option><option value="Matriz">Matriz</option><option value="Reprodutor">Reprodutor</option><option value="Experimentação">Experimentação</option></Select></Field>
        <Field label="Status de Vitalidade"><Select value={f.status} onChange={e => setF({...f, status: e.target.value})}>{STATUS_ANIMAL.map(s => <option key={s}>{s}</option>)}</Select></Field>
      </div>
      <Field label="Notas Adicionais / Observações Gênicas"><TextArea value={f.observacoes || ""} onChange={e => setF({...f, observacoes: e.target.value})} /></Field>
      {erro && <p className="text-xs text-red-600 font-bold">{erro}</p>}
      <div className="flex gap-2"><Btn type="submit" disabled={salvando}>{salvando ? "Processando..." : "Salvar Dados"}</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Atendimentos (COMPLETO E DETALHADO)
// ---------------------------------------------------------------------------
function ModuloAtendimentos({ atendimentos, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState("andamento");
  const [aberto, setAberto] = useState(null);

  const filtrados = atendimentos.filter(at => {
    const isFechado = at.desfecho && at.desfecho.trim() !== "";
    return aba === "finalizados" ? isFechado : !isFechado;
  });

  async function executarExcluir(id) {
    if (confirm("Confirmar exclusão definitiva desta ficha de atendimento clínico?")) {
      await deleteRecord("atendimentos", "id", id);
      showToast("Atendimento excluído com sucesso");
      reload();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Fichas de Atendimento Clínico</h2>
          <p className="text-xs text-gray-400">Prontuários médicos ambulatoriais e triagem de intercorrências.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo Atendimento</Btn>
      </div>

      {form && <AtendimentoForm inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => { await saveRecord("atendimentos", d); setForm(null); showToast("Atendimento salvo"); reload(); }} />}

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setAba("andamento")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "andamento" ? "bg-[#1B3A54] text-white" : "bg-white border text-gray-600"}`}>Acompanhamento Clínico ({atendimentos.filter(at => !at.desfecho || at.desfecho.trim() === "").length})</button>
        <button onClick={() => setAba("finalizados")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "finalizados" ? "bg-emerald-700 text-white" : "bg-white border text-gray-600"}`}>Casos Finalizados ({atendimentos.filter(at => at.desfecho && at.desfecho.trim() !== "").length})</button>
      </div>

      <div className="grid gap-2">
        {filtrados.map(r => {
          const animal = animais.find(a => a.sip === r.sip);
          const isAberto = aberto === r.id;
          return (
            <div key={r.id} className="bg-white border rounded-lg p-4">
              <button onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    <span className="text-xs text-gray-400">{fmtDate(r.data)} · Vet: {r.responsavel || "Não Informado"}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1.5 text-[#1B3A54]">{r.diagnostico || "Avaliação Clínica Geral"}</p>
                </div>
                <ChevronRight size={16} className={`transition-transform text-gray-400 ${isAberto ? "rotate-90" : ""}`} />
              </button>

              {isAberto && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <DetalheCampo label="Anamnese / Queixa Técnica" valor={r.anamnese} />
                  <div className="grid grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded">
                    <DetalheCampo label="Peso" valor={r.peso ? `${r.peso}g` : "—"} />
                    <DetalheCampo label="Escore BCS" valor={r.escore_corporal} />
                    <DetalheCampo label="Mucosas / Hidratação" valor={r.mucosas} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4">
                    {SISTEMAS_ATENDIMENTO.map(s => (
                      <DetalheCampo key={s.k} label={`Exame: ${s.label}`} valor={r[s.k]} />
                    ))}
                  </div>

                  <DetalheCampo label="Tratamento / Conduta Farmacológica" valor={r.conduta || r.medicamento_nome} />
                  <DetalheCampo label="Nota de Conclusão / Desfecho" valor={r.desfecho} />

                  <div className="flex gap-2 pt-2 border-t border-gray-100/60">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs"><Edit3 size={12} /> Editar</Btn>
                    <Btn variant="danger" onClick={() => executarExcluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={12} /> Excluir Ficha</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AtendimentoForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "",
    anamnese: "", peso: "", escore_corporal: "3", mucosas: "",
    sist_comportamental: "", sist_dermatologico: "", sist_respiratorio: "",
    sist_digestorio: "", sist_neurologico: "", sist_reprodutivo: "",
    diagnostico: "", conduta: "", desfecho: "", ...inicial
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar({ ...f, id: f.id || genId("atd") }); }} className="bg-white border rounded-lg p-5 space-y-4 shadow-sm text-left">
      <SecaoForm titulo="Identificação Clínica">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Animal (Código SIP)" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
          <Field label="Data do Atendimento" required><TextInput type="date" value={f.data} onChange={e => setF({...f, data: e.target.value})} /></Field>
          <Field label="Médico Veterinário / Responsável"><TextInput value={f.responsavel} onChange={e => setF({...f, responsavel: e.target.value})} /></Field>
        </div>
      </SecaoForm>

      <SecaoForm titulo="Triagem Física Básica">
        <Field label="Anamnese / Queixa Clínica"><TextArea value={f.anamnese} onChange={e => setF({...f, anamnese: e.target.value})} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Peso Gravado (g)"><TextInput value={f.peso} onChange={e => setF({...f, peso: e.target.value})} /></Field>
          <Field label="Escore de Condição Corporal (BCS)"><Select value={f.escore_corporal} onChange={e => setF({...f, escore_corporal: e.target.value})}>{BCS_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</Select></Field>
          <Field label="Mucosas / Hidratação"><TextInput value={f.mucosas} onChange={e => setF({...f, mucosas: e.target.value})} /></Field>
        </div>
      </SecaoForm>

      <SecaoForm titulo="Inspeção Fisiológica por Sistemas Orgânicos">
        <div className="grid grid-cols-2 gap-x-4">
          {SISTEMAS_ATENDIMENTO.map(s => (
            <Field key={s.k} label={s.label}><TextArea value={f[s.k] || ""} onChange={e => setF({...f, [s.k]: e.target.value})} /></Field>
          ))}
        </div>
      </SecaoForm>

      <SecaoForm titulo="Conclusão e Encerramento">
        <Field label="Diagnóstico Final Presuntivo"><TextArea value={f.diagnostico} onChange={e => setF({...f, diagnostico: e.target.value})} /></Field>
        <Field label="Conduta Terapêutica / Prescrição Aplicada"><TextArea value={f.conduta} onChange={e => setF({...f, conduta: e.target.value})} /></Field>
        <Field label="Nota de Desfecho / Arquivamento (Preencher para fechar e arquivar o caso)"><TextArea value={f.desfecho} onChange={e => setF({...f, desfecho: e.target.value})} placeholder="Se este campo for preenchido, o caso sairá da lista de acompanhamento ativo." /></Field>
      </SecaoForm>

      <div className="flex gap-2"><Btn type="submit">Salvar Ficha Clínica</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Reprodução (COMPLETO E DETALHADO)
// ---------------------------------------------------------------------------
function ModuloReproducao({ reproducoes, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState("ativos");
  const [aberto, setAberto] = useState(null);

  const filtrados = reproducoes.filter(r => {
    const enc = !!r.data_displacement || !!r.data_id || !!r.data_encerramento;
    return aba === "inativos" ? enc : !enc;
  });

  async function executarExcluir(id) {
    if (confirm("Confirmar a exclusão permanente deste prontuário de acasalamento?")) {
      await deleteRecord("reproducao", "id", id);
      showToast("Prontuário reprodutivo excluído");
      reload();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Fichas e Prontuários Reprodutivos</h2>
          <p className="text-xs text-gray-400">Controle de matrizes reprodutoras, haras de linhagens e ninhadas.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo Prontuário</Btn>
      </div>

      {form && <ReproducaoForm inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => { await saveRecord("reproducao", d); setForm(null); showToast("Prontuário salvo"); reload(); }} />}

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setAba("ativos")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "ativos" ? "bg-[#1B3A54] text-white" : "bg-white border text-gray-600"}`}>Casais Ativos ({reproducoes.filter(r => !r.data_displacement && !r.data_id && !r.data_encerramento).length})</button>
        <button onClick={() => setAba("inativos")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "inativos" ? "bg-amber-700 text-white" : "bg-white border text-gray-600"}`}>Casais Inativos ({reproducoes.filter(r => r.data_displacement || r.data_id || r.data_rendering || r.data_enclosure || r.data_encerramento).length})</button>
      </div>

      <div className="grid gap-2">
        {filtrados.map(r => {
          const animal = animais.find(a => a.sip === r.sip);
          const tot = totaisNinhadas(r.ninhadas);
          const isAberto = aberto === r.id;
          const enc = !!r.data_displacement || !!r.data_id || !!r.data_encerramento;

          return (
            <div key={r.id} className="bg-white border rounded-lg p-4">
              <button onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    {r.reprodutor_id && <span className="text-xs text-gray-400">× Reprodutor Macho: <strong>{r.reprodutor_id}</strong></span>}
                    {enc && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">Inativo</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{r.ninhadas?.length || 0} ninhada(s) registradas · {tot.nascidos} nascidos totais · {tot.desmamados} desmamados com sucesso</p>
                </div>
                <ChevronRight size={16} className={`transition-transform text-gray-400 ${isAberto ? "rotate-90" : ""}`} />
              </button>

              {isAberto && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {r.ninhadas?.filter(n => n.data).length > 0 ? (
                    <div className="overflow-x-auto border rounded bg-gray-50/50 p-2">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Histórico Cronológico de Partos</span>
                      <table className="w-full text-xs text-left border-collapse bg-white">
                        <thead>
                          <tr className="text-gray-400 border-b pb-1 font-semibold">
                            <th className="py-1 px-2">Data Parto</th>
                            <th className="py-1 text-center">Nascidos</th>
                            <th className="py-1 text-center">Mortos</th>
                            <th className="py-1 text-center">Desmamados</th>
                            <th className="py-1 pl-2">Notas Ocorrência</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.ninhadas.filter(n => n.data).map((n, idx) => (
                            <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50/40">
                              <td className="py-1 px-2 font-mono">{fmtDate(n.data)}</td>
                              <td className="py-1 text-center text-emerald-800 font-medium">{n.n_nascidos || 0}</td>
                              <td className="py-1 text-center text-red-600">{n.n_mortos || 0}</td>
                              <td className="py-1 text-center text-blue-800 font-bold">{n.n_desmamados || 0}</td>
                              <td className="py-1 pl-2 text-gray-400 italic max-w-xs truncate">{n.observacoes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-xs text-gray-400 italic">Nenhum evento de parto registrado neste prontuário.</p>}

                  <div className="grid grid-cols-2 gap-3 bg-gray-50/20 p-2 rounded border border-gray-100">
                    <DetalheCampo label="Linhagem / Genealogia Informada" valor={r.genealogia} />
                    <DetalheCampo label="Histórico Clínico da Matriz" valor={r.historico_clinico} />
                    <DetalheCampo label="Intercorrências Coletadas" valor={r.intercorrencias} />
                    <DetalheCampo label="Tratamentos do Casal" valor={r.tratamentos} />
                  </div>

                  {enc && (
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded text-xs text-amber-900">
                      <strong>Ficha Inativada:</strong> Desativada em {fmtDate(r.data_displacement || r.data_id || r.data_enclosure || r.data_encerramento)} {r.motivo_recording || r.motivo_encerramento ? `| Motivo: ${r.motivo_recording || r.motivo_encerramento}` : ""}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-100/60">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs"><Edit3 size={12} /> Editar</Btn>
                    <Btn variant="danger" onClick={() => executarExcluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={12} /> Excluir Ficha</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReproducaoForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", reprodutor_id: "", genealogia: "", historico_clinico: "", intercorrencias: "", tratamentos: "",
    ninhadas: [{ data: "", n_nascidos: "", n_machos: "", n_femeas: "", n_mortos: "", n_desmamados: "", observacoes: "" }],
    data_displacement: "", data_encerramento: "", motivo_encerramento: "", ...inicial
  });
  const [erro, setErro] = useState("");

  function updNinhada(i, k, v) {
    const n = [...f.ninhadas];
    n[i] = { ...n[i], [k]: v };
    setF({ ...f, ninhadas: n });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!f.sip) return setErro("Matriz fêmea obrigatória."); onSalvar({ ...f, id: f.id || genId("rep") }); }} className="bg-white border rounded-lg p-5 space-y-4 text-left shadow-sm">
      <SecaoForm titulo="Identificação do Acasalamento">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Matriz Fêmea (Código SIP)" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.filter(a => a.sexo === "Fêmea").map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
          <Field label="Reprodutor Macho (Código SIP)"><Select value={f.reprodutor_id || ""} onChange={e => setF({...f, reprodutor_id: e.target.value})}><option value="">Selecione…</option>{animais.filter(a => a.sexo === "Macho").map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        </div>
      </SecaoForm>

      <SecaoForm titulo="Notas de Genealogia e Clínica">
        <Field label="Genealogia / Linhagem Rastreável"><TextInput value={f.genealogia || ""} onChange={e => setF({...f, genealogia: e.target.value})} /></Field>
        <Field label="Histórico Clínico da Matriz"><TextArea value={f.historico_clinico || ""} onChange={e => setF({...f, historico_clinico: e.target.value})} /></Field>
      </SecaoForm>

      <SecaoForm titulo="Grade de Ninhadas / Partos">
        {f.ninhadas.map((n, i) => (
          <div key={i} className="bg-gray-50 p-3 rounded mb-2 border space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div><span className="text-[10px] text-gray-400 font-bold uppercase">Data Parto</span><TextInput type="date" value={n.data || ""} onChange={e => updNinhada(i, "data", e.target.value)} /></div>
              <div><span className="text-[10px] text-gray-400 font-bold uppercase">Nascidos</span><TextInput type="number" value={n.n_nascidos || ""} onChange={e => updNinhada(i, "n_nascidos", e.target.value)} /></div>
              <div><span className="text-[10px] text-gray-400 font-bold uppercase">Mortos</span><TextInput type="number" value={n.n_mortos || ""} onChange={e => updNinhada(i, "n_mortos", e.target.value)} /></div>
              <div><span className="text-[10px] text-gray-400 font-bold uppercase">Desmamados</span><TextInput type="number" value={n.n_desmamados || ""} onChange={e => updNinhada(i, "n_desmamados", e.target.value)} /></div>
            </div>
            <TextInput placeholder="Notas de intercorrências ou observações do parto" value={n.observacoes || ""} onChange={e => updNinhada(i, "observacoes", e.target.value)} />
            {f.ninhadas.length > 1 && <button type="button" onClick={() => setF({ ...f, ninhadas: f.ninhadas.filter((_, idx) => idx !== i) })} className="text-xs text-red-600 font-bold mt-1 block">Remover ninhada</button>}
          </div>
        ))}
        <Btn type="button" variant="ghost" onClick={() => setF({ ...f, ninhadas: [...f.ninhadas, { data: "", n_nascidos: "", n_desmamados: "" }] })} className="text-xs">+ Adicionar Linha de Parto</Btn>
      </SecaoForm>

      <SecaoForm titulo="Dados de Desativação / Encerramento">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data de Encerramento do Casal"><TextInput type="date" value={f.data_displacement || f.data_enclosure || f.data_id || f.data_encerramento || ""} onChange={e => setF({ ...f, data_id: e.target.value, data_displacement: e.target.value, data_enclosure: e.target.value, data_encerramento: e.target.value })} /></Field>
          <Field label="Motivo do Encerramento / Descarte"><TextInput value={f.motivo_encerramento || ""} onChange={e => setF({ ...f, motivo_recording: e.target.value, motivo_encerramento: e.target.value })} placeholder="Ex: Baixa produtividade, idade avançada" /></Field>
        </div>
      </SecaoForm>

      {erro && <p className="text-xs text-red-600 font-bold">{erro}</p>}
      <div className="flex gap-2"><Btn type="submit">Salvar Registro</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Necropsias (COMPLETO E DETALHADO)
// ---------------------------------------------------------------------------
function ModuloNecropsias({ necropsias, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aberto, setAberto] = useState(null);

  async function executarExcluir(id) {
    if (confirm("Confirmar a exclusão permanente deste laudo anatomopatológico?")) {
      await deleteRecord("necropsias", "id", id);
      showToast("Laudo de necropsia excluído");
      reload();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Laudos de Necropsia Macroscópica</h2>
          <p className="text-xs text-gray-400">Registros post-mortem por sistemas anatômicos e integridade de carcaça.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Nova Necropsia</Btn>
      </div>

      {form && <NecropsiaForm inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => { await saveRecord("necropsias", d); setForm(null); showToast("Necropsia salva"); reload(); }} />}

      <div className="grid gap-2">
        {necropsias.map(r => {
          const animal = animais.find(a => a.sip === r.sip);
          const isAberto = aberto === r.id;
          return (
            <div key={r.id} className="bg-white border rounded-lg p-4">
              <button onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    <span className="text-xs text-gray-400">{fmtDate(r.data)} · Patologista: {r.responsavel || "Não preenchido"}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mt-1.5"><span className="text-gray-400 font-normal">Macro:</span> {r.diagnostico_macroscopico || "Sem observações estruturadas"}</p>
                </div>
                <ChevronRight size={16} className={`transition-transform text-gray-400 ${isAberto ? "rotate-90" : ""}`} />
              </button>

              {isAberto && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <DetalheCampo label="Histórico Clínico Post-Mortem / Causa Provável" valor={r.historico} />
                  
                  <div className="grid grid-cols-3 gap-2 bg-gray-50/40 p-2 rounded">
                    <DetalheCampo label="Condição Carcaça" valor={r.condicao_carcaca} />
                    <DetalheCampo label="Escore BCS" valor={r.bcs} />
                    <DetalheCampo label="Cromodacriorreia" valor={r.cromodacriorreia} />
                  </div>

                  <DetalheCampo label="Pelagem, Mucosas e Orifícios Naturais" valor={r.avaliacao_externa} />

                  <div className="grid grid-cols-2 gap-x-4">
                    {ACHADOS_SISTEMA_NECROPSIA.map(s => (
                      <DetalheCampo key={s.k} label={s.label} valor={r[s.k]} />
                    ))}
                  </div>

                  <DetalheCampo label="Fragmentos / Coletas Enviadas" valor={r.coletas} />
                  <DetalheCampo label="Diagnóstico Final Conclusivo" valor={r.diagnostico_final} />
                  <DetalheCampo label="Destino Final das Amostras" valor={r.destino} />

                  <div className="flex gap-2 pt-2 border-t border-gray-100/60">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs"><Edit3 size={12} /> Editar</Btn>
                    <Btn variant="danger" onClick={() => executarExcluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={12} /> Excluir Laudo</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NecropsiaForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "",
    historico: "", condicao_carcaca: "Fresca", bcs: "3", cromodacriorreia: "0", avaliacao_externa: "",
    ach_respiratorio: "", ach_digestorio: "", ach_urogenital: "", ach_cardiovascular: "", ach_nervoso: "", ach_outros: "",
    coletas: "", diagnostico_macroscopico: "", diagnostico_final: "", destino: "Descarte", ...inicial
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar({ ...f, id: f.id || genId("necro") }); }} className="bg-white border rounded-lg p-5 space-y-4 text-left shadow-sm">
      <SecaoForm titulo="Metadados de Patologia">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Animal Necropsado (SIP)" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
          <Field label="Data do Laudo/Inspeção" required><TextInput type="date" value={f.data} onChange={e => setF({...f, data: e.target.value})} /></Field>
          <Field label="Médico Veterinário / Patologista"><TextInput value={f.responsavel} onChange={e => setF({...f, responsavel: e.target.value})} /></Field>
        </div>
      </SecaoForm>

      <SecaoForm titulo="Exame Físico Cadavérico Externo">
        <Field label="Histórico de Óbito / Indicação Teórica"><TextArea value={f.historico} onChange={e => setF({...f, historico: e.target.value})} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Condição da Carcaça"><Select value={f.condicao_carcaca} onChange={e => setF({...f, condicao_carcaca: e.target.value})}><option>Fresca</option><option>Refrigerada</option><option>Autolisada</option></Select></Field>
          <Field label="Escore Corporal Cadavérico (BCS)"><Select value={f.bcs} onChange={e => setF({...f, bcs: e.target.value})}>{BCS_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</Select></Field>
          <Field label="Grau de Cromodacriorreia"><Select value={f.cromodacriorreia} onChange={e => setF({...f, cromodacriorreia: e.target.value})}>{CROMO_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</Select></Field>
        </div>
        <Field label="Inspeção de Pelagem, Mucosas e Orifícios Naturais"><TextArea value={f.avaliacao_externa} onChange={e => setF({...f, avaliacao_externa: e.target.value})} /></Field>
      </SecaoForm>

      <SecaoForm titulo="Laudo Interno por Sistemas Anatômicos">
        <div className="grid grid-cols-2 gap-x-4">
          {ACHADOS_SISTEMA_NECROPSIA.map(s => (
            <Field key={s.k} label={s.label}><TextArea value={f[s.k] || ""} onChange={e => setF({...f, [s.k]: e.target.value})} /></Field>
          ))}
        </div>
      </SecaoForm>

      <SecaoForm titulo="Diagnósticos Finais de Necropsia">
        <Field label="Amostras e Fragmentos de Órgãos Coletados"><TextArea value={f.coletas} onChange={e => setF({...f, coletas: e.target.value})} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Diagnóstico Macroscópico Geral"><TextArea value={f.diagnostico_macroscopico} onChange={e => setF({...f, diagnostico_macroscopico: e.target.value})} /></Field>
          <Field label="Diagnóstico Final / Histopatológico (Conclusivo)"><TextArea value={f.diagnostico_final} onChange={e => setF({...f, diagnostico_final: e.target.value})} /></Field>
        </div>
        <Field label="Destino Final dos Resíduos Orgânicos"><Select value={f.destino} onChange={e => setF({...f, destino: e.target.value})}><option>Descarte</option><option>Histopatologia</option><option>Amostra Biológica Congelada</option></Select></Field>
      </SecaoForm>

      <div className="flex gap-2"><Btn type="submit">Salvar Laudo Macroscópico</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Painel Detalhado do Animal (Perfil)
// ---------------------------------------------------------------------------
function AnimalDetalhe({ sip, animais, atendimentos, reproducoes, voltar, onEditarAnimal, onExcluirAnimal }) {
  const animal = animais.find(a => a.sip === sip);
  if (!animal) return <p className="text-sm p-6 text-gray-400">Animal não localizado no banco.</p>;
  
  const as = atendimentos.filter(a => a.sip === sip);
  const rs = reproducoes.filter(r => r.sip === sip || r.reprodutor_id === sip);

  return (
    <div className="space-y-4 text-left">
      <div className="flex justify-between items-center">
        <Btn variant="ghost" onClick={voltar} className="!px-2"><ArrowLeft size={14} /> Voltar para lista</Btn>
        <div className="flex gap-2">
          <Btn variant="danger" onClick={() => { if(confirm(`Deseja remover permanentemente o registro de ${animal.sip}?`)) onExcluirAnimal(animal.sip); }}><Trash2 size={13} /> Excluir Espécime</Btn>
          <Btn onClick={() => onEditarAnimal(animal)} className="!bg-[#4A7C7C] hover:!bg-[#3A6363]"><Edit3 size={13} /> Editar Linhagem</Btn>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-5">
        <div className="flex items-center gap-3"><SipBadge sip={animal.sip} linhagem={animal.linhagem} /><span className="text-base font-bold text-[#1B3A54]">{animal.linhagem} · {animal.sexo}</span></div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-gray-500 border-t pt-3">
          <div>Status Cadastral: <strong className="text-gray-700">{animal.status || "Ativo"}</strong></div>
          <div>Categoria do Animal: <strong className="text-gray-700">{animal.categoria || "Manutenção"}</strong></div>
          <div>Tempo de Vida Estimado: <strong className="text-gray-700">{calcIdadeApenasMeses(animal.data_nascimento)}</strong></div>
        </div>
        {animal.observacoes && <div className="mt-3 text-xs bg-gray-50 p-2 rounded text-gray-600 border italic">Notas: {animal.observacoes}</div>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b pb-1">Histórico Clínico Associado ({as.length})</h4>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {as.map(a => <div key={a.id} className="text-xs border-b border-gray-100 pb-1 last:border-0"><span className="text-gray-400 font-mono">{fmtDate(a.data)}:</span> <strong>{a.diagnostico || "Avaliação"}</strong> {a.desfecho && <span className="text-emerald-700 font-bold">(Encerrado)</span>}</div>)}
            {as.length === 0 && <p className="text-xs text-gray-400 italic">Nenhuma intercorrência ambulatorial vinculada.</p>}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b pb-1">Vínculo de Reprodução ({rs.length})</h4>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {rs.map(r => <div key={r.id} className="text-xs border-b border-gray-100 pb-1 last:border-0">Fêmea: <strong>{r.sip}</strong> × Macho: <strong>{r.reprodutor_id || "—"}</strong> {r.data_displacement || r.data_id || r.data_ his || r.data_id || r.data_encerramento ? <span className="text-amber-700 font-bold">(Inativo)</span> : <span className="text-emerald-700 font-bold">(Ativo)</span>}</div>)}
            {rs.length === 0 && <p className="text-xs text-gray-400 italic">Este animal não faz parte de nenhuma colônia de acasalamento.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
