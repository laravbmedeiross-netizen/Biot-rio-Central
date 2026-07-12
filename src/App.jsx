import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronRight, X, Save, Home, PawPrint, Stethoscope,
  Heart, Skull, AlertTriangle, Trash2, ArrowLeft, Loader2, Check
} from "lucide-react";
import { supabase } from "./supabaseClient";

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

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return <ConfigAviso />;
  }

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
    loadAll();
  }, [loadAll]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
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
        <div className="px-5 py-4 border-t border-white/10 text-[11px] text-[#7C93A0]">
          Registros compartilhados da equipe
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
          <p className="text-sm text-[#8A8574]">Anamnese, exame físico e conduta clínica.</p>
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
                <p className="text-sm text-[#2B2B24]"><span className="font-medium">Diagnóstico:</span> {r.diagnostico || "—"}</p>
                <p className="text-sm text-[#5C5C52]"><span className="font-medium">Conduta:</span> {r.conduta || "—"}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AtendimentoForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "",
    anamnese: "", exame_fisico: "", sistemas: "", sinais_objetivos: "",
    diagnostico: "", conduta: "", tratamento: "", retorno: "", desfecho: "",
    ...inicial,
  });
  const [erro, setErro] = useState("");

  function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }

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
        <div className="flex items-start gap-2 bg-[#C9852B]/10 border border-[#C9852B]/40 rounded-md px-3 py-2 mb-4 text-sm text-[#8A5E1F]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Alertas típicos de {animalSel.linhagem}: <strong>{alertas.join(", ")}</strong></span>
        </div>
      )}

      <Field label="Anamnese"><TextArea value={f.anamnese} onChange={(e) => upd("anamnese", e.target.value)} /></Field>
      <Field label="Exame físico geral"><TextArea value={f.exame_fisico} onChange={(e) => upd("exame_fisico", e.target.value)} /></Field>
      <Field label="Exame por sistemas"><TextArea value={f.sistemas} onChange={(e) => upd("sistemas", e.target.value)} /></Field>
      <Field label="Sinais objetivos"><TextArea value={f.sinais_objetivos} onChange={(e) => upd("sinais_objetivos", e.target.value)} /></Field>
      <Field label="Diagnóstico / interpretação"><TextArea value={f.diagnostico} onChange={(e) => upd("diagnostico", e.target.value)} /></Field>
      <Field label="Conduta"><TextArea value={f.conduta} onChange={(e) => upd("conduta", e.target.value)} /></Field>
      <Field label="Tratamento"><TextArea value={f.tratamento} onChange={(e) => upd("tratamento", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Retorno / acompanhamento"><TextInput value={f.retorno} onChange={(e) => upd("retorno", e.target.value)} /></Field>
        <Field label="Desfecho"><TextInput value={f.desfecho} onChange={(e) => upd("desfecho", e.target.value)} /></Field>
      </div>

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
          <p className="text-sm text-[#8A8574]">Histórico de ninhadas e acompanhamento de matrizes.</p>
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
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    {r.sip_parceiro && <span className="text-xs text-[#8A8574]">× {r.sip_parceiro}</span>}
                  </div>
                  <div className="flex gap-1">
                    <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                    <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={13} /></Btn>
                  </div>
                </div>
                <p className="text-sm text-[#5C5C52]">{r.ninhadas?.length || 0} ninhada(s) registrada(s)</p>
                {r.historico_clinico && <p className="text-sm text-[#2B2B24] mt-1"><span className="font-medium">Histórico clínico:</span> {r.historico_clinico}</p>}
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
    sip: "", sip_parceiro: "", historico_clinico: "",
    ninhadas: [{ data: "", n_machos: "", n_femeas: "", observacoes: "" }],
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
    setF((s) => ({ ...s, ninhadas: [...s.ninhadas, { data: "", n_machos: "", n_femeas: "", observacoes: "" }] }));
  }
  function rmNinhada(i) {
    setF((s) => ({ ...s, ninhadas: s.ninhadas.filter((_, idx) => idx !== i) }));
  }

  function submit(e) {
    e.preventDefault();
    if (!f.sip) return setErro("Selecione a matriz (SIP).");
    setErro("");
    onSalvar(f);
  }

  const femeas = animais.filter((a) => a.sexo === "Fêmea");

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5">
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
      <Field label="Histórico clínico relevante"><TextArea value={f.historico_clinico} onChange={(e) => upd("historico_clinico", e.target.value)} /></Field>

      <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-2 mt-4">Ninhadas</span>
      <div className="space-y-3 mb-3">
        {f.ninhadas.map((n, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 items-start bg-[#F7F5F0] rounded-md p-3">
            <TextInput type="date" value={n.data} onChange={(e) => updNinhada(i, "data", e.target.value)} placeholder="Data" />
            <TextInput type="number" min="0" value={n.n_machos} onChange={(e) => updNinhada(i, "n_machos", e.target.value)} placeholder="Nº machos" />
            <TextInput type="number" min="0" value={n.n_femeas} onChange={(e) => updNinhada(i, "n_femeas", e.target.value)} placeholder="Nº fêmeas" />
            <TextInput value={n.observacoes} onChange={(e) => updNinhada(i, "observacoes", e.target.value)} placeholder="Observações" />
            <button type="button" onClick={() => rmNinhada(i)} className="text-[#A6493C] p-2"><X size={14} /></button>
          </div>
        ))}
      </div>
      <Btn type="button" variant="ghost" onClick={addNinhada} className="mb-4"><Plus size={14} /> Adicionar ninhada</Btn>

      {erro && <p className="text-sm text-[#A6493C] mb-3">{erro}</p>}
      <div className="flex gap-2">
        <Btn type="submit"><Save size={14} /> Salvar prontuário</Btn>
        <Btn type="button" variant="ghost" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </form>
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
          <p className="text-sm text-[#8A8574]">Escore corporal, cromodacriorreia e achados macroscópicos.</p>
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
                </div>
                <p className="text-sm text-[#2B2B24]"><span className="font-medium">Achados:</span> {r.achados || "—"}</p>
                <p className="text-sm text-[#5C5C52]"><span className="font-medium">Causa provável:</span> {r.causa_provavel || "—"}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NecropsiaForm({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "",
    bcs: "3", cromodacriorreia: "0", achados: "", causa_provavel: "", destino: "Descarte",
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
      <div className="grid grid-cols-3 gap-x-4">
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
        <Field label="Destino do material">
          <Select value={f.destino} onChange={(e) => upd("destino", e.target.value)}>
            <option>Descarte</option><option>Histopatologia</option><option>Amostra biológica</option>
          </Select>
        </Field>
      </div>
      <Field label="Achados macroscópicos"><TextArea value={f.achados} onChange={(e) => upd("achados", e.target.value)} /></Field>
      <Field label="Causa provável"><TextArea value={f.causa_provavel} onChange={(e) => upd("causa_provavel", e.target.value)} /></Field>

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
              <p className="text-xs text-[#B5AF9E]">{fmtDate(r.data)}</p>
              <p className="text-sm">{r.diagnostico || "—"}</p>
            </div>
          ))
        )}
      </Secao>

      <Secao titulo={`Reprodução (${seuProntuario.length})`}>
        {seuProntuario.length === 0 ? <p className="text-sm text-[#8A8574]">Nenhum registro.</p> : (
          seuProntuario.map((r) => (
            <div key={r.id} className="border-b border-[#E4E0D4] last:border-0 py-2">
              <p className="text-sm">{r.ninhadas?.length || 0} ninhada(s){r.sip_parceiro ? ` · parceiro ${r.sip_parceiro}` : ""}</p>
            </div>
          ))
        )}
      </Secao>

      <Secao titulo={`Necropsia (${suaNecropsia.length})`}>
        {suaNecropsia.length === 0 ? <p className="text-sm text-[#8A8574]">Nenhum registro.</p> : (
          suaNecropsia.map((r) => (
            <div key={r.id} className="border-b border-[#E4E0D4] last:border-0 py-2">
              <p className="text-xs text-[#B5AF9E]">{fmtDate(r.data)}</p>
              <p className="text-sm">{r.causa_provavel || "—"}</p>
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
