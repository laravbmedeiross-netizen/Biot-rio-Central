import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronRight, X, Save, Home, PawPrint, Stethoscope,
  Heart, Skull, AlertTriangle, Trash2, ArrowLeft, Loader2, Check, LogOut
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
  if (error) console.error(`Erro ao excluir de ${table}:`, error.message);
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
    danger: "bg-transparent text-[#A6493C] hover:bg-[#A6493C]/10",
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

function ConfigAviso() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0] px-6">
      <div className="max-w-md bg-white border border-[#E4E0D4] rounded-lg p-6 text-center">
        <AlertTriangle size={24} className="text-[#C9852B] mx-auto mb-3" />
        <h2 className="font-semibold mb-2">Configuração pendente</h2>
        <p className="text-sm text-[#5C5C52]">
          As variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> não
          foram configuradas. Copie <code>.env.example</code> para <code>.env</code>, preencha
          com os dados do seu projeto Supabase e rode <code>npm run dev</code> novamente (ou
          configure as mesmas variáveis no painel da Vercel).
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
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
    return <ConfigAviso />;
  }

  if (session === undefined) {
    return null;
  }

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function sair() {
    await supabase.auth.signOut();
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
                onClick={() => setModulo(m.id)}
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
          <button
            onClick={sair}
            className="w-full flex items-center gap-2 text-sm text-[#B8CBD6] hover:text-white transition-colors"
          >
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
              <ModuloAnimais animais={animais} reload={loadAll} showToast={showToast} goTo={setModulo} />
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
                sip={modulo.split(":")[1]}
                animais={animais}
                atendimentos={atendimentos}
                reproducoes={reproducoes}
                necropsias={necropsias}
                voltar={() => setModulo("animais")}
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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5C5C52] mb-3">
        Resultados ({resultados.length})
      </h2>
      {resultados.length === 0 ? (
        <p className="text-sm text-[#8A8574]">Nenhum animal encontrado.</p>
      ) : (
        <div className="grid gap-2">
          {resultados.map((a) => (
            <button
              key={a.sip}
              onClick={() => onSelect(a.sip)}
              className="flex items-center justify-between bg-white border border-[#E4E0D4] rounded-lg px-4 py-3 hover:border-[#4A7C7C] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <SipBadge sip={a.sip} linhagem={a.linhagem} />
                <span className="text-sm text-[#5C5C52]">{a.linhagem} · {a.sexo}</span>
              </div>
              <ChevronRight size={16} className="text-[#B5AF9E]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({ animais, atendimentos, necropsias, reproducoes, goTo }) {
  const ativos = animais.filter((a) => a.status === "Ativo").length;
  const stats = [
    { label: "Animais cadastrados", value: animais.length, sub: `${ativos} ativos`, mod: "animais", icon: PawPrint },
    { label: "Atendimentos registrados", value: atendimentos.length, sub: "fichas veterinárias", mod: "atendimentos", icon: Stethoscope },
    { label: "Prontuários de reprodução", value: reproducoes.length, sub: "matrizes acompanhadas", mod: "reproducao", icon: Heart },
    { label: "Necropsias", value: necropsias.length, sub: "registros", mod: "necropsias", icon: Skull },
  ];
  const recentes = atendimentos.slice(0, 5);

  const totNinhadas = reproducoes.reduce((acc, r) => acc + (r.ninhadas?.length || 0), 0);
  const totGeral = reproducoes.reduce(
    (acc, r) => {
      const t = totaisNinhadas(r.ninhadas);
      return {
        nascidos: acc.nascidos + t.nascidos,
        mortos: acc.mortos + t.mortos,
        desmamados: acc.desmamados + t.desmamados,
      };
    },
    { nascidos: 0, mortos: 0, desmamados: 0 }
  );
  const taxaSobrevivencia = totGeral.nascidos > 0
    ? Math.round(((totGeral.nascidos - totGeral.mortos) / totGeral.nascidos) * 100)
    : null;
  const matrizesAtivas = reproducoes.filter((r) => !r.data_encerramento).length;
  const mediaNinhadaPorMatriz = reproducoes.length > 0 ? (totNinhadas / reproducoes.length).toFixed(1) : "0";

  const indicadores = [
    { label: "Ninhadas registradas", value: totNinhadas },
    { label: "Total de nascidos", value: totGeral.nascidos },
    { label: "Taxa de sobrevivência", value: taxaSobrevivencia !== null ? `${taxaSobrevivencia}%` : "—" },
    { label: "Matrizes ativas", value: matrizesAtivas },
    { label: "Média de ninhadas/matriz", value: mediaNinhadaPorMatriz },
    { label: "Desmamados (total)", value: totGeral.desmamados },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Visão geral</h2>
      <p className="text-sm text-[#8A8574] mb-6">Registros clínicos e reprodutivos do biotério, sincronizados entre a equipe.</p>

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

      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5C5C52] mb-3">Indicadores reprodutivos</h3>
      <div className="grid grid-cols-6 gap-3 mb-8">
        {indicadores.map((i) => (
          <div key={i.label} className="bg-white border border-[#E4E0D4] rounded-lg p-3">
            <div className="text-lg font-semibold text-[#1B3A54]">{i.value}</div>
            <div className="text-[11px] text-[#8A8574] leading-tight mt-0.5">{i.label}</div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5C5C52] mb-3">Atendimentos recentes</h3>
      {recentes.length === 0 ? (
        <EmptyState icon={Stethoscope} title="Nenhum atendimento ainda" subtitle="Registre a primeira ficha de atendimento veterinário." action={<Btn onClick={() => goTo("atendimentos")}><Plus size={14} /> Novo atendimento</Btn>} />
      ) : (
        <div className="grid gap-2">
          {recentes.map((r) => {
            const animal = animais.find((a) => a.sip === r.sip);
            return (
              <div key={r.id} className="flex items-center justify-between bg-white border border-[#E4E0D4] rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                  <span className="text-sm text-[#5C5C52] truncate max-w-md">{r.diagnostico || r.anamnese || "—"}</span>
                </div>
                <span className="text-xs text-[#B5AF9E]">{fmtDate(r.data)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Módulo Animais
// ---------------------------------------------------------------------------

function ModuloAnimais({ animais, reload, showToast, goTo }) {
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(dados) {
    setSalvando(true);
    try {
      await saveRecord("animais", dados);
      setForm(null);
      showToast("Animal cadastrado");
      reload();
    } catch {
      showToast("Erro ao salvar — confira o console");
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
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo animal</Btn>
      </div>

      {form && <AnimalForm inicial={form} animaisExistentes={animais} onSalvar={salvar} onCancelar={() => setForm(null)} salvando={salvando} />}

      {animais.length === 0 && !form ? (
        <EmptyState icon={PawPrint} title="Nenhum animal cadastrado" subtitle="Cadastre o primeiro animal usando o código SIP." action={<Btn onClick={() => setForm({})}><Plus size={14} /> Novo animal</Btn>} />
      ) : (
        <div className="grid gap-2 mt-4">
          {animais.map((a) => (
            <button key={a.sip} onClick={() => goTo(`animal-detalhe:${a.sip}`)} className="flex items-center justify-between bg-white border border-[#E4E0D4] rounded-lg px-4 py-3 hover:border-[#4A7C7C] transition-colors text-left">
              <div className="flex items-center gap-3">
                <SipBadge sip={a.sip} linhagem={a.linhagem} />
                <span className="text-sm text-[#5C5C52]">{a.sexo} · nasc. {fmtDate(a.data_nascimento)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "Ativo" ? "bg-[#4A7C7C]/10 text-[#3A6363]" : "bg-[#A6493C]/10 text-[#A6493C]"}`}>
                  {a.status || "Ativo"}
                </span>
                <ChevronRight size={16} className="text-[#B5AF9E]" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AnimalForm({ inicial, animaisExistentes, onSalvar, onCancelar, salvando }) {
  const [f, setF] = useState({
    sip: "", linhagem: LINHAGENS[0], sexo: "Fêmea", data_nascimento: "", origem: "", status: "Ativo", observacoes: "", ...inicial,
  });
  const [erro, setErro] = useState("");

  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!f.sip.trim()) return setErro("Código SIP é obrigatório.");
    if (!inicial?.sip && animaisExistentes.some((a) => a.sip === f.sip.trim())) {
      return setErro("Já existe um animal com esse código SIP.");
    }
    setErro("");
    onSalvar({ ...f, sip: f.sip.trim() });
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5">
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Código SIP" required>
          <TextInput value={f.sip} onChange={(e) => upd("sip", e.target.value)} placeholder="BC_B6_ATEND_015.26" />
        </Field>
        <Field label="Linhagem" required>
          <Select value={f.linhagem} onChange={(e) => upd("linhagem", e.target.value)}>
            {LINHAGENS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Sexo">
          <Select value={f.sexo} onChange={(e) => upd("sexo", e.target.value)}>
            <option>Fêmea</option><option>Macho</option>
          </Select>
        </Field>
        <Field label="Data de nascimento">
          <TextInput type="date" value={f.data_nascimento || ""} onChange={(e) => upd("data_nascimento", e.target.value)} />
        </Field>
        <Field label="Origem">
          <TextInput value={f.origem} onChange={(e) => upd("origem", e.target.value)} placeholder="Ex: matriz BC_SW_012.25" />
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => upd("status", e.target.value)}>
            {STATUS_ANIMAL.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Observações">
        <TextArea value={f.observacoes} onChange={(e) => upd("observacoes", e.target.value)} />
      </Field>
      {erro && <p className="text-sm text-[#A6493C] mb-3">{erro}</p>}
      <div className="flex gap-2">
        <Btn type="submit" disabled={salvando}>{salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar</Btn>
        <Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Atendimentos
// ---------------------------------------------------------------------------

function ModuloAtendimentos({ atendimentos, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [filtroSip, setFiltroSip] = useState("");

  async function salvar(dados) {
    const id = dados.id || genId("atd");
    await saveRecord("atendimentos", { ...dados, id });
    setForm(null);
    showToast("Atendimento registrado");
    reload();
  }

  async function excluir(id) {
    await deleteRecord("atendimentos", "id", id);
    showToast("Atendimento excluído");
    reload();
  }

  const lista = filtroSip ? atendimentos.filter((a) => a.sip === filtroSip) : atendimentos;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Fichas de atendimento</h2>
          <p className="text-sm text-[#8A8574]">Anamnese, exame físico por sistemas, diagnóstico e evolução clínica.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo atendimento</Btn>
      </div>

      {form && <AtendimentoForm inicial={form} animais={animais} onSalvar={salvar} onCancelar={() => setForm(null)} />}

      {!form && animais.length > 0 && (
        <div className="mb-3">
          <Select value={filtroSip} onChange={(e) => setFiltroSip(e.target.value)} className={inputCls + " w-64"}>
            <option value="">Todos os animais</option>
            {animais.map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
          </Select>
        </div>
      )}

      {lista.length === 0 && !form ? (
        <EmptyState icon={Stethoscope} title="Nenhum atendimento" subtitle="Registre a primeira ficha de atendimento." action={<Btn onClick={() => setForm({})}><Plus size={14} /> Novo atendimento</Btn>} />
      ) : (
        <div className="grid gap-2">
          {lista.map((r) => {
            const animal = animais.find((a) => a.sip === r.sip);
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    <span className="text-xs text-[#B5AF9E]">{fmtDate(r.data)} · {r.responsavel}</span>
                  </div>
                  <div className="flex gap-1">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                    <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={13} /></Btn>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-[#8A8574] mb-1">
                  {r.peso && <span>Peso: {r.peso}g</span>}
                  {r.temperatura && <span>Temp: {r.temperatura}°C</span>}
                  {r.escore_corporal && <span>BCS: {r.escore_corporal}</span>}
                </div>
                <p className="text-sm text-[#2B2B24]"><span className="font-medium">Diagnóstico:</span> {r.diagnostico || "—"}</p>
                <p className="text-sm text-[#5C5C52]"><span className="font-medium">Conduta:</span> {r.conduta || "—"}</p>
                {r.evolucoes?.length > 0 && (
                  <p className="text-xs text-[#4A7C7C] mt-1">{r.evolucoes.length} registro(s) de evolução clínica</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SISTEMAS_ATENDIMENTO = [
  { k: "sist_comportamental", label: "Comportamental" },
  { k: "sist_dermatologico", label: "Dermatológico / tegumentar" },
  { k: "sist_respiratorio", label: "Respiratório" },
  { k: "sist_digestorio", label: "Digestório" },
  { k: "sist_neurologico", label: "Neurológico" },
  { k: "sist_reprodutivo", label: "Reprodutivo" },
];

function AtendimentoForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "",
    anamnese: "",
    peso: "", temperatura: "", escore_corporal: "3", mucosas: "", hidratacao: "",
    exame_fisico: "",
    sist_comportamental: "", sist_dermatologico: "", sist_respiratorio: "",
    sist_digestorio: "", sist_neurologico: "", sist_reprodutivo: "",
    sinais_objetivos: "",
    diagnostico: "", conduta: "", tratamento: "", exames_laboratoriais: "",
    evolucoes: [],
    retorno: "", desfecho: "",
    ...inicial,
  });
  const [erro, setErro] = useState("");

  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }

  function updEvol(i, k, v) {
    setF((s) => {
      const ev = [...s.evolucoes];
      ev[i] = { ...ev[i], [k]: v };
      return { ...s, evolucoes: ev };
    });
  }
  function addEvol() {
    setF((s) => ({ ...s, evolucoes: [...s.evolucoes, { data: new Date().toISOString().slice(0, 10), observacao: "", responsavel: "" }] }));
  }
  function rmEvol(i) {
    setF((s) => ({ ...s, evolucoes: s.evolucoes.filter((_, idx) => idx !== i) }));
  }

  const animalSel = animais.find((a) => a.sip === f.sip);
  const alertas = animalSel ? ALERTAS_LINHAGEM[animalSel.linhagem] || [] : [];

  function submit(e) {
    e.preventDefault();
    if (!f.sip) return setErro("Selecione o animal (SIP).");
    if (!f.data) return setErro("Informe a data.");
    setErro("");
    onSalvar(f);
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5">
      <SecaoForm titulo="Identificação">
        <div className="grid grid-cols-3 gap-x-4">
          <Field label="Animal (SIP)" required>
            <Select value={f.sip} onChange={(e) => upd("sip", e.target.value)}>
              <option value="">Selecione…</option>
              {animais.map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
            </Select>
          </Field>
          <Field label="Data" required>
            <TextInput type="date" value={f.data} onChange={(e) => upd("data", e.target.value)} />
          </Field>
          <Field label="Responsável">
            <TextInput value={f.responsavel} onChange={(e) => upd("responsavel", e.target.value)} placeholder="Nome" />
          </Field>
        </div>
        {alertas.length > 0 && (
          <div className="flex items-start gap-2 bg-[#C9852B]/10 border border-[#C9852B]/40 rounded-md px-3 py-2 text-sm text-[#8A5E1F]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>Alertas típicos de {animalSel.linhagem}: <strong>{alertas.join(", ")}</strong></span>
          </div>
        )}
      </SecaoForm>

      <SecaoForm titulo="Anamnese">
        <TextArea value={f.anamnese} onChange={(e) => upd("anamnese", e.target.value)} placeholder="Queixa principal, histórico, tempo de evolução…" />
      </SecaoForm>

      <SecaoForm titulo="Exame físico geral">
        <div className="grid grid-cols-3 gap-x-4">
          <Field label="Peso (g)"><TextInput value={f.peso} onChange={(e) => upd("peso", e.target.value)} /></Field>
          <Field label="Temperatura (°C)"><TextInput value={f.temperatura} onChange={(e) => upd("temperatura", e.target.value)} /></Field>
          <Field label="Escore corporal (BCS)">
            <Select value={f.escore_corporal} onChange={(e) => upd("escore_corporal", e.target.value)}>
              {BCS_OPCOES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Mucosas"><TextInput value={f.mucosas} onChange={(e) => upd("mucosas", e.target.value)} placeholder="Ex: normocoradas" /></Field>
          <Field label="Hidratação"><TextInput value={f.hidratacao} onChange={(e) => upd("hidratacao", e.target.value)} placeholder="Ex: normal, leve desidratação" /></Field>
        </div>
        <Field label="Observações do exame físico geral"><TextArea value={f.exame_fisico} onChange={(e) => upd("exame_fisico", e.target.value)} /></Field>
      </SecaoForm>

      <SecaoForm titulo="Exame por sistemas">
        <div className="grid grid-cols-2 gap-x-4">
          {SISTEMAS_ATENDIMENTO.map((s) => (
            <Field key={s.k} label={s.label}>
              <TextArea value={f[s.k]} onChange={(e) => upd(s.k, e.target.value)} />
            </Field>
          ))}
        </div>
      </SecaoForm>

      <SecaoForm titulo="Sinais objetivos e diagnóstico">
        <Field label="Sinais objetivos"><TextArea value={f.sinais_objetivos} onChange={(e) => upd("sinais_objetivos", e.target.value)} /></Field>
        <Field label="Diagnóstico / interpretação"><TextArea value={f.diagnostico} onChange={(e) => upd("diagnostico", e.target.value)} /></Field>
        <Field label="Exames laboratoriais solicitados/realizados"><TextArea value={f.exames_laboratoriais} onChange={(e) => upd("exames_laboratoriais", e.target.value)} /></Field>
      </SecaoForm>

      <SecaoForm titulo="Conduta e tratamento">
        <Field label="Conduta"><TextArea value={f.conduta} onChange={(e) => upd("conduta", e.target.value)} /></Field>
        <Field label="Tratamento"><TextArea value={f.tratamento} onChange={(e) => upd("tratamento", e.target.value)} /></Field>
      </SecaoForm>

      <SecaoForm titulo="Evolução clínica">
        <div className="space-y-2 mb-3">
          {f.evolucoes.map((ev, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-start bg-[#F7F5F0] rounded-md p-3">
              <TextInput type="date" value={ev.data} onChange={(e) => updEvol(i, "data", e.target.value)} />
              <TextInput value={ev.responsavel} onChange={(e) => updEvol(i, "responsavel", e.target.value)} placeholder="Responsável" />
              <TextInput value={ev.observacao} onChange={(e) => updEvol(i, "observacao", e.target.value)} placeholder="Observação da evolução" />
              <button type="button" onClick={() => rmEvol(i)} className="text-[#A6493C] p-2"><X size={14} /></button>
            </div>
          ))}
        </div>
        <Btn type="button" variant="ghost" onClick={addEvol}><Plus size={14} /> Adicionar evolução</Btn>
      </SecaoForm>

      <SecaoForm titulo="Retorno e desfecho">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Retorno / acompanhamento"><TextInput value={f.retorno} onChange={(e) => upd("retorno", e.target.value)} /></Field>
          <Field label="Desfecho"><TextInput value={f.desfecho} onChange={(e) => upd("desfecho", e.target.value)} /></Field>
        </div>
      </SecaoForm>

      {erro && <p className="text-sm text-[#A6493C] mb-3">{erro}</p>}
      <div className="flex gap-2">
        <Btn type="submit"><Save size={14} /> Salvar atendimento</Btn>
        <Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Módulo Reprodução
// ---------------------------------------------------------------------------

function calcIdade(dataNasc) {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc + "T00:00:00");
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
  if (hoje.getDate() < nasc.getDate()) meses--;
  if (meses < 0) return null;
  if (meses < 1) return "< 1 mês";
  const anos = Math.floor(meses / 12);
  const restoMeses = meses % 12;
  if (anos === 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  return `${anos}a ${restoMeses}m`;
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

function ModuloReproducao({ reproducoes, animais, reload, showToast }) {
  const [form, setForm] = useState(null);

  async function salvar(dados) {
    const id = dados.id || genId("rep");
    await saveRecord("reproducao", { ...dados, id });
    setForm(null);
    showToast("Prontuário salvo");
    reload();
  }

  async function excluir(id) {
    await deleteRecord("reproducao", "id", id);
    showToast("Prontuário excluído");
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Prontuários de reprodução</h2>
          <p className="text-sm text-[#8A8574]">Ficha completa da matriz — genealogia, ninhadas, clínica e monitoramento.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Novo prontuário</Btn>
      </div>

      {form && <ReproducaoForm inicial={form} animais={animais} onSalvar={salvar} onCancelar={() => setForm(null)} />}

      {reproducoes.length === 0 && !form ? (
        <EmptyState icon={Heart} title="Nenhum prontuário" subtitle="Registre o histórico reprodutivo de uma matriz." action={<Btn onClick={() => setForm({})}><Plus size={14} /> Novo prontuário</Btn>} />
      ) : (
        <div className="grid gap-2">
          {reproducoes.map((r) => {
            const animal = animais.find((a) => a.sip === r.sip);
            const tot = totaisNinhadas(r.ninhadas);
            const encerrado = !!r.data_encerramento;
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    {r.sip_parceiro && <span className="text-xs text-[#8A8574]">× {r.sip_parceiro}</span>}
                    {encerrado && <span className="text-xs px-2 py-0.5 rounded-full bg-[#A6493C]/10 text-[#A6493C]">Encerrada</span>}
                  </div>
                  <div className="flex gap-1">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                    <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={13} /></Btn>
                  </div>
                </div>

                {r.ninhadas?.length > 0 ? (
                  <div className="overflow-x-auto mb-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#8A8574] text-left">
                          <th className="pr-3 py-1 font-medium">Data</th>
                          <th className="pr-3 py-1 font-medium">Nascidos</th>
                          <th className="pr-3 py-1 font-medium">Machos</th>
                          <th className="pr-3 py-1 font-medium">Fêmeas</th>
                          <th className="pr-3 py-1 font-medium">Mortos</th>
                          <th className="pr-3 py-1 font-medium">Desmamados</th>
                          <th className="py-1 font-medium">Observações</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#2B2B24]">
                        {r.ninhadas.map((n, i) => (
                          <tr key={i} className="border-t border-[#F0EEE5]">
                            <td className="pr-3 py-1">{fmtDate(n.data)}</td>
                            <td className="pr-3 py-1">{n.n_nascidos || "—"}</td>
                            <td className="pr-3 py-1">{n.n_machos || "—"}</td>
                            <td className="pr-3 py-1">{n.n_femeas || "—"}</td>
                            <td className="pr-3 py-1">{n.n_mortos || "—"}</td>
                            <td className="pr-3 py-1">{n.n_desmamados || "—"}</td>
                            <td className="py-1 text-[#5C5C52]">{n.observacoes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[11px] text-[#B5AF9E] mt-1">
                      Total: {tot.nascidos} nascidos · {tot.machos}M/{tot.femeas}F · {tot.mortos} mortos · {tot.desmamados} desmamados
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[#8A8574] mb-1">Nenhuma ninhada registrada ainda.</p>
                )}

                {r.genealogia && <p className="text-sm text-[#2B2B24]"><span className="font-medium">Genealogia:</span> {r.genealogia}</p>}
                {r.historico_clinico && <p className="text-sm text-[#2B2B24]"><span className="font-medium">Histórico clínico:</span> {r.historico_clinico}</p>}
                {r.intercorrencias && <p className="text-sm text-[#2B2B24]"><span className="font-medium">Intercorrências:</span> {r.intercorrencias}</p>}
                {encerrado && <p className="text-sm text-[#A6493C] mt-1"><span className="font-medium">Encerramento ({fmtDate(r.data_encerramento)}):</span> {r.motivo_encerramento || "—"}</p>}
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
    sip: "", sip_parceiro: "", genealogia: "",
    historico_clinico: "", intercorrencias: "", tratamentos: "",
    ninhadas: [{ data: "", n_nascidos: "", n_machos: "", n_femeas: "", n_mortos: "", n_desmamados: "", observacoes: "" }],
    monitoramento: [{ data: "", peso: "", bcs: "3", observacoes: "" }],
    data_encerramento: "", motivo_encerramento: "",
    ...inicial,
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
    setF((s) => ({ ...s, ninhadas: s.ninhadas.filter((_, idx) => idx !== i) }));
  }

  function updMonit(i, k, v) {
    setF((s) => {
      const m = [...s.monitoramento];
      m[i] = { ...m[i], [k]: v };
      return { ...s, monitoramento: m };
    });
  }
  function addMonit() {
    setF((s) => ({ ...s, monitoramento: [...s.monitoramento, { data: "", peso: "", bcs: "3", observacoes: "" }] }));
  }
  function rmMonit(i) {
    setF((s) => ({ ...s, monitoramento: s.monitoramento.filter((_, idx) => idx !== i) }));
  }

  function submit(e) {
    e.preventDefault();
    if (!f.sip) return setErro("Selecione a matriz (SIP).");
    setErro("");
    onSalvar(f);
  }

  const femeas = animais.filter((a) => a.sexo === "Fêmea");
  const animalSel = animais.find((a) => a.sip === f.sip);

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5">
      <SecaoForm titulo="Identificação">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Matriz (SIP)" required>
            <Select value={f.sip} onChange={(e) => upd("sip", e.target.value)}>
              <option value="">Selecione…</option>
              {femeas.map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
            </Select>
          </Field>
          <Field label="Parceiro (SIP)">
            <TextInput value={f.sip_parceiro} onChange={(e) => upd("sip_parceiro", e.target.value)} placeholder="Opcional" />
          </Field>
        </div>
        {animalSel && (
          <p className="text-xs text-[#8A8574] -mt-2 mb-3">
            {animalSel.linhagem} · idade atual: {calcIdade(animalSel.data_nascimento) || "—"}
          </p>
        )}
        <Field label="Genealogia (pais / linhagem de origem)">
          <TextArea value={f.genealogia} onChange={(e) => upd("genealogia", e.target.value)} placeholder="Ex: filha de BC_WI_004.25 × BC_WI_009.25" />
        </Field>
      </SecaoForm>

      <SecaoForm titulo="Histórico de ninhadas">
        <div className="space-y-3 mb-3">
          {f.ninhadas.map((n, i) => (
            <div key={i} className="bg-[#F7F5F0] rounded-md p-3">
              <div className="grid grid-cols-6 gap-2 items-end mb-2">
                <div>
                  <span className="block text-[10px] uppercase text-[#8A8574] mb-1">Data</span>
                  <TextInput type="date" value={n.data} onChange={(e) => updNinhada(i, "data", e.target.value)} />
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#8A8574] mb-1">Nascidos</span>
                  <TextInput type="number" min="0" value={n.n_nascidos} onChange={(e) => updNinhada(i, "n_nascidos", e.target.value)} />
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#8A8574] mb-1">Machos</span>
                  <TextInput type="number" min="0" value={n.n_machos} onChange={(e) => updNinhada(i, "n_machos", e.target.value)} />
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#8A8574] mb-1">Fêmeas</span>
                  <TextInput type="number" min="0" value={n.n_femeas} onChange={(e) => updNinhada(i, "n_femeas", e.target.value)} />
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#8A8574] mb-1">Mortos</span>
                  <TextInput type="number" min="0" value={n.n_mortos} onChange={(e) => updNinhada(i, "n_mortos", e.target.value)} />
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[#8A8574] mb-1">Desmamados</span>
                  <TextInput type="number" min="0" value={n.n_desmamados} onChange={(e) => updNinhada(i, "n_desmamados", e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <TextInput value={n.observacoes} onChange={(e) => updNinhada(i, "observacoes", e.target.value)} placeholder="Observações da ninhada" />
                <button type="button" onClick={() => rmNinhada(i)} className="text-[#A6493C] p-2 shrink-0"><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <Btn type="button" variant="ghost" onClick={addNinhada}><Plus size={14} /> Adicionar ninhada</Btn>
      </SecaoForm>

      <SecaoForm titulo="Histórico clínico e intercorrências">
        <Field label="Histórico clínico relevante"><TextArea value={f.historico_clinico} onChange={(e) => upd("historico_clinico", e.target.value)} /></Field>
        <Field label="Intercorrências"><TextArea value={f.intercorrencias} onChange={(e) => upd("intercorrencias", e.target.value)} /></Field>
        <Field label="Tratamentos realizados"><TextArea value={f.tratamentos} onChange={(e) => upd("tratamentos", e.target.value)} /></Field>
      </SecaoForm>

      <SecaoForm titulo="Monitoramento periódico">
        <div className="space-y-2 mb-3">
          {f.monitoramento.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 items-start bg-[#F7F5F0] rounded-md p-3">
              <TextInput type="date" value={m.data} onChange={(e) => updMonit(i, "data", e.target.value)} placeholder="Data" />
              <TextInput type="text" value={m.peso} onChange={(e) => updMonit(i, "peso", e.target.value)} placeholder="Peso (g)" />
              <Select value={m.bcs} onChange={(e) => updMonit(i, "bcs", e.target.value)}>
                {BCS_OPCOES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </Select>
              <TextInput value={m.observacoes} onChange={(e) => updMonit(i, "observacoes", e.target.value)} placeholder="Observações" />
              <button type="button" onClick={() => rmMonit(i)} className="text-[#A6493C] p-2"><X size={14} /></button>
            </div>
          ))}
        </div>
        <Btn type="button" variant="ghost" onClick={addMonit}><Plus size={14} /> Adicionar registro</Btn>
      </SecaoForm>

      <SecaoForm titulo="Encerramento reprodutivo (se aplicável)">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Data de encerramento">
            <TextInput type="date" value={f.data_encerramento} onChange={(e) => upd("data_encerramento", e.target.value)} />
          </Field>
          <Field label="Motivo">
            <TextInput value={f.motivo_encerramento} onChange={(e) => upd("motivo_encerramento", e.target.value)} placeholder="Ex: idade avançada, óbito, descarte" />
          </Field>
        </div>
      </SecaoForm>

      {erro && <p className="text-sm text-[#A6493C] mb-3">{erro}</p>}
      <div className="flex gap-2">
        <Btn type="submit"><Save size={14} /> Salvar prontuário</Btn>
        <Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </form>
  );
}

function SecaoForm({ titulo, children }) {
  return (
    <div className="mb-5 pb-5 border-b border-[#F0EEE5] last:border-0 last:mb-4 last:pb-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4A7C7C] mb-3">{titulo}</h4>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Módulo Necropsias
// ---------------------------------------------------------------------------

function ModuloNecropsias({ necropsias, animais, reload, showToast }) {
  const [form, setForm] = useState(null);

  async function salvar(dados) {
    const id = dados.id || genId("necro");
    await saveRecord("necropsias", { ...dados, id });
    setForm(null);
    showToast("Necropsia registrada");
    reload();
  }

  async function excluir(id) {
    await deleteRecord("necropsias", "id", id);
    showToast("Necropsia excluída");
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Necropsias</h2>
          <p className="text-sm text-[#8A8574]">Histórico, avaliação externa/interna, coletas e diagnóstico.</p>
        </div>
        <Btn onClick={() => setForm({})}><Plus size={14} /> Nova necropsia</Btn>
      </div>

      {form && <NecropsiaForm inicial={form} animais={animais} onSalvar={salvar} onCancelar={() => setForm(null)} />}

      {necropsias.length === 0 && !form ? (
        <EmptyState icon={Skull} title="Nenhuma necropsia" subtitle="Registre o primeiro exame post-mortem." action={<Btn onClick={() => setForm({})}><Plus size={14} /> Nova necropsia</Btn>} />
      ) : (
        <div className="grid gap-2">
          {necropsias.map((r) => {
            const animal = animais.find((a) => a.sip === r.sip);
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    <span className="text-xs text-[#B5AF9E]">{fmtDate(r.data)}</span>
                  </div>
                  <div className="flex gap-1">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                    <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={13} /></Btn>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-[#5C5C52] mb-1">
                  <span>BCS: <strong className="text-[#2B2B24]">{r.bcs || "—"}</strong></span>
                  <span>Cromodacriorreia: <strong className="text-[#2B2B24]">{r.cromodacriorreia ?? "—"}</strong></span>
                  {r.condicao_carcaca && <span>Carcaça: <strong className="text-[#2B2B24]">{r.condicao_carcaca}</strong></span>}
                </div>
                <p className="text-sm text-[#2B2B24]"><span className="font-medium">Diagnóstico macroscópico:</span> {r.diagnostico_macroscopico || "—"}</p>
                <p className="text-sm text-[#2B2B24]"><span className="font-medium">Diagnóstico final:</span> {r.diagnostico_final || "—"}</p>
                {r.coletas && <p className="text-sm text-[#5C5C52]"><span className="font-medium">Coletas:</span> {r.coletas}</p>}
              </div>
            );
          })}
        </div>
      )}
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
    historico: "", condicao_carcaca: "Fresca",
    bcs: "3", cromodacriorreia: "0",
    avaliacao_externa: "",
    ach_respiratorio: "", ach_digestorio: "", ach_urogenital: "",
    ach_cardiovascular: "", ach_nervoso: "", ach_outros: "",
    coletas: "", exames_enviados: "",
    diagnostico_macroscopico: "", diagnostico_final: "",
    destino: "Descarte",
    ...inicial,
  });
  const [erro, setErro] = useState("");
  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!f.sip) return setErro("Selecione o animal (SIP).");
    setErro("");
    onSalvar(f);
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5">
      <SecaoForm titulo="Identificação">
        <div className="grid grid-cols-3 gap-x-4">
          <Field label="Animal (SIP)" required>
            <Select value={f.sip} onChange={(e) => upd("sip", e.target.value)}>
              <option value="">Selecione…</option>
              {animais.map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
            </Select>
          </Field>
          <Field label="Data" required>
            <TextInput type="date" value={f.data} onChange={(e) => upd("data", e.target.value)} />
          </Field>
          <Field label="Responsável">
            <TextInput value={f.responsavel} onChange={(e) => upd("responsavel", e.target.value)} />
          </Field>
        </div>
      </SecaoForm>

      <SecaoForm titulo="Histórico">
        <Field label="Histórico / motivo do óbito ou eutanásia"><TextArea value={f.historico} onChange={(e) => upd("historico", e.target.value)} /></Field>
        <Field label="Condição da carcaça">
          <Select value={f.condicao_carcaca} onChange={(e) => upd("condicao_carcaca", e.target.value)}>
            <option>Fresca</option><option>Refrigerada</option><option>Autolisada</option>
          </Select>
        </Field>
      </SecaoForm>

      <SecaoForm titulo="Avaliação externa">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Escore corporal (BCS)">
            <Select value={f.bcs} onChange={(e) => upd("bcs", e.target.value)}>
              {BCS_OPCOES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Cromodacriorreia">
            <Select value={f.cromodacriorreia} onChange={(e) => upd("cromodacriorreia", e.target.value)}>
              {CROMO_OPCOES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Pelagem, mucosas, orifícios naturais, lesões externas"><TextArea value={f.avaliacao_externa} onChange={(e) => upd("avaliacao_externa", e.target.value)} /></Field>
      </SecaoForm>

      <SecaoForm titulo="Avaliação interna — achados por sistema">
        <div className="grid grid-cols-2 gap-x-4">
          {ACHADOS_SISTEMA.map((s) => (
            <Field key={s.k} label={s.label}>
              <TextArea value={f[s.k]} onChange={(e) => upd(s.k, e.target.value)} />
            </Field>
          ))}
        </div>
      </SecaoForm>

      <SecaoForm titulo="Coletas e exames">
        <Field label="Amostras coletadas"><TextArea value={f.coletas} onChange={(e) => upd("coletas", e.target.value)} placeholder="Ex: fígado, baço, útero — para histopatologia" /></Field>
        <Field label="Exames enviados"><TextArea value={f.exames_enviados} onChange={(e) => upd("exames_enviados", e.target.value)} /></Field>
        <Field label="Destino do material">
          <Select value={f.destino} onChange={(e) => upd("destino", e.target.value)}>
            <option>Descarte</option><option>Histopatologia</option><option>Amostra biológica</option>
          </Select>
        </Field>
      </SecaoForm>

      <SecaoForm titulo="Diagnóstico">
        <Field label="Diagnóstico macroscópico"><TextArea value={f.diagnostico_macroscopico} onChange={(e) => upd("diagnostico_macroscopico", e.target.value)} /></Field>
        <Field label="Diagnóstico final"><TextArea value={f.diagnostico_final} onChange={(e) => upd("diagnostico_final", e.target.value)} /></Field>
      </SecaoForm>

      {erro && <p className="text-sm text-[#A6493C] mb-3">{erro}</p>}
      <div className="flex gap-2">
        <Btn type="submit"><Save size={14} /> Salvar necropsia</Btn>
        <Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Detalhe do animal
// ---------------------------------------------------------------------------

function AnimalDetalhe({ sip, animais, atendimentos, reproducoes, necropsias, voltar }) {
  const animal = animais.find((a) => a.sip === sip);
  if (!animal) return <p className="text-sm text-[#8A8574]">Animal não encontrado.</p>;

  const seusAtendimentos = atendimentos.filter((a) => a.sip === sip);
  const seuProntuario = reproducoes.filter((r) => r.sip === sip);
  const suaNecropsia = necropsias.filter((n) => n.sip === sip);
  const alertas = ALERTAS_LINHAGEM[animal.linhagem] || [];

  return (
    <div>
      <Btn variant="ghost" onClick={voltar} className="mb-4 !px-2"><ArrowLeft size={14} /> Voltar</Btn>
      <div className="flex items-center gap-3 mb-1">
        <SipBadge sip={animal.sip} linhagem={animal.linhagem} />
        <span className="text-sm text-[#5C5C52]">{animal.linhagem} · {animal.sexo}</span>
      </div>
      <p className="text-xs text-[#B5AF9E] mb-4">Nascimento: {fmtDate(animal.data_nascimento)} · Status: {animal.status}</p>

      {alertas.length > 0 && (
        <div className="flex items-start gap-2 bg-[#C9852B]/10 border border-[#C9852B]/40 rounded-md px-3 py-2 mb-5 text-sm text-[#8A5E1F] w-fit">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Alertas típicos de {animal.linhagem}: <strong>{alertas.join(", ")}</strong></span>
        </div>
      )}

      <Secao titulo={`Atendimentos (${seusAtendimentos.length})`}>
        {seusAtendimentos.length === 0 ? <p className="text-sm text-[#8A8574]">Nenhum registro.</p> : (
          seusAtendimentos.map((r) => (
            <div key={r.id} className="border-b border-[#E4E0D4] last:border-0 py-2">
              <p className="text-xs text-[#B5AF9E]">{fmtDate(r.data)}{r.peso ? ` · ${r.peso}g` : ""}{r.temperatura ? ` · ${r.temperatura}°C` : ""}</p>
              <p className="text-sm">{r.diagnostico || "—"}</p>
            </div>
          ))
        )}
      </Secao>

      <Secao titulo={`Reprodução (${seuProntuario.length})`}>
        {seuProntuario.length === 0 ? <p className="text-sm text-[#8A8574]">Nenhum registro.</p> : (
          seuProntuario.map((r) => {
            const tot = totaisNinhadas(r.ninhadas);
            return (
              <div key={r.id} className="border-b border-[#E4E0D4] last:border-0 py-2">
                <p className="text-sm">
                  {r.ninhadas?.length || 0} ninhada(s) · {tot.nascidos} nascidos{r.sip_parceiro ? ` · parceiro ${r.sip_parceiro}` : ""}
                  {r.data_encerramento ? " · encerrada" : ""}
                </p>
              </div>
            );
          })
        )}
      </Secao>

      <Secao titulo={`Necropsia (${suaNecropsia.length})`}>
        {suaNecropsia.length === 0 ? <p className="text-sm text-[#8A8574]">Nenhum registro.</p> : (
          suaNecropsia.map((r) => (
            <div key={r.id} className="border-b border-[#E4E0D4] last:border-0 py-2">
              <p className="text-xs text-[#B5AF9E]">{fmtDate(r.data)}</p>
              <p className="text-sm">{r.diagnostico_final || r.diagnostico_macroscopico || "—"}</p>
            </div>
          ))
        )}
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5C5C52] mb-2">{titulo}</h3>
      <div className="bg-white border border-[#E4E0D4] rounded-lg px-4">{children}</div>
    </div>
  );
}
