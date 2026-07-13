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

  // Função central para apagar animal e atualizar a tela
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
              <ModuloAnimais 
                animais={animais} 
                reload={loadAll} 
                showToast={showToast} 
                goTo={setModulo}
                forcarEdicao={animalParaEditar}
                limparForcarEdicao={() => setAnimalParaEditar(null)}
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
                sip={modulo.split(":")[1]}
                animais={animais}
                atendimentos={atendimentos}
                reproducoes={reproducoes}
                necropsias={necropsias}
                voltar={() => setModulo("animais")}
                onExcluirAnimal={tratarExcluirAnimal}
                onEditarAnimal={(animalData) => {
                  setAnimalParaEditar(animalData);
                  setModulo("animais");
                }}
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
            <CardAnimalCompacto key={a.sip} animal={a} onClick={() => onSelect(a.sip)} />
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

function ModuloAnimais({ animais, reload, showToast, goTo, forcarEdicao, limparForcarEdicao }) {
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (forcarEdicao) {
      setForm(forcarEdicao);
    }
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
        <Btn onClick={() => { setForm({}); limparForcarEdicao(); }}><Plus size={14} /> Novo animal</Btn>
      </div>

      {form && (
        <AnimalForm 
          inicial={form} 
          animaisExistentes={animais} 
          onSalvar={salvar} 
          onCancelar={() => { setForm(null); limparForcarEdicao(); }} 
          salvando={salvando} 
        />
      )}

      {animais.length === 0 && !form ? (
        <EmptyState icon={PawPrint} title="Nenhum animal cadastrado" subtitle="Cadastre o primeiro animal usando o código SIP." action={<Btn onClick={() => setForm({})}><Plus size={14} /> Novo animal</Btn>} />
      ) : (
        <div className="grid gap-2 mt-4">
          {animais.map((a) => (
            <CardAnimalCompacto key={a.sip} animal={a} onClick={() => goTo(`animal-detalhe:${a.sip}`)} />
          ))}
        </div>
      )}
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
    if (!isEdicao && animaisExistentes.some((a) => a.sip === f.sip.trim())) {
      return setErro("Já existe um animal com esse código SIP.");
    }
    setErro("");
    onSalvar({ ...f, sip: f.sip.trim() });
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5 shadow-sm">
      <div className="text-sm font-semibold text-[#1B3A54] mb-3 uppercase tracking-wide border-b border-gray-100 pb-2">
        {isEdicao ? `Editando Informações: ${f.sip}` : "Novo Registro de Animal"}
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Código SIP" required>
          <TextInput value={f.sip} onChange={(e) => upd("sip", e.target.value)} disabled={isEdicao} placeholder="BC_B6_ATEND_015.26" />
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
        
        <Field label="Categoria">
          <Select value={f.categoria} onChange={(e) => upd("categoria", e.target.value)}>
            <option value="">Selecione...</option>
            <option value="Matriz">Matriz</option>
            <option value="Reprodutor">Reprodutor</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Experimentação">Experimentação</option>
          </Select>
        </Field>
        <Field label="Origem">
          <Select value={f.origem} onChange={(e) => upd("origem", e.target.value)}>
            <option value="">Selecione...</option>
            <option value="Biotério Central">Biotério Central</option>
            <option value="Biotério LENq">Biotério LENq</option>
            <option value="Biotério PPGBIOEF">Biotério PPGBIOEF</option>
            <option value="Biotério LABMAT">Biotério LABMAT</option>
            <option value="Outro">Outro</option>
          </Select>
        </Field>

        <Field label="Status">
          <Select value={f.status} onChange={(e) => upd("status", e.target.value)}>
            {STATUS_ANIMAL.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </div>

      {f.categoria === "Experimentação" && (
        <div className="bg-blue-50/60 p-4 rounded-md mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 border border-blue-200">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-blue-900 mb-1">Nº do Protocolo CEUA</label>
            <input type="text" value={f.ceua_protocolo || ""} onChange={(e) => upd("ceua_protocolo", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-blue-900 mb-1">Professor</label>
            <input type="text" value={f.ceua_professor || ""} onChange={(e) => upd("ceua_professor", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-blue-900 mb-1">Pesquisador Responsável</label>
            <input type="text" value={f.ceua_pesquisador || ""} onChange={(e) => upd("ceua_pesquisador", e.target.value)} className={inputCls} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 border-t border-gray-100 pt-3 mt-1">
        <Field label="Avós Maternos">
          <TextInput placeholder="Avó e Avô Maternos" value={f.avos_maternos || ""} onChange={(e) => upd("avos_maternos", e.target.value)} />
        </Field>
        <Field label="Avós Paternos">
          <TextInput placeholder="Avó e Avô Paternos" value={f.avos_paternos || ""} onChange={(e) => upd("avos_paternos", e.target.value)} />
        </Field>
      </div>

      <Field label="Observações">
        <TextArea value={f.observacoes || ""} onChange={(e) => upd("observacoes", e.target.value)} />
      </Field>
      {erro && <p className="text-sm text-[#A6493C] mb-3">{erro}</p>}
      <div className="flex gap-2">
        <Btn type="submit" disabled={salvando}>{salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Alterações</Btn>
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
  const [aberto, setAberto] = useState(null);

  async function salvar(dados) {
    const id = dados.id || genId("atd");
    await saveRecord("atendimentos", { ...dados, id });
    setForm(null);
    showToast("Atendimento registrado");
    reload();
  }

  async function excluir(id) {
    if (confirm("Deseja realmente excluir esta ficha de atendimento?")) {
      await deleteRecord("atendimentos", "id", id);
      showToast("Atendimento excluído");
      reload();
    }
  }

  const lista = filtroSip ? atendimentos.filter((a) => a.sip === filtroSip) : atendimentos;

  return (
    <div className="space-y-4">
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
            const isAberto = aberto === r.id;
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setAberto(isAberto ? null : r.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                      <span className="text-xs text-[#B5AF9E]">{fmtDate(r.data)} · {r.responsavel}</span>
                    </div>
                    <ChevronRight size={16} className={`text-[#B5AF9E] transition-transform ${isAberto ? "rotate-90" : ""}`} />
                  </div>
                  <div className="flex gap-4 text-xs text-[#8A8574] mb-1">
                    {r.peso && <span>Peso: {r.peso}g</span>}
                    {r.temperatura && <span>Temp: {r.temperatura}°C</span>}
                    {r.escore_corporal && <span>BCS: {r.escore_corporal}</span>}
                  </div>
                  <p className="text-sm text-[#2B2B24]"><span className="font-medium">Diagnóstico:</span> {r.diagnostico || "—"}</p>
                  <p className="text-sm text-[#5C5C52]"><span className="font-medium">Conduta:</span> {r.conduta || "—"}</p>
                  
                  {r.medicamento_nome && (
                    <div className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-100 text-gray-700">
                      <strong>Medicamento:</strong> {r.medicamento_nome} {r.medicamento_dosagem ? `(${r.medicamento_dosagem})` : ""} · {r.medicamento_via || "—"} · {r.medicamento_frequencia || "—"}
                    </div>
                  )}

                  {r.evolucoes?.length > 0 && (
                    <p className="text-xs text-[#4A7C7C] mt-1">{r.evolucoes.length} registro(s) de evolução clínica</p>
                  )}
                </button>

                {isAberto && (
                  <div className="mt-3 pt-3 border-t border-[#E4E0D4]">
                    <DetalheCampo label="Anamnese" valor={r.anamnese} />
                    <DetalheCampo label="Mucosas" valor={r.mucosas} />
                    <DetalheCampo label="Hidratação" valor={r.hidratacao} />
                    <DetalheCampo label="Exame físico geral" valor={r.exame_fisico} />
                    {SISTEMAS_ATENDIMENTO.map((s) => (
                      <DetalheCampo key={s.k} label={s.label} valor={r[s.k]} />
                    ))}
                    <DetalheCampo label="Sinais objetivos" valor={r.sinais_objetivos} />
                    <DetalheCampo label="Exames laboratoriais" valor={r.exames_laboratoriais} />
                    <DetalheCampo label="Tratamento" valor={r.tratamento} />
                    
                    {r.medicamento_nome && (
                      <div className="mb-2">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-0.5">Prescrição Farmacológica</span>
                        <p className="text-sm text-[#2B2B24]">{r.medicamento_nome} | Dosagem: {r.medicamento_dosagem || "—"} | Via: {r.medicamento_via || "—"} | Frequência: {r.medicamento_frequencia || "—"}</p>
                      </div>
                    )}

                    <DetalheCampo label="Retorno / acompanhamento" valor={r.retorno} />
                    <DetalheCampo label="Desfecho" valor={r.desfecho} />
                    {r.evolucoes?.length > 0 && (
                      <div className="mb-2">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-1">Evolução clínica</span>
                        <div className="space-y-1">
                          {r.evolucoes.map((ev, i) => (
                            <p key={i} className="text-sm text-[#2B2B24]">
                              <span className="text-xs text-[#B5AF9E]">{fmtDate(ev.data)}{ev.responsavel ? ` · ${ev.responsavel}` : ""}:</span> {ev.observacao || "—"}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1 mt-3">
                      <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                      <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={13} /> Excluir</Btn>
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

function DetalheCampo({ label, valor }) {
  if (!valor) return null;
  return (
    <div className="mb-2">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-0.5">{label}</span>
      <p className="text-sm text-[#2B2B24] whitespace-pre-wrap">{valor}</p>
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
    diagnostico: "", conduta: "", treatment: "", exames_laboratoriais: "",
    medicamento_nome: "", medicamento_dosagem: "", medicamento_via: "", medicamento_frequencia: "",
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
        {animalSel && (
          <div className="flex items-start gap-2 bg-[#C9852B]/10 border border-[#C9852B]/40 rounded-md px-3 py-2 text-sm text-[#8A5E1F] mb-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>Alertas típicos de {animalSel.linhagem}: <strong>{alertas.join(", ")}</strong> | Idade: <strong>{calcIdadeApenasMeses(animalSel.data_nascimento)}</strong></span>
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
        <Field label="Tratamento Geral"><TextArea value={f.tratamento} onChange={(e) => upd("tratamento", e.target.value)} /></Field>
        
        <div className="border-t border-gray-200 pt-4 mt-2">
          <span className="block text-xs font-semibold uppercase tracking-wide text-[#4A7C7C] mb-3">Farmacologia Médica (VetSmart)</span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Medicamento">
              <TextInput placeholder="Ex: Meloxicam" value={f.medicamento_nome} onChange={(e) => upd("medicamento_nome", e.target.value)} />
            </Field>
            <Field label="Dosagem">
              <TextInput placeholder="Ex: 0,2 mg/kg" value={f.medicamento_dosagem} onChange={(e) => upd("medicamento_dosagem", e.target.value)} />
            </Field>
            <Field label="Via de Administração">
              <Select value={f.medicamento_via} onChange={(e) => upd("medicamento_via", e.target.value)}>
                <option value="">Selecione...</option>
                <option value="VO">Via Oral (VO)</option>
                <option value="SC">Subcutânea (SC)</option>
                <option value="IP">Intraperitoneal (IP)</option>
                <option value="IM">Intramuscular (IM)</option>
                <option value="IV">Intravenosa (IV)</option>
              </Select>
            </Field>
            <Field label="Frequência (Vezes ao dia)">
              <TextInput placeholder="Ex: SID, BID, QID" value={f.medicamento_frequencia} onChange={(e) => upd("medicamento_frequencia", e.target.value)} />
            </Field>
          </div>
        </div>
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

function ModuloReproducao({ reproducoes, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aberto, setAberto] = useState(null);

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
            const isAberto = aberto === r.id;
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <button type="button" onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                      {r.reprodutor_id && <span className="text-xs text-[#8A8574]">× Macho Reprodutor: <strong>{r.reprodutor_id}</strong></span>}
                      {encerrado && <span className="text-xs px-2 py-0.5 rounded-full bg-[#A6493C]/10 text-[#A6493C]">Encerrada</span>}
                    </div>
                    <ChevronRight size={16} className={`text-[#B5AF9E] transition-transform ${isAberto ? "rotate-90" : ""}`} />
                  </div>
                  <p className="text-sm text-[#5C5C52]">
                    {r.ninhadas?.length || 0} ninhada(s) · {tot.nascidos} nascidos · {tot.machos}M/{tot.femeas}F · {tot.mortos} mortos · {tot.desmamados} desmamados
                  </p>
                  {r.historico_clinico && <p className="text-sm text-[#2B2B24] mt-1"><span className="font-medium">Histórico clínico:</span> {r.historico_clinico}</p>}
                </button>

                {isAberto && (
                  <div className="mt-3 pt-3 border-t border-[#E4E0D4]">
                    {r.ninhadas?.filter((n) => n.data).length > 0 && (
                      <div className="overflow-x-auto mb-3">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-1">Ninhadas</span>
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
                      </div>
                    )}

                    <DetalheCampo label="Genealogia Básica" valor={r.genealogia} />
                    <DetalheCampo label="Intercorrências" valor={r.intercorrencias} />
                    <DetalheCampo label="Tratamentos" valor={r.tratamentos} />

                    {r.monitoramento?.filter((m) => m.data).length > 0 && (
                      <div className="mb-2">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-[#5C5C52] mb-1">Monitoramento Periódico do Casal</span>
                        <div className="space-y-1.5">
                          {r.monitoramento.filter((m) => m.data).map((m, i) => (
                            <div key={i} className="text-xs bg-[#F7F5F0] rounded p-2 text-[#5C5C52]">
                              <div><strong>Data:</strong> {fmtDate(m.data)} {m.observacoes ? ` | Nota: ${m.observacoes}` : ""}</div>
                              <div className="flex gap-4 mt-0.5">
                                <span>Matriz: {m.peso ? `${m.peso}g` : "—"} (BCS {m.bcs || "—"})</span>
                                <span>Reprodutor: {m.macho_peso ? `${m.macho_peso}g` : "—"} (BCS {m.macho_bcs || "—"})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {encerrado && (
                      <p className="text-sm text-[#A6493C] mt-1 mb-2">
                        <span className="font-medium">Encerramento ({fmtDate(r.data_encerramento)}):</span> {r.motivo_encerramento || "—"}
                      </p>
                    )}

                    <div className="flex gap-1 mt-3">
                      <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                      <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={13} /> Excluir</Btn>
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
    sip: "", reprodutor_id: "", genealogia: "",
    historico_clinico: "", intercorrencias: "", tratamentos: "",
    ninhadas: [{ data: "", n_nascidos: "", n_machos: "", n_femeas: "", n_mortos: "", n_desmamados: "", observacoes: "" }],
    monitoramento: [{ data: "", peso: "", bcs: "3", macho_peso: "", macho_bcs: "3", observacoes: "" }],
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
    setF((s) => ({ ...s, monitoramento: [...s.monitoramento, { data: "", peso: "", bcs: "3", macho_peso: "", macho_bcs: "3", observacoes: "" }] }));
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
  const machos = animais.filter((a) => a.sexo === "Macho");
  const animalSel = animais.find((a) => a.sip === f.sip);

  return (
    <form onSubmit={submit} className="bg-white border border-[#E4E0D4] rounded-lg p-5 mb-5">
      <SecaoForm titulo="Identificação do Casal">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Matriz (SIP - Fêmea)" required>
            <Select value={f.sip} onChange={(e) => upd("sip", e.target.value)}>
              <option value="">Selecione…</option>
              {femeas.map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
            </Select>
          </Field>
          
          <Field label="Reprodutor (SIP - Macho)">
            <Select value={f.reprodutor_id} onChange={(e) => upd("reprodutor_id", e.target.value)}>
              <option value="">Selecione…</option>
              {machos.map((a) => <option key={a.sip} value={a.sip}>{a.sip}</option>)}
            </Select>
          </Field>
        </div>
        {animalSel && (
          <p className="text-xs text-[#8A8574] -mt-2 mb-3">
            Linhagem da matriz: {animalSel.linhagem} · Idade calculada: {calcIdadeApenasMeses(animalSel.data_nascimento)}
          </p>
        )}
        <Field label="Genealogia (Módulo de rastreio de pais / ninhagem)">
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

      <SecaoForm titulo="Avaliação Periódica do Casal Reprodutor">
        <div className="space-y-3 mb-3">
          {f.monitoramento.map((m, i) => (
            <div key={i} className="bg-[#F7F5F0] border border-gray-200 rounded-md p-4 space-y-3">
              <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                <TextInput type="date" value={m.data} onChange={(e) => updMonit(i, "data", e.target.value)} />
                <TextInput value={m.observacoes} onChange={(e) => updMonit(i, "observacoes", e.target.value)} placeholder="Notas de acompanhamento" />
                <button type="button" onClick={() => rmMonit(i)} className="text-[#A6493C] p-2"><X size={14} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-2 bg-pink-50/50 rounded border border-pink-100">
                  <span className="block text-[11px] uppercase font-bold text-pink-700 mb-1.5">Métrica da Matriz (Fêmea)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput type="text" value={m.peso} onChange={(e) => updMonit(i, "peso", e.target.value)} placeholder="Peso (g)" />
                    <Select value={m.bcs} onChange={(e) => updMonit(i, "bcs", e.target.value)}>
                      {BCS_OPCOES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </Select>
                  </div>
                </div>
                <div className="p-2 bg-blue-50/50 rounded border border-blue-100">
                  <span className="block text-[11px] uppercase font-bold text-blue-700 mb-1.5">Métrica do Reprodutor (Macho)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput type="text" value={m.macho_peso} onChange={(e) => updMonit(i, "macho_peso", e.target.value)} placeholder="Peso (g)" />
                    <Select value={m.macho_bcs} onChange={(e) => updMonit(i, "macho_bcs", e.target.value)}>
                      {BCS_OPCOES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Btn type="button" variant="ghost" onClick={addMonit}><Plus size={14} /> Adicionar registro periódico</Btn>
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
            const isAberto = aberto === r.id;
            return (
              <div key={r.id} className="bg-white border border-[#E4E0D4] rounded-lg p-4">
                <button type="button" onClick={() => setAberto(isAberto ? null : r.id)} className="w-full text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                      <span className="text-xs text-[#B5AF9E]">{fmtDate(r.data)}</span>
                    </div>
                    <ChevronRight size={16} className={`text-[#B5AF9E] transition-transform ${isAberto ? "rotate-90" : ""}`} />
                  </div>
                  <div className="flex gap-4 text-sm text-[#5C5C52] mb-1">
                    <span>BCS: <strong className="text-[#2B2B24]">{r.bcs || "—"}</strong></span>
                    <span>Cromodacriorreia: <strong className="text-[#2B2B24]">{r.cromodacriorreia ?? "—"}</strong></span>
                    {r.condicao_carcaca && <span>Carcaça: <strong className="text-[#2B2B24]">{r.condicao_carcaca}</strong></span>}
                  </div>
                  <p className="text-sm text-[#2B2B24]"><span className="font-medium">Diagnóstico macroscópico:</span> {r.diagnostico_macroscopico || "—"}</p>
                  <p className="text-sm text-[#2B2B24]"><span className="font-medium">Diagnóstico final:</span> {r.diagnostico_final || "—"}</p>
                  {r.coletas && <p className="text-sm text-[#5C5C52]"><span className="font-medium">Coletas:</span> {r.coletas}</p>}
                </button>

                {isAberto && (
                  <div className="mt-3 pt-3 border-t border-[#E4E0D4]">
                    <DetalheCampo label="Responsável" valor={r.responsavel} />
                    <DetalheCampo label="Histórico / motivo do óbito" valor={r.historico} />
                    <DetalheCampo label="Avaliação externa" valor={r.avaliacao_externa} />
                    {ACHADOS_SISTEMA.map((s) => (
                      <DetalheCampo key={s.k} label={s.label} valor={r[s.k]} />
                    ))}
                    <DetalheCampo label="Exames enviados" valor={r.exames_enviados} />
                    <DetalheCampo label="Destino do material" valor={r.destino} />
                    <div className="flex gap-1 mt-3">
                      <Btn variant="ghost" onClick={() => setForm(r)} className="!px-2 !py-1 text-xs">Editar</Btn>
                      <Btn variant="danger" onClick={() => excluir(r.id)} className="!px-2 !py-1 text-xs"><Trash2 size={13} /> Excluir</Btn>
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

function AnimalDetalhe({ sip, animais, atendimentos, reproducoes, necropsias, voltar, onEditarAnimal, onExcluirAnimal }) {
  const animal = animais.find((a) => a.sip === sip);
  if (!animal) return <p className="text-sm text-[#8A8574]">Animal não encontrado.</p>;

  const seusAtendimentos = atendimentos.filter((a) => a.sip === sip);
  const seuProntuario = reproducoes.filter((r) => r.sip === sip);
  const suaNecropsia = necropsias.filter((n) => n.sip === sip);
  const alertas = ALERTAS_LINHAGEM[animal.linhagem] || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Btn variant="ghost" onClick={voltar} className="!px-2"><ArrowLeft size={14} /> Voltar</Btn>
        
        <div className="flex gap-2">
          {/* Nova Funcionalidade: Botão disparador para excluir a ficha do animal */}
          <Btn 
            variant="danger"
            onClick={() => {
              if (confirm(`Aviso: Tem certeza que deseja excluir permanentemente o animal ${animal.sip}? Isso não afetará os laudos associados de atendimento/necropsia.`)) {
                onExcluirAnimal(animal.sip);
              }
            }}
          >
            <Trash2 size={14} /> Excluir Animal
          </Btn>

          <Btn onClick={() => onEditarAnimal(animal)} className="!bg-[#4A7C7C] hover:!bg-[#3A6363]">
            <Edit3 size={14} /> Editar Dados do Animal
          </Btn>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-1">
        <SipBadge sip={animal.sip} linhagem={animal.linhagem} />
        <span className="text-sm text-[#5C5C52]">{animal.linhagem} · {animal.sexo}</span>
        {animal.categoria && <span className="text-xs bg-gray-200/80 px-2 py-0.5 rounded text-gray-700 font-medium">{animal.categoria}</span>}
      </div>
      
      <div className="text-xs text-[#B5AF9E] mb-4 space-y-0.5">
        <div><strong>Data de Nascimento:</strong> {fmtDate(animal.data_nascimento)}</div>
        <div><strong>Idade do Espécime:</strong> {calcIdadeApenasMeses(animal.data_nascimento)}</div>
        <div><strong>Status no Sistema:</strong> {animal.status}</div>
        {animal.origem && <div><strong>Origem Cadastrada:</strong> {animal.origem}</div>}
      </div>

      {animal.categoria === "Experimentação" && animal.ceua_protocolo && (
        <div className="bg-blue-50 text-blue-900 p-3 rounded-lg border border-blue-200 text-xs mb-4 space-y-0.5">
          <div className="font-bold text-sm uppercase tracking-wider mb-1 text-blue-900">Vínculo Institucional CEUA</div>
          <div><strong>Protocolo:</strong> {animal.ceua_protocolo}</div>
          <div><strong>Professor:</strong> {animal.ceua_professor || "—"}</div>
          <div><strong>Pesquisador Resp:</strong> {animal.ceua_pesquisador || "—"}</div>
        </div>
      )}

      {(animal.avos_maternos || animal.avos_paternos) && (
        <div className="bg-gray-50 text-gray-700 p-3 rounded-lg border border-gray-200 text-xs mb-4 space-y-1">
          <div className="font-bold uppercase text-gray-600 mb-0.5">Rastreabilidade Genética Estendida</div>
          {animal.avos_maternos && <div><strong>Avós Maternos:</strong> {animal.avos_maternos}</div>}
          {animal.avos_paternos && <div><strong>Avós Paternos:</strong> {animal.avos_paternos}</div>}
        </div>
      )}

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
              <p className="text-sm font-medium">{r.diagnostico || "—"}</p>
              {r.medicamento_nome && <p className="text-xs text-gray-600">Prescrição: {r.medicamento_nome} {r.medicamento_dosagem ? `(${r.medicamento_dosagem})` : ""} - {r.medicamento_frequencia}</p>}
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
                  {r.ninhadas?.length || 0} ninhada(s) · {tot.nascidos} nascidos{r.reprodutor_id ? ` · Reprodutor Macho: ${r.reprodutor_id}` : ""}
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
