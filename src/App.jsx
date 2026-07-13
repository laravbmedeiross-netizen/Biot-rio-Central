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

// ---------------------------------------------------------------------------
// Funções Utilitárias Globais
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

// Componente de renderização de texto seguro de dados
function DetalheCampo({ label, valor }) {
  if (!valor || String(valor).trim() === "") return null;
  return (
    <div className="mb-2 text-left">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-[#5C5C52] mb-0.5">{label}</span>
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
      </div>
      <ChevronRight size={16} className="text-[#B5AF9E]" />
    </button>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="block mb-3">
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
    ghost: "bg-transparent text-[#1B3A54] hover:bg-[#1B3A54]/8",
    danger: "bg-transparent text-[#A6493C] hover:bg-[#A6493C]/10 border border-[#A6493C]/20",
  };
  return <button {...props} className={`${base} ${styles[variant]} ${props.className || ""}`}>{children}</button>;
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#D8D3C7] rounded-lg">
      <Icon size={28} className="text-[#B5AF9E] mb-3" />
      <p className="text-[#2B2B24] font-medium mb-1">{title}</p>
      <p className="text-sm text-[#8A8574]">{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente Principal (App)
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
    return <div className="min-h-screen bg-[#F7F5F0] p-10">Configuração do arquivo .env ausente no Vercel.</div>;
  }

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const buscaLower = busca.trim().toLowerCase();
  const resultadosBusca = buscaLower ? animais.filter(a => (a.sip || "").toLowerCase().includes(buscaLower) || (a.linhagem || "").toLowerCase().includes(buscaLower)) : [];

  return (
    <div className="min-h-screen flex bg-[#F7F5F0] text-[#2B2B24]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="w-56 shrink-0 bg-[#1B3A54] text-[#E9E5D8] flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8FB3B3] mb-1">Centro de Biociências · UFRN</p>
          <h1 className="text-lg font-semibold leading-tight">Biotério Central</h1>
        </div>
        <nav className="flex-1 py-3">
          {MODULOS.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => { setModulo(m.id); setAnimalParaEditar(null); }} className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm ${modulo === m.id ? "bg-white/10 text-white font-medium" : "text-[#B8CBD6] hover:bg-white/5"}`}>
                <Icon size={16} /> {m.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs">
          <p className="truncate text-[#7C93A0] mb-2">{session.user?.email}</p>
          <button onClick={() => supabase.auth.signOut()} className="text-[#B8CBD6] hover:text-white flex items-center gap-1"><LogOut size={12} /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="border-b border-[#E4E0D4] bg-white/60 px-8 py-3 flex items-center gap-3">
          <Search size={16} className="text-[#8A8574]" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar animal por SIP ou linhagem…" className="flex-1 bg-transparent outline-none text-sm" />
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
                <AnimalDetalhe sip={modulo.split(":")[1]} animais={animais} atendimentos={atendimentos} reproducoes={reproducoes} voltar={() => setModulo("animais")} />
              )}
            </>
          )}
        </div>
      </main>

      {toast && <div className="fixed bottom-6 right-6 bg-[#1B3A54] text-white px-4 py-2.5 rounded-md text-sm shadow-lg z-50">{toast}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({ animais, atendimentos, necropsias, reproducoes, goTo }) {
  const animaisAtivos = animais.filter(a => a.status === "Ativo" || !a.status);
  const casaisAtivos = reproducoes.filter(r => !r.data_encerramento);
  const casaisInativos = reproducoes.filter(r => !!r.data_encerramento);
  const atendimentosEmAndamento = atendimentos.filter(at => !at.desfecho || at.desfecho.trim() === "");
  const atendimentosFinalizados = atendimentos.filter(at => at.desfecho && at.desfecho.trim() !== "");

  const obterDadosPorLinhagem = () => {
    let mapa = {};
    LINHAGENS.forEach(l => { mapa[l] = { ativa: { nascidos: 0, desmamados: 0 }, inativa: { nascidos: 0, desmamados: 0 } }; });
    reproducoes.forEach(r => {
      const animalMatriz = animais.find(a => a.sip === r.sip);
      const linhagem = animalMatriz?.linhagem || "Wistar";
      if (!LINHAGENS.includes(linhagem)) return;
      const tipoStatus = !r.data_encerramento ? "ativa" : "inativa";
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
        <button onClick={() => goTo("animais")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C]">
          <PawPrint size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{animaisAtivos.length}</div>
          <div className="text-xs text-[#5C5C52]">Animais Ativos</div>
        </button>
        <button onClick={() => goTo("atendimentos")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C]">
          <Stethoscope size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{atendimentosEmAndamento.length}</div>
          <div className="text-xs text-[#5C5C52]">Atendimentos Ativos</div>
          <div className="text-[10px] text-gray-400">{atendimentosFinalizados.length} arquivados</div>
        </button>
        <button onClick={() => goTo("reproducao")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C]">
          <Heart size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{casaisAtivos.length}</div>
          <div className="text-xs text-[#5C5C52]">Casais Ativos</div>
          <div className="text-[10px] text-gray-400">{casaisInativos.length} inativos</div>
        </button>
        <button onClick={() => goTo("necropsias")} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C]">
          <Skull size={16} className="text-[#4A7C7C] mb-2" />
          <div className="text-2xl font-bold text-[#1B3A54]">{necropsias.length}</div>
          <div className="text-xs text-[#5C5C52]">Necropsias laudadas</div>
        </button>
      </div>

      <div className="bg-white border rounded-lg p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5C52] mb-3">Produção por Linhagem</h3>
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2">Linhagem</th>
              <th className="p-2 text-center bg-emerald-50/50">Nascidos (Ativas)</th>
              <th className="p-2 text-center bg-emerald-50/50">Desmamados (Ativas)</th>
              <th className="p-2 text-center bg-amber-50/50">Nascidos (Inativas)</th>
              <th className="p-2 text-center bg-amber-50/50">Desmamados (Inativas)</th>
            </tr>
          </thead>
          <tbody>
            {LINHAGENS.map(l => (
              <tr key={l} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{l}</td>
                <td className="p-2 text-center text-emerald-800">{dadosLinhagem[l].ativa.nascidos}</td>
                <td className="p-2 text-center text-emerald-800 font-bold">{dadosLinhagem[l].ativa.desmamados}</td>
                <td className="p-2 text-center text-amber-800">{dadosLinhagem[l].inativa.nascidos}</td>
                <td className="p-2 text-center text-amber-800 font-bold">{dadosLinhagem[l].inativa.desmamados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Módulo Animais
// ---------------------------------------------------------------------------

function ModuloAnimais({ animais, reload, showToast, goTo, forcarEdicao, limparForcarEdicao }) {
  const [form, setForm] = useState(null);
  useEffect(() => { if (forcarEdicao) setForm(forcarEdicao); }, [forcarEdicao]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Cadastro de Animais (SIP)</h2>
        <Btn onClick={() => { setForm({}); limparForcarEdicao(); }}><Plus size={14} /> Novo Animal</Btn>
      </div>
      {form && (
        <AnimalForm 
          inicial={form} animaisExistentes={animais} onCancelar={() => { setForm(null); limparForcarEdicao(); }}
          onSalvar={async (d) => { await saveRecord("animais", d); setForm(null); limparForcarEdicao(); showToast("Salvo"); reload(); }}
        />
      )}
      <div className="grid gap-2">
        {animais.map(a => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => goTo(`animal-detalhe:${a.sip}`)} />)}
      </div>
    </div>
  );
}

function AnimalForm({ inicial, animaisExistentes, onSalvar, onCancelar }) {
  const isEdicao = !!inicial?.sip;
  const [f, setF] = useState({ sip: "", linhagem: LINHAGENS[0], sexo: "Fêmea", data_nascimento: "", status: "Ativo", ...inicial });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar(f); }} className="bg-white border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Código SIP" required><TextInput value={f.sip} onChange={e => setF({...f, sip: e.target.value})} disabled={isEdicao} /></Field>
        <Field label="Linhagem" required><Select value={f.linhagem} onChange={e => setF({...f, linhagem: e.target.value})}>{LINHAGENS.map(l => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Sexo"><Select value={f.sexo} onChange={e => setF({...f, sexo: e.target.value})}><option>Fêmea</option><option>Macho</option></Select></Field>
        <Field label="Data de Nascimento"><TextInput type="date" value={f.data_nascimento || ""} onChange={e => setF({...f, data_nascimento: e.target.value})} /></Field>
      </div>
      <div className="flex gap-2"><Btn type="submit">Salvar</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Atendimentos
// ---------------------------------------------------------------------------

function ModuloAtendimentos({ atendimentos, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState("andamento");
  const [aberto, setAberto] = useState(null);

  const filtrados = atendimentos.filter(at => {
    const term = at.desfecho && at.desfecho.trim() !== "";
    return aba === "finalizados" ? term : !term;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Fichas Clínicas de Atendimento</h2>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo Atendimento</Btn>
      </div>

      {form && <AtendimentoForm inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => { await saveRecord("atendimentos", d); setForm(null); showToast("Salvo"); reload(); }} />}

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setAba("andamento")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "andamento" ? "bg-[#1B3A54] text-white" : "bg-white border text-gray-600"}`}>Acompanhamento</button>
        <button onClick={() => setAba("finalizados")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "finalizados" ? "bg-emerald-700 text-white" : "bg-white border text-gray-600"}`}>Finalizados</button>
      </div>

      <div className="grid gap-2">
        {filtrados.map(r => (
          <div key={r.id} className="bg-white border rounded-lg p-4">
            <button onClick={() => setAberto(aberto === r.id ? null : r.id)} className="w-full text-left flex justify-between items-center">
              <div>
                <SipBadge sip={r.sip} />
                <p className="text-sm font-medium mt-1">{r.diagnostico || "Avaliação Clínica Geral"}</p>
              </div>
              <ChevronRight size={16} className={`transition-transform ${aberto === r.id ? "rotate-90" : ""}`} />
            </button>
            {aberto === r.id && (
              <div className="mt-3 pt-3 border-t space-y-1">
                <DetalheCampo label="Anamnese / Queixa Inicial" valor={r.anamnese} />
                <DetalheCampo label="Evolução / Desfecho do Caso" valor={r.desfecho} />
                <div className="flex gap-2 pt-2">
                  <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AtendimentoForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({ sip: "", data: new Date().toISOString().slice(0, 10), anamnese: "", diagnostico: "", desfecho: "", ...inicial });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar({ ...f, id: f.id || genId("atd") }); }} className="bg-white border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Membro / SIP" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Data"><TextInput type="date" value={f.data} onChange={e => setF({...f, data: e.target.value})} /></Field>
      </div>
      <Field label="Anamnese / Sinais Clínicos"><TextArea value={f.anamnese} onChange={e => setF({...f, anamnese: e.target.value})} /></Field>
      <Field label="Diagnóstico Final Presuntivo"><TextArea value={f.diagnostico} onChange={e => setF({...f, diagnostico: e.target.value})} /></Field>
      <Field label="Nota de Fechamento / Desfecho (Preencha para Arquivar)"><TextArea value={f.desfecho} onChange={e => setF({...f, desfecho: e.target.value})} /></Field>
      <div className="flex gap-2"><Btn type="submit">Salvar Ficha</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Reprodução
// ---------------------------------------------------------------------------

function ModuloReproducao({ reproducoes, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState("ativos");
  const [aberto, setAberto] = useState(null);

  const filtrados = reproducoes.filter(r => {
    const enc = !!r.data_displacement || !!r.data_id || !!r.data_encerramento;
    return aba === "inativos" ? enc : !enc;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Controle Reprodutivo (Matrizes)</h2>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo Prontuário</Btn>
      </div>

      {form && <ReproducaoForm inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => { await saveRecord("reproducao", d); setForm(null); showToast("Salvo"); reload(); }} />}

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setAba("ativos")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "ativos" ? "bg-[#1B3A54] text-white" : "bg-white border text-gray-600"}`}>Casais Ativos</button>
        <button onClick={() => setAba("inativos")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${aba === "inativos" ? "bg-amber-700 text-white" : "bg-white border text-gray-600"}`}>Casais Inativos</button>
      </div>

      <div className="grid gap-2">
        {filtrados.map(r => {
          const animal = animais.find(a => a.sip === r.sip);
          const tot = totaisNinhadas(r.ninhadas);
          return (
            <div key={r.id} className="bg-white border rounded-lg p-4">
              <button onClick={() => setAberto(aberto === r.id ? null : r.id)} className="w-full text-left flex justify-between items-center">
                <div>
                  <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                  <p className="text-xs text-gray-500 mt-1">{r.ninhadas?.length || 0} ninhada(s) · {tot.nascidos} nascidos · {tot.desmamados} desmamados</p>
                </div>
                <ChevronRight size={16} className={`transition-transform ${aberto === r.id ? "rotate-90" : ""}`} />
              </button>

              {aberto === r.id && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  {r.ninhadas?.filter(n => n.data).length > 0 && (
                    <div className="overflow-x-auto border rounded bg-gray-50/40 p-2">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-gray-500 border-b font-semibold">
                            <th className="py-1">Data Parto</th>
                            <th className="py-1 text-center">Nascidos</th>
                            <th className="py-1 text-center">Desmamados</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.ninhadas.filter(n => n.data).map((n, idx) => (
                            <tr key={idx} className="border-t bg-white">
                              <td className="py-1">{fmtDate(n.data)}</td>
                              <td className="py-1 text-center text-emerald-800 font-medium">{n.n_nascidos || 0}</td>
                              <td className="py-1 text-center text-blue-800 font-bold">{n.n_desmamados || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                    <DetalheCampo label="Genealogia Informada" valor={r.genealogia} />
                    <DetalheCampo label="Histórico Clínico" valor={r.historico_clinico} />
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
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
  const [f, setF] = useState({ sip: "", reprodutor_id: "", genealogia: "", ninhadas: [{ data: "", n_nascidos: "", n_desmamados: "" }], data_id: "", data_encerramento: "", motivo_encerramento: "", ...inicial });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar({ ...f, id: f.id || genId("rep") }); }} className="bg-white border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Matriz (Fêmea)" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.filter(a => a.sexo === "Fêmea").map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Macho Reprodutor"><TextInput value={f.reprodutor_id || ""} onChange={e => setF({...f, reprodutor_id: e.target.value})} /></Field>
      </div>
      <Field label="Linhagem / Genealogia"><TextInput value={f.genealogia || ""} onChange={e => setF({...f, genealogia: e.target.value})} /></Field>
      <div className="grid grid-cols-2 gap-4 border-t pt-2">
        <Field label="Data Encerramento do Casal"><TextInput type="date" value={f.data_displacement || f.data_id || f.data_encerramento || ""} onChange={e => { setF({...f, data_id: e.target.value, data_displacement: e.target.value, data_encerramento: e.target.value}); }} /></Field>
        <Field label="Motivo da Inativação"><TextInput value={f.motivo_encerramento || ""} onChange={e => setF({...f, motivo_encerramento: e.target.value})} /></Field>
      </div>
      <div className="flex gap-2"><Btn type="submit">Salvar Ficha</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Necropsias
// ---------------------------------------------------------------------------

function ModuloNecropsias({ necropsias, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aberto, setAberto] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Laudos de Necropsia Post-Mortem</h2>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Nova Necropsia</Btn>
      </div>

      {form && <NecropsiaForm inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => { await saveRecord("necropsias", d); setForm(null); showToast("Salvo"); reload(); }} />}

      <div className="grid gap-2">
        {necropsias.map(r => (
          <div key={r.id} className="bg-white border rounded-lg p-4">
            <button onClick={() => setAberto(aberto === r.id ? null : r.id)} className="w-full text-left flex justify-between items-center">
              <div>
                <SipBadge sip={r.sip} />
                <p className="text-sm font-medium mt-1"><span className="text-gray-400">Achado Macro:</span> {r.diagnostico_macroscopico || "Não preenchido"}</p>
              </div>
              <ChevronRight size={16} className={`transition-transform ${aberto === r.id ? "rotate-90" : ""}`} />
            </button>
            {aberto === r.id && (
              <div className="mt-3 pt-3 border-t space-y-1">
                <DetalheCampo label="Histórico Clínico Prévio" valor={r.historico} />
                <DetalheCampo label="Sistema Respiratório" valor={r.ach_respiratorio} />
                <DetalheCampo label="Sistema Digestório" valor={r.ach_digestorio} />
                <DetalheCampo label="Diagnóstico Final Conclusivo" valor={r.diagnostico_final} />
                <div className="flex gap-2 pt-2">
                  <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NecropsiaForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({ sip: "", data: new Date().toISOString().slice(0, 10), historico: "", ach_respiratorio: "", ach_digestorio: "", diagnostico_macroscopico: "", diagnostico_final: "", ...inicial });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar({ ...f, id: f.id || genId("necro") }); }} className="bg-white border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Animal (SIP)" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Data do Laudo"><TextInput type="date" value={f.data} onChange={e => setF({...f, data: e.target.value})} /></Field>
      </div>
      <Field label="Histórico / Motivo da Morte"><TextArea value={f.historico} onChange={e => setF({...f, historico: e.target.value})} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Achados: Sist. Respiratório"><TextArea value={f.ach_respiratorio} onChange={e => setF({...f, ach_respiratorio: e.target.value})} /></Field>
        <Field label="Achados: Sist. Digestório"><TextArea value={f.ach_digestorio} onChange={e => setF({...f, ach_digestorio: e.target.value})} /></Field>
      </div>
      <Field label="Diagnóstico Macroscópico"><TextArea value={f.diagnostico_macroscopico} onChange={e => setF({...f, diagnostico_macroscopico: e.target.value})} /></Field>
      <Field label="Diagnóstico Final Conclusivo"><TextArea value={f.diagnostico_final} onChange={e => setF({...f, diagnostico_final: e.target.value})} /></Field>
      <div className="flex gap-2"><Btn type="submit">Salvar Laudo</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Detalhes Rápidos do Animal
// ---------------------------------------------------------------------------

function AnimalDetalhe({ sip, animais, atendimentos, reproducoes, voltar }) {
  const animal = animais.find(a => a.sip === sip);
  if (!animal) return <p className="text-xs p-4">Animal não localizado no banco.</p>;
  const as = atendimentos.filter(a => a.sip === sip);
  const rs = reproducoes.filter(r => r.sip === sip);

  return (
    <div className="space-y-4 text-left">
      <Btn variant="ghost" onClick={voltar} className="!px-2"><ArrowLeft size={14} /> Voltar</Btn>
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-3"><SipBadge sip={animal.sip} linhagem={animal.linhagem} /><span className="text-sm font-bold">{animal.linhagem} · {animal.sexo}</span></div>
        <p className="text-xs text-gray-400 mt-2">Status Cadastral: {animal.status || "Ativo"}</p>
      </div>
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Linha do Tempo Clínica</h4>
        {as.map(a => <div key={a.id} className="text-xs border-b py-1 last:border-0"><span className="text-gray-400">{fmtDate(a.data)}:</span> {a.diagnostico || "Avaliação"}</div>)}
        {as.length === 0 && <p className="text-xs text-gray-400">Nenhum evento registrado.</p>}
      </div>
    </div>
  );
}
