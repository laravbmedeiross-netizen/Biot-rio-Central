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

// ---------------------------------------------------------------------------
// Camada de dados (Supabase)
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

// ---------------------------------------------------------------------------
// Componentes base
// ---------------------------------------------------------------------------

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
    <label className="block mb-3">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-1">
        {label} {required && <span className="text-[#A6493C]">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-[#D8D3C7] bg-white px-3 py-2 text-sm text-[#2B2B24] focus:outline-none focus:ring-2 focus:ring-[#4A7C7C] focus:border-transparent";

function TextInput(props) {
  return <input {...props} className={inputCls} />;
}
function TextArea(props) {
  return <textarea {...props} className={inputCls + " min-h-[80px] resize-y"} />;
}
function Select({ children, ...props }) {
  return (
    <select {...props} className={inputCls}>
      {children}
    </select>
  );
}

function Btn({ children, variant = "primary", ...props }) {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors";
  const styles = {
    primary: "bg-[#1B3A54] text-white hover:bg-[#15293D]",
    ghost: "bg-transparent text-[#1B3A54] hover:bg-[#1B3A54]/8",
    danger: "bg-transparent text-[#A6493C] hover:bg-[#A6493C]/10 border border-[#A6493C]/20",
  };
  return (
    <button {...props} className={`${base} ${styles[variant]} ${props.className || ""}`}>
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#D8D3C7] rounded-lg">
      <Icon size={28} className="text-[#B5AF9E] mb-3" />
      <p className="text-[#2B2B24] font-medium mb-1">{title}</p>
      <p className="text-sm text-[#8A8574] mb-4">{subtitle}</p>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente de exportação principal
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
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
    return <div className="min-h-screen bg-[#F7F5F0]" />;
  }

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  async function tratarExcluirAnimal(sip) {
    try {
      await deleteRecord("animais", "sip", sip);
      showToast("Animal excluído com sucesso");
      setModulo("animais");
      loadAll();
    } catch (err) {
      showToast("Erro ao excluir. Verifique vínculos clínicos.");
    }
  }

  const buscaLower = busca.trim().toLowerCase();
  const resultadosBusca = buscaLower
    ? animais.filter(
        (a) =>
          (a.sip || "").toLowerCase().includes(buscaLower) ||
          (a.linhagem || "").toLowerCase().includes(buscaLower)
      )
    : [];

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
            const active = modulo === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setModulo(m.id);
                  setAnimalParaEditar(null);
                }}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  active ? "bg-white/10 text-white font-medium" : "text-[#B8CBD6] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {m.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[11px] text-[#7C93A0] mb-2 truncate">{session.user?.email}</p>
          <button onClick={sair} className="w-full flex items-center gap-2 text-sm text-[#B8CBD6] hover:text-white transition-colors">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="border-b border-[#E4E0D4] bg-white/60 px-8 py-3 flex items-center gap-3">
          <Search size={16} className="text-[#8A8574]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar animal por SIP ou linhagem…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#B5AF9E]"
          />
          {loading && <Loader2 size={14} className="animate-spin text-[#8A8574]" />}
        </div>

        {buscaLower ? (
          <BuscaResultados
            resultados={resultadosBusca}
            onSelect={(sip) => {
              setBusca("");
              setModulo(`animal-detalhe:${sip}`);
            }}
          />
        ) : (
          <div className="px-8 py-6">
            {modulo === "dashboard" && (
              <Dashboard animais={animais} atendimentos={atendimentos} necropsias={necropsias} reproducoes={reproducoes} goTo={setModulo} />
            )}
            {modulo === "animais" && (
              <ModuloAnimais 
                animais={animais} reload={loadAll} showToast={showToast} goTo={setModulo}
                forcarEdicao={animalParaEditar} limparForcarEdicao={() => setAnimalParaEditar(null)}
              />
            )}
            {modulo === "atendimentos" && (
              <ModuloAtendimentos atendimentos={atendimentos} animais={animais} reload={loadAll} showToast={showToast} />
            )}
            {modulo === "reproducao" && (
              <ModuloReproducao reproducoes={reproducoes} animais={animais} reload={loadAll} showToast={showToast} />
            )}
            {modulo === "necropsias" && (
              <ModuloNecropsias necropsias={necropsias} animais={animais} reload={loadAll} showToast={showToast} />
            )}
            {modulo.startsWith("animal-detalhe:") && (
              <AnimalDetalhe
                sip={modulo.split(":")[1]} animais={animais} atendimentos={atendimentos} reproducoes={reproducoes} necropsias={necropsias}
                voltar={() => setModulo("animais")} onExcluirAnimal={tratarExcluirAnimal} onEditarAnimal={(animalData) => { setAnimalParaEditar(animalData); setModulo("animais"); }}
              />
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#1B3A54] text-white px-4 py-2.5 rounded-md text-sm flex items-center gap-2 shadow-lg">
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Busca global
// ---------------------------------------------------------------------------

function BuscaResultados({ resultados, onSelect }) {
  return (
    <div className="px-8 py-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5C5C52] mb-3">Resultados ({resultados.length})</h2>
      {resultados.length === 0 ? (
        <p className="text-sm text-[#8A8574]">Nenhum animal encontrado.</p>
      ) : (
        <div className="grid gap-2">
          {resultados.map((a) => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => onSelect(a.sip)} />)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({ animais, atendimentos, necropsias, reproducoes, goTo }) {
  const animaisAtivos = animais.filter((a) => a.status === "Ativo" || !a.status);
  const casaisAtivos = reproducoes.filter((r) => !r.data_displacement && !r.data_encerramento);
  const casaisInativos = reproducoes.filter((r) => !!r.data_displacement || !!r.data_encerramento);

  const atendimentosEmAndamento = atendimentos.filter((at) => !at.desfecho || at.desfecho.trim() === "");
  const atendimentosFinalizados = atendimentos.filter((at) => at.desfecho && at.desfecho.trim() !== "");

  const obterDadosPorLinhagem = () => {
    let mapa = {};
    LINHAGENS.forEach(l => {
      mapa[l] = { ativa: { nascidos: 0, desmamados: 0 }, inativa: { nascidos: 0, desmamados: 0 } };
    });

    reproducoes.forEach(r => {
      const animalMatriz = animais.find(a => a.sip === r.sip);
      const linhagem = animalMatriz?.linhagem || "Wistar";
      if (!LINHAGENS.includes(linhagem)) return;

      const tipoStatus = (!r.data_displacement && !r.data_encerramento) ? "ativa" : "inativa";
      const totalFicha = totaisNinhadas(r.ninhadas);

      mapa[linhagem][tipoStatus].nascidos += totalFicha.nascidos;
      mapa[linhagem][tipoStatus].desmamados += totalFicha.desmamados;
    });
    return mapa;
  };

  const dadosLinhagem = obterDadosPorLinhagem();

  const stats = [
    { label: "Animais Ativos", value: animaisAtivos.length, sub: "População Viva", mod: "animais", icon: PawPrint },
    { label: "Atendimentos Ativos", value: atendimentosEmAndamento.length, sub: `${atendimentosFinalizados.length} finalizados`, mod: "atendimentos", icon: Stethoscope },
    { label: "Casais Ativos", value: casaisAtivos.length, sub: `${casaisInativos.length} inativos`, mod: "reproducao", icon: Heart },
    { label: "Necropsias", value: necropsias.length, sub: "laudos concluídos", mod: "necropsias", icon: Skull },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Visão geral</h2>
      <p className="text-sm text-[#8A8574] mb-6">Mapeamento dinâmico e filtrado da rotina clínica e reprodutiva.</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={() => goTo(s.mod)} className="text-left bg-white border border-[#E4E0D4] rounded-lg p-4 hover:border-[#4A7C7C] transition-colors">
              <Icon size={16} className="text-[#4A7C7C] mb-3" />
              <div className="text-2xl font-semibold text-[#1B3A54]">{s.value}</div>
              <div className="text-xs text-[#5C5C52] mt-1">{s.label}</div>
              <div className="text-[11px] text-[#B5AF9E]">{s.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5C5C52] mb-3">Produtividade por Linhagem (Nascidos e Desmamados)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E4E0D4] text-[#5C5C52]">
                <th className="p-3 font-semibold">Linhagem</th>
                <th className="p-3 font-semibold text-center bg-emerald-50/40">Nascidos (Matrizes Ativas)</th>
                <th className="p-3 font-semibold text-center bg-emerald-50/40 border-r border-[#E4E0D4]">Desmamados (Matrizes Ativas)</th>
                <th className="p-3 font-semibold text-center bg-amber-50/30">Nascidos (Matrizes Inativas)</th>
                <th className="p-3 font-semibold text-center bg-amber-50/30">Desmamados (Matrizes Inativas)</th>
              </tr>
            </thead>
            <tbody>
              {LINHAGENS.map((l) => (
                <tr key={l} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-3 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LINHAGEM_COR[l] }}></span>
                    {l}
                  </td>
                  <td className="p-3 text-center bg-emerald-50/20 text-emerald-800 font-medium">{dadosLinhagem[l].ativa.nascidos}</td>
                  <td className="p-3 text-center bg-emerald-50/20 text-emerald-800 font-medium border-r border-[#E4E0D4]">{dadosLinhagem[l].ativa.desmamados}</td>
                  <td className="p-3 text-center bg-amber-50/10 text-amber-800">{dadosLinhagem[l].inativa.nascidos}</td>
                  <td className="p-3 text-center bg-amber-50/10 text-amber-800">{dadosLinhagem[l].inativa.desmamados}</td>
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

  useEffect(() => {
    if (forcarEdicao) setForm(forcarEdicao);
  }, [forcarEdicao]);

  async function salvar(dados) {
    setSalvando(true);
    try {
      await saveRecord("animais", dados);
      setForm(null);
      limparForcarEdicao();
      showToast(dados.id || dados.created_at ? "Animal atualizado" : "Animal cadastrado");
      reload();
    } catch {
      showToast("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Animais</h2>
          <p className="text-sm text-[#8A8574]">Cadastro central por código SIP.</p>
        </div>
        <Btn onClick={() => { setForm({}); limparForcarEdicao(); }}><Plus size={14} /> Novo animal</Btn>
      </div>

      {form && (
        <AnimalForm 
          inicial={form} animaisExistentes={animais} onSalvar={salvar} 
          onCancelar={() => { setForm(null); limparForcarEdicao(); }} salvando={salvando} 
        />
      )}

      <div className="grid gap-2 mt-4">
        {animais.map((a) => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => goTo(`animal-detalhe:${a.sip}`)} />)}
      </div>
    </div>
  );
}

function AnimalForm({ inicial, animaisExistentes, onSalvar, onCancelar, salvando }) {
  const isEdicao = !!inicial?.sip;
  const [f, setF] = useState({
    sip: "", linhagem: LINHAGENS[0], sexo: "Fêmea", data_nascimento: "", origem: "", categoria: "", 
    ceua_protocolo: "", ceua_professor: "", ceua_pesquisador: "", avos_maternos: "", avos_paternos: "",
    status: "Ativo", observacoes: "", ...inicial,
  });
  const [erro, setErro] = useState("");

  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!f.sip.trim()) return setErro("Código SIP é obrigatório.");
    if (!isEdicao && animaisExistentes.some((a) => a.sip === f.sip.trim())) return setErro("SIP duplicado.");
    onSalvar({ ...f, sip: f.sip.trim() });
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5 shadow-sm">
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Código SIP" required><TextInput value={f.sip} onChange={(e) => upd("sip", e.target.value)} disabled={isEdicao} /></Field>
        <Field label="Linhagem" required><Select value={f.linhagem} onChange={(e) => upd("linhagem", e.target.value)}>{LINHAGENS.map((l) => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Sexo"><Select value={f.sexo} onChange={(e) => upd("sexo", e.target.value)}><option>Fêmea</option><option>Macho</option></Select></Field>
        <Field label="Data nascimento"><TextInput type="date" value={f.data_nascimento || ""} onChange={(e) => upd("data_nascimento", e.target.value)} /></Field>
        <Field label="Categoria"><Select value={f.categoria} onChange={(e) => upd("categoria", e.target.value)}><option value="">Selecione...</option><option value="Matriz">Matriz</option><option value="Reprodutor">Reprodutor</option></Select></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => upd("status", e.target.value)}>{STATUS_ANIMAL.map((s) => <option key={s}>{s}</option>)}</Select></Field>
      </div>
      <Field label="Observações"><TextArea value={f.observacoes || ""} onChange={(e) => upd("observacoes", e.target.value)} /></Field>
      {erro && <p className="text-sm text-red-600 mb-2">{erro}</p>}
      <div className="flex gap-2"><Btn type="submit" disabled={salvando}>Salvar</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Atendimentos
// ---------------------------------------------------------------------------

function ModuloAtendimentos({ atendimentos, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [filtroSip, setFiltroSip] = useState("");
  const [abaInterna, setAbaInterna] = useState("andamento"); 
  const [aberto, setAberto] = useState(null);

  async function salvar(dados) {
    const id = dados.id || genId("atd");
    await saveRecord("atendimentos", { ...dados, id });
    setForm(null);
    showToast("Atendimento registrado");
    reload();
  }

  async function excluir(id) {
    if (confirm("Deseja realmente excluir?")) {
      await deleteRecord("atendimentos", "id", id);
      showToast("Excluído");
      reload();
    }
  }

  const listaFiltradaBase = filtroSip ? atendimentos.filter((a) => a.sip === filtroSip) : atendimentos;
  const listaExibida = listaFiltradaBase.filter((at) => {
    const isFinalizado = at.desfecho && at.desfecho.trim() !== "";
    return abaInterna === "finalizados" ? isFinalizado : !isFinalizado;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold">Fichas de atendimento</h2>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo atendimento</Btn>
      </div>

      {form && <AtendimentoForm inicial={form} animais={animais} onSalvar={salvar} onCancelar={() => setForm(null)} />}

      {!form && (
        <div className="flex justify-between items-center border-b pb-2">
          <div className="flex gap-2">
            <button onClick={() => setAbaInterna("andamento")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${abaInterna === "andamento" ? "bg-[#1B3A54] text-white" : "bg-white border text-[#5C5C52]"}`}>
              Em Andamento ({listaFiltradaBase.filter(at => !at.desfecho || at.desfecho.trim() === "").length})
            </button>
            <button onClick={() => setAbaInterna("finalizados")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${abaInterna === "finalizados" ? "bg-emerald-700 text-white" : "bg-white border text-[#5C5C52]"}`}>
              Finalizados ({listaFiltradaBase.filter(at => at.desfecho && at.desfecho.trim() !== "").length})
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {listaExibida.map((r) => {
          const animal = animais.find((a) => a.sip === r.sip);
          const isAberto = aberto === r.id;
          return (
            <div key={r.id} className="bg-white border rounded-lg p-4">
              <button type="button" onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left flex justify-between items-center">
                <div>
                  <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                  <p className="text-sm mt-1 font-medium">{r.diagnostico || "Avaliação Clínica Inicial"}</p>
                </div>
                <ChevronRight size={16} className={`transition-transform ${isAberto ? "rotate-90" : ""}`} />
              </button>
              {isAberto && (
                <div className="mt-3 pt-3 border-t">
                  <DetalheCampo label="Anamnese" valor={r.anamnese} />
                  <DetalheCampo label="Desfecho" valor={r.desfecho} />
                  <div className="flex gap-2 mt-2">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                    <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs">Excluir</Btn>
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
  const [f, setF] = useState({ sip: "", data: new Date().toISOString().slice(0, 10), anamnese: "", diagnostico: "", desfecho: "", ...inicial });
  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar(f); }} className="bg-white border rounded-lg p-5 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Animal (SIP)" required><Select value={f.sip} onChange={(e) => upd("sip", e.target.value)}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Data"><TextInput type="date" value={f.data} onChange={(e) => upd("data", e.target.value)} /></Field>
      </div>
      <Field label="Anamnese"><TextArea value={f.anamnese} onChange={(e) => upd("anamnese", e.target.value)} /></Field>
      <Field label="Diagnóstico"><TextArea value={f.diagnostico} onChange={(e) => upd("diagnostico", e.target.value)} /></Field>
      <Field label="Desfecho (Preencha para fechar o caso)"><TextArea value={f.desfecho} onChange={(e) => upd("desfecho", e.target.value)} /></Field>
      <div className="flex gap-2"><Btn type="submit">Salvar</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Reprodução (Totalmente corrigido e seguro contra telas brancas)
// ---------------------------------------------------------------------------

function ModuloReproducao({ reproducoes, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [abaCasais, setAbaCasais] = useState("ativos");

  async function salvar(dados) {
    const id = dados.id || genId("rep");
    await saveRecord("reproducao", { ...dados, id });
    setForm(null);
    showToast("Prontuário salvo");
    reload();
  }

  async function excluir(id) {
    if (confirm("Deseja realmente excluir este prontuário reprodutivo?")) {
      await deleteRecord("reproducao", "id", id);
      showToast("Prontuário excluído");
      reload();
    }
  }

  const listaExibida = reproducoes.filter((r) => {
    const isInativo = !!r.data_displacement || !!r.data_encerramento;
    return abaCasais === "inativos" ? isInativo : !isInativo;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Prontuários de reprodução</h2>
          <p className="text-sm text-[#8A8574]">Histórico reprodutivo das matrizes e linhagens.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo prontuário</Btn>
      </div>

      {form && <ReproducaoForm inicial={form} animais={animais} onSalvar={salvar} onCancelar={() => setForm(null)} />}

      {!form && (
        <div className="flex gap-2 border-b border-[#E4E0D4] pb-2 mb-4">
          <button
            onClick={() => setAbaCasais("ativos")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${abaCasais === "ativos" ? "bg-[#1B3A54] text-white" : "bg-white border text-[#5C5C52]"}`}
          >
            Casais Ativos ({reproducoes.filter(r => !r.data_displacement && !r.data_encerramento).length})
          </button>
          <button
            onClick={() => setAbaCasais("inativos")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${abaCasais === "inativos" ? "bg-amber-700 text-white" : "bg-white border text-[#5C5C52]"}`}
          >
            Casais Inativos ({reproducoes.filter(r => r.data_displacement || r.data_encerramento).length})
          </button>
        </div>
      )}

      {listaExibida.length === 0 && !form ? (
        <EmptyState icon={Heart} title={`Nenhum casal ${abaCasais === "ativos" ? "ativo" : "inativo"}`} subtitle="Altere a aba ou registre um novo prontuário." />
      ) : (
        <div className="grid gap-2">
          {listaExibida.map((r) => {
            const animal = animais.find((a) => a.sip === r.sip);
            const tot = totaisNinhadas(r.ninhadas);
            const encerrado = !!r.data_displacement || !!r.data_encerramento;
            const isAberto = aberto === r.id;
            
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <button type="button" onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                      {r.reprodutor_id && <span className="text-xs text-[#8A8574]">× Macho: <strong>{r.reprodutor_id}</strong></span>}
                      {encerrado && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600/10 text-amber-700 font-semibold">Casal Inativo</span>}
                    </div>
                    <ChevronRight size={16} className={`text-[#B5AF9E] transition-transform ${isAberto ? "rotate-90" : ""}`} />
                  </div>
                  <p className="text-sm text-[#5C5C52]">
                    {r.ninhadas?.length || 0} ninhada(s) · {tot.nascidos} nascidos · {tot.desmamados} desmamados
                  </p>
                </button>

                {isAberto && (
                  <div className="mt-3 pt-3 border-t border-[#E4E0D4] space-y-3">
                    {r.ninhadas?.filter((n) => n.data).length > 0 ? (
                      <div className="overflow-x-auto bg-gray-50/50 p-2 rounded-md border">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Datas de Ninhadas Registradas</span>
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-[#8A8574] border-b pb-1 font-semibold">
                              <th className="py-1">Data Parto</th>
                              <th className="py-1 text-center">Nascidos</th>
                              <th className="py-1 text-center">Mortos</th>
                              <th className="py-1 text-center">Desmamados</th>
                              <th className="py-1 pl-2">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.ninhadas.filter(n => n.data).map((n, i) => (
                              <tr key={i} className="border-t border-[#F0EEE5] bg-white">
                                <td className="py-1 font-mono">{fmtDate(n.data)}</td>
                                <td className="py-1 text-center font-medium text-emerald-800">{n.n_nascidos || "0"}</td>
                                <td className="py-1 text-center text-red-700">{n.n_mortos || "0"}</td>
                                <td className="py-1 text-center font-medium text-blue-800">{n.n_desmamados || "0"}</td>
                                <td className="py-1 pl-2 text-gray-500 italic truncate max-w-xs">{n.observacoes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Nenhuma ninhada registrada nesta ficha ainda.</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 bg-gray-50/30 p-2 rounded border">
                      <DetalheCampo label="Genealogia Informada" valor={r.genealogia} />
                      <DetalheCampo label="Histórico Clínico / Notas" valor={r.historico_clinico} />
                      <DetalheCampo label="Intercorrências Coletadas" valor={r.intercorrencias} />
                      <DetalheCampo label="Tratamentos do Casal" valor={r.tratamentos} />
                    </div>

                    {encerrado && (
                      <div className="bg-amber-50/60 border border-amber-200 p-2.5 rounded text-xs text-amber-900">
                        <strong>Dados de Inativação:</strong> Encerrado em {fmtDate(r.data_displacement || r.data_encerramento)} {r.motivo_encerramento ? `— Motivo: ${r.motivo_encerramento}` : ""}
                      </div>
                    )}

                    <div className="flex gap-1 pt-1">
                      <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs"><Edit3 size={12} /> Editar Ficha</Btn>
                      <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={12} /> Excluir</Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReproducaoForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", reprodutor_id: "", genealogia: "", historico_clinico: "", intercorrencias: "", tratamentos: "",
    ninhadas: [{ data: "", n_nascidos: "", n_machos: "", n_femeas: "", n_mortos: "", n_desmamados: "", observacoes: "" }],
    data_displacement: "", data_encerramento: "", motivo_encerramento: "", ...inicial,
  });
  const [erro, setErro] = useState("");

  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }
  function updNinhada(i, k, v) {
    setF((s) => {
      const n = [...s.ninhadas];
      n[i] = { ...n[i], [k]: v };
      return { ...s, ninhadas: n };
    });
  }
  function addNinhada() {
    setF((s) => ({ ...s, ninhadas: [...s.ninhadas, { data: "", n_nascidos: "", n_machos: "", n_femeas: "", n_mortos: "", n_desmamados: "", observacoes: "" }] }));
  }
  function rmNinhada(i) {
    setF((s) => ({ ...s, ninhadas: f.ninhadas.filter((_, idx) => idx !== i) }));
  }

  function submit(e) {
    e.preventDefault();
    if (!f.sip) return setErro("Selecione a matriz.");
    setErro("");
    onSalvar(f);
  }

  return (
    <form onSubmit={submit} className="bg-white border rounded-lg p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Matriz (Fêmea)" required>
          <Select value={f.sip} onChange={(e) => upd("sip", e.target.value)}>
            <option value="">Selecione…</option>
            {animais.filter(a => a.sexo === "Fêmea").map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
          </Select>
        </Field>
        <Field label="Reprodutor (Macho)">
          <Select value={f.reprodutor_id} onChange={(e) => upd("reprodutor_id", e.target.value)}>
            <option value="">Selecione…</option>
            {animais.filter(a => a.sexo === "Macho").map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Genealogia Rastreável"><TextInput value={f.genealogia || ""} onChange={(e) => upd("genealogia", e.target.value)} /></Field>
      <Field label="Histórico Clínico da Fêmea"><TextArea value={f.historico_clinico || ""} onChange={(e) => upd("historico_clinico", e.target.value)} /></Field>

      <div className="border-t pt-3">
        <span className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Lançamento de Ninhadas</span>
        {f.ninhadas.map((n, i) => (
          <div key={i} className="bg-gray-50 p-3 rounded mb-2 border space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div><span className="text-[10px] text-gray-400 block uppercase font-bold">Data Parto</span><TextInput type="date" value={n.data || ""} onChange={(e) => updNinhada(i, "data", e.target.value)} /></div>
              <div><span className="text-[10px] text-gray-400 block uppercase font-bold">Nascidos</span><TextInput type="number" value={n.n_nascidos || ""} onChange={(e) => updNinhada(i, "n_nascidos", e.target.value)} /></div>
              <div><span className="text-[10px] text-gray-400 block uppercase font-bold">Mortos</span><TextInput type="number" value={n.n_mortos || ""} onChange={(e) => updNinhada(i, "n_mortos", e.target.value)} /></div>
              <div><span className="text-[10px] text-gray-400 block uppercase font-bold">Desmamados</span><TextInput type="number" value={n.n_desmamados || ""} onChange={(e) => updNinhada(i, "n_desmamados", e.target.value)} /></div>
            </div>
            <div className="flex gap-2 items-center">
              <TextInput placeholder="Observações/Intercorrências do Parto" value={n.observacoes || ""} onChange={(e) => updNinhada(i, "observacoes", e.target.value)} />
              <button type="button" onClick={() => rmNinhada(i)} className="text-xs text-red-600 font-bold px-2">Remover</button>
            </div>
          </div>
        ))}
        <Btn type="button" variant="ghost" onClick={addNinhada}>+ Adicionar Linha de Ninhada</Btn>
      </div>

      <div className="border-t pt-3 grid grid-cols-2 gap-4">
        <Field label="Data Encerramento do Casal">
          <TextInput type="date" value={f.data_displacement || f.data_id || f.data_encerramento || ""} onChange={(e) => { upd("data_encerramento", e.target.value); upd("data_displacement", e.target.value); }} />
        </Field>
        <Field label="Motivo da Inativação"><TextInput value={f.motivo_encerramento || ""} onChange={(e) => upd("motivo_encerramento", e.target.value)} placeholder="Ex: Idade avançada, descarte, óbito" /></Field>
      </div>

      {erro && <p className="text-xs text-red-600 font-semibold">{erro}</p>}
      <div className="flex gap-2"><Btn type="submit">Salvar Prontuário</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Necropsias
// ---------------------------------------------------------------------------

function ModuloNecropsias({ necropsias, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aberto, setAberto] = useState(null);

  async function salvar(dados) {
    const id = dados.id || genId("necro");
    await saveRecord("necropsias", { ...dados, id });
    setForm(null);
    showToast("Necropsia registrada");
    reload();
  }

  async function excluir(id) {
    if (confirm("Deseja realmente excluir este laudo de necropsia?")) {
      await deleteRecord("necropsias", "id", id);
      showToast("Necropsia excluída");
      reload();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Necropsias</h2>
          <p className="text-sm text-[#8A8574]">Histórico, avaliação externa/interna, coletas e diagnóstico macroscópico.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Nova necropsia</Btn>
      </div>

      {form && <NecropsiaForm inicial={form} animais={animais} onSalvar={salvar} onCancelar={() => setForm(null)} />}

      <div className="grid gap-2">
        {necropsias.map((r) => {
          const animal = animais.find((a) => a.sip === r.sip);
          const isAberto = aberto === r.id;
          return (
            <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
              <button type="button" onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    <span className="text-xs text-[#B5AF9E]">{fmtDate(r.data)} · {r.responsavel || "Sem patologista"}</span>
                  </div>
                  <ChevronRight size={16} className={`text-[#B5AF9E] transition-transform ${isAberto ? "rotate-90" : ""}`} />
                </div>
                <p className="text-sm text-[#2B2B24]"><span className="font-medium text-slate-500">Diagnóstico macroscópico:</span> {r.diagnostico_macroscopico || "—"}</p>
              </button>

              {isAberto && (
                <div className="mt-3 pt-3 border-t border-[#E4E0D4]">
                  <DetalheCampo label="Histórico" valor={r.historico} />
                  {ACHADOS_SISTEMA.map((s) => <DetalheCampo key={s.k} label={s.label} valor={r[s.k]} />)}
                  <DetalheCampo label="Diagnóstico Conclusivo" valor={r.diagnostico_final} />
                  <div className="flex gap-1 mt-3">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                    <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs">Excluir</Btn>
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

const ACHADOS_SISTEMA = [
  { k: "ach_respiratorio", label: "Sistema respiratório" },
  { k: "ach_digestorio", label: "Sistema digestório" },
  { k: "ach_urogenital", label: "Sistema urogenital" },
  { k: "ach_cardiovascular", label: "Sistema cardiovascular" },
  { k: "ach_nervoso", label: "Sistema nervoso" },
  { k: "ach_outros", label: "Outros achados" },
];

function NecropsiaForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "",
    historico: "", condicao_carcaca: "Fresca", bcs: "3", cromodacriorreia: "0",
    avaliacao_externa: "", ach_respiratorio: "", ach_digestorio: "", ach_urogenital: "",
    ach_cardiovascular: "", ach_nervoso: "", ach_outros: "", coletas: "", exames_enviados: "",
    diagnostico_macroscopico: "", diagnostico_final: "", destino: "Descarte", ...inicial,
  });
  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar(f); }} className="bg-white border rounded-lg p-5 space-y-4">
      <div className="grid grid-cols-3 gap-x-4">
        <Field label="Animal (SIP)" required><Select value={f.sip} onChange={(e) => upd("sip", e.target.value)}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Data laudo" required><TextInput type="date" value={f.data} onChange={(e) => upd("data", e.target.value)} /></Field>
        <Field label="Patologista"><TextInput value={f.responsavel} onChange={(e) => upd("responsavel", e.target.value)} /></Field>
      </div>
      <Field label="Histórico clínico"><TextArea value={f.historico} onChange={(e) => upd("historico", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-4">
        {ACHADOS_SISTEMA.map(s => <Field key={s.k} label={s.label}><TextArea value={f[s.k] || ""} onChange={(e) => upd(s.k, e.target.value)} /></Field>)}
      </div>
      <Field label="Diagnóstico Final (Conclusivo)"><TextArea value={f.diagnostico_final} onChange={(e) => upd("diagnostico_final", e.target.value)} /></Field>
      <div className="flex gap-2"><Btn type="submit">Salvar</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn></div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Detalhe do animal
// ---------------------------------------------------------------------------

function AnimalDetalhe({ sip, animais, atendimentos, reproducoes, necropsias, voltar, onEditarAnimal, onExcluirAnimal }) {
  const animal = animais.find((a) => a.sip === sip);
  if (!animal) return <p className="text-sm text-[#8A8574]">Animal não encontrado.</p>;

  const seusAtendimentos = atendimentos.filter((a) => a.sip === sip);
  const seuProntuario = reproducoes.filter((r) => r.sip === sip || r.reprodutor_id === sip);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Btn variant="ghost" onClick={voltar} className="!px-2"><ArrowLeft size={14} /> Voltar</Btn>
        <div className="flex gap-2">
          <Btn variant="danger" onClick={() => { if (confirm(`Deseja excluir permanentemente o animal ${animal.sip}?`)) onExcluirAnimal(animal.sip); }}><Trash2 size={14} /> Excluir Animal</Btn>
          <Btn onClick={() => onEditarAnimal(animal)} className="!bg-[#4A7C7C] hover:!bg-[#3A6363]"><Edit3 size={14} /> Editar Dados</Btn>
        </div>
      </div>
      
      <div className="bg-white border border-[#E4E0D4] rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <SipBadge sip={animal.sip} linhagem={animal.linhagem} />
          <span className="text-sm font-semibold text-[#1B3A54]">{animal.linhagem} · {animal.sexo}</span>
        </div>
        <p className="text-xs text-gray-500">Status: <strong>{animal.status || "Ativo"}</strong> | Categoria: {animal.categoria || "—"}</p>
      </div>

      <Secao titulo={`Atendimentos (${seusAtendimentos.length})`}>
        {seusAtendimentos.map(r => (
          <div key={r.id} className="py-2 border-b last:border-0 text-xs">
            <span className="text-gray-400">{fmtDate(r.data)}:</span> {r.diagnostico || "Avaliação Clínica"}
          </div>
        ))}
      </Secao>

      <Secao titulo={`Histórico Reprodutivo Associado (${seuProntuario.length})`}>
        {seuProntuario.map(r => (
          <div key={r.id} className="py-2 border-b last:border-0 text-xs">
            Matriz: {r.sip} × Macho: {r.reprodutor_id || "—"}
          </div>
        ))}
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5C5C52] mb-2">{titulo}</h3>
      <div className="bg-white border border-[#E4E0D4] rounded-lg px-4 py-2">{children.length === 0 ? <p className="text-xs text-gray-400 py-1">Nenhum registro.</p> : children}</div>
    </div>
  );
}
