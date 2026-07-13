import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronRight, X, Save, Home, PawPrint, Stethoscope,
  Heart, Skull, AlertTriangle, Trash2, ArrowLeft, Loader2, Check, LogOut, Edit3, Calendar
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// ---------------------------------------------------------------------------
// Constantes Temáticas e Opções dos Formulários Oficiais (CB-UFRN)
// ---------------------------------------------------------------------------

const LINHAGENS = ["Wistar", "Swiss", "C57BL/6", "BALB/c"];
const LINHAGEM_COR = { Wistar: "#8A5A3B", Swiss: "#4A7C7C", "C57BL/6": "#3E5C8A", "BALB/c": "#7C5A94" };

const BCS_OPCOES = [
  { v: "BC1", label: "BC1 — Caquético" },
  { v: "BC2", label: "BC2 — Magro" },
  { v: "BC3", label: "BC3 — Ideal" },
  { v: "BC4", label: "BC4 — Sobrepeso" },
  { v: "BC5", label: "BC5 — Obeso" },
];

const CROMO_OPCOES = [
  { v: "0", label: "0 — Ausente / Sem alterações" },
  { v: "1", label: "1 — Leve" },
  { v: "2", label: "2 — Moderada" },
  { v: "3", label: "3 — Severa" },
];

const MODULOS = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "animais", label: "Animais", icon: PawPrint },
  { id: "atendimentos", label: "Atendimentos", icon: Stethoscope },
  { id: "reproducao", label: "Reprodução", icon: Heart },
  { id: "necropsias", label: "Necropsias", icon: Skull },
];

const CHECKBOXES_PELE_PELAGEM = [
  { k: "ext_normal", label: "Normal" }, { k: "ext_alopecia", label: "Alopecia" },
  { k: "ext_dermatite", label: "Dermatite" }, { k: "ext_erica", label: "Eriçada" },
  { k: "ext_piloerecao", label: "Piloereção" }, { k: "ext_mordedura", label: "Mordedura" },
  { k: "ext_ulceras", label: "Úlceras / Feridas" }, { k: "ext_nodulos", label: "Nódulos / Massas" },
  { k: "ext_grooming", label: "Ausência de grooming" }, { k: "ext_ectoparasitas", label: "Ectoparasitas" }
];

const CHECKBOXES_PERINEAL = [
  { k: "per_normal", label: "Normal" }, { k: "per_sujidade", label: "Sujidade" },
  { k: "per_diarreia", label: "Diarreia" }, { k: "per_protusao", label: "Protusão" },
  { k: "per_secrecao", label: "Secreção" }, { k: "per_prolapso_v", label: "Prolapso vaginal" },
  { k: "per_prolapso_r", label: "Prolapso retal" }, { k: "per_sangramento", label: "Sangramento" },
  { k: "per_hematuria", label: "Hematúria" }, { k: "per_prepuciais", label: "Alterações prepuciais" }
];

const CHECKBOXES_ESTADO_GERAL = [
  { k: "ger_sem_alteracao", label: "Sem alterações" }, { k: "ger_apatia", label: "Apatia / Letargia" },
  { k: "ger_emagrecimento", label: "Emagrecimento" }, { k: "ger_locomotora", label: "Alteração locomotora" },
  { k: "ger_comportamental", label: "Alteração comportamental" }, { k: "ger_cifose", label: "Cifose" },
  { k: "ger_sinais_dor", label: "Sinais de dor" }, { k: "ger_resp_abdominal", label: "Respiração abdominal" },
  { k: "ger_dispneia", label: "Dispneia" }, { k: "ger_taquipneia", label: "Taquipneia" }
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
// Funções Utilitárias e Operações de Banco de Dados
// ---------------------------------------------------------------------------

async function listRecords(table, orderBy) {
  let query = supabase.from(table).select("*");
  if (orderBy) query = query.order(orderBy, { ascending: false });
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

async function saveRecord(table, record) {
  const { error } = await supabase.from(table).upsert(record);
  if (error) throw error;
}

async function deleteRecord(table, idField, idValue) {
  const { error } = await supabase.from(table).delete().eq(idField, idValue);
  if (error) throw error;
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return d.toLocaleDateString("pt-BR");
  } catch { return iso; }
}

function calcIdadeApenasMeses(dataNasc) {
  if (!dataNasc) return "—";
  const nasc = new Date(dataNasc + "T00:00:00");
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
  if (hoje.getDate() < nasc.getDate()) meses--;
  return meses <= 0 ? "0 meses" : `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function totaisNinhadas(ninhadas = []) {
  if (!Array.isArray(ninhadas)) return { nascidos: 0, desmamados: 0 };
  return ninhadas.reduce((acc, n) => ({
    nascidos: acc.nascidos + (Number(n.n_nascidos) || 0),
    desmamados: acc.desmamados + (Number(n.n_desmamados) || 0)
  }), { nascidos: 0, desmamados: 0 });
}

function DetalheCampo({ label, valor, badge }) {
  if (!valor || String(valor).trim() === "" || String(valor) === "undefined" || valor === false) return null;
  return (
    <div className="text-left p-2 rounded border border-gray-100 bg-gray-50/60 text-xs">
      <span className="block font-bold uppercase text-[9px] tracking-wider text-gray-400 mb-0.5">{label}</span>
      <span className={badge ? "inline-block bg-[#1B3A54] text-white px-1.5 py-0.5 rounded font-mono font-bold text-[10px]" : "text-gray-800 font-medium whitespace-pre-wrap"}>
        {String(valor)}
      </span>
    </div>
  );
}

function SipBadge({ sip, linhagem }) {
  const cor = LINHAGEM_COR[linhagem] || "#5C5C52";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold border" style={{ borderColor: cor, color: cor, backgroundColor: `${cor}0F` }}>
      {sip || "SEM ID"}
    </span>
  );
}

function CardAnimalCompacto({ animal, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-[#4A7C7C] transition-colors text-left shadow-sm"
    >
      <div className="flex items-center gap-3">
        <SipBadge sip={animal.sip} linhagem={animal.linhagem} />
        <span className="text-sm font-medium text-gray-600">
          {animal.sexo} · {animal.linhagem} · {calcIdadeApenasMeses(animal.data_nascimento)}
        </span>
        {animal.categoria && (
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
            {animal.categoria}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${animal.status === "Ativo" ? "bg-emerald-50 text-emerald-700 font-medium" : "bg-red-50 text-red-700 font-medium"}`}>
          {animal.status || "Ativo"}
        </span>
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </button>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="block mb-2 text-left">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#4A7C7C]";
function TextInput(props) { return <input {...props} className={inputCls} />; }
function TextArea(props) { return <textarea {...props} className={inputCls + " min-h-[60px] resize-y"} />; }
function Select({ children, ...props }) { return <select {...props} className={inputCls}>{children}</select>; }

function Btn({ children, variant = "primary", ...props }) {
  const base = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors";
  const styles = {
    primary: "bg-[#1B3A54] text-white hover:bg-[#15293D]",
    ghost: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  };
  return <button {...props} className={`${base} ${styles[variant]} ${props.className || ""}`}>{children}</button>;
}

function SecaoForm({ titulo, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A7C7C] border-b pb-1.5 flex items-center gap-2">
        <span>{titulo}</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function GradeCheckboxes({ titulo, lista, objetoForm, setObjetoForm }) {
  return (
    <div className="bg-gray-50/50 border rounded-lg p-3 text-left">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{titulo}</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {lista.map(item => (
          <label key={item.k} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
            <input type="checkbox" checked={!!objetoForm[item.k]} onChange={e => setObjetoForm({ ...objetoForm, [item.k]: e.target.checked })} className="rounded border-gray-300 text-[#4A7C7C] focus:ring-[#4A7C7C]" />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
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
    return <div className="p-10 text-center font-mono text-red-600">Variáveis do Supabase ausentes (.env).</div>;
  }

  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function tratarExcluirAnimal(sip) {
    try {
      await deleteRecord("animais", "sip", sip);
      showToast("Animal removido com sucesso");
      setModulo("animais");
      loadAll();
    } catch {
      showToast("Não foi possível excluir. Remova fichas vinculadas a este SIP primeiro.");
    }
  }

  const buscaLower = busca.trim().toLowerCase();
  const resultadosBusca = buscaLower ? animais.filter(a => (a.sip || "").toLowerCase().includes(buscaLower) || (a.linhagem || "").toLowerCase().includes(buscaLower)) : [];

  return (
    <div className="min-h-screen flex bg-[#F7F5F0] text-gray-800 font-sans antialiased">
      <aside className="w-56 shrink-0 bg-[#1B3A54] text-[#E9E5D8] flex flex-col shadow-xl">
        <div className="px-5 py-5 border-b border-white/10 bg-[#15293D]">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#8FB3B3] font-bold">Centro de Biociências · UFRN</p>
          <h1 className="text-base font-bold leading-tight mt-0.5">Biotério Central</h1>
        </div>
        <nav className="flex-1 py-3 space-y-0.5">
          {MODULOS.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => { setModulo(m.id); setAnimalParaEditar(null); }} className={`w-full flex items-center gap-3 px-5 py-2.5 text-xs font-semibold tracking-wide transition-colors ${modulo === m.id ? "bg-[#4A7C7C] text-white font-bold" : "text-[#B8CBD6] hover:bg-white/5"}`}>
                <Icon size={15} /> {m.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 bg-[#15293D] text-[11px]">
          <p className="truncate text-gray-400 font-mono mb-2">{session.user?.email}</p>
          <button onClick={() => supabase.auth.signOut()} className="text-red-300 hover:text-white font-bold flex items-center gap-1.5"><LogOut size={12} /> Desconectar</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="border-b border-gray-200 bg-white px-8 py-3.5 flex items-center gap-3 shadow-sm">
          <Search size={15} className="text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisa rápida por código SIP..." className="flex-1 bg-transparent outline-none text-xs text-gray-700" />
          {loading && <Loader2 size={14} className="animate-spin text-[#4A7C7C]" />}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {buscaLower ? (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase text-gray-400">Resultados Encontrados ({resultadosBusca.length})</h2>
              {resultadosBusca.map(a => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => { setBusca(""); setModulo(`animal-detalhe:${a.sip}`); }} />)}
            </div>
          ) : (
            <>
              {modulo === "dashboard" && <Dashboard animais={animais} atendimentos={atendimentos} necropsias={necropsias} reproducoes={reproducoes} goTo={setModulo} />}
              {modulo === "animais" && <ModuloAnimais animais={animais} reload={loadAll} showToast={showToast} goTo={setModulo} forcarEdicao={animalParaEditar} limparForcarEdicao={() => setAnimalParaEditar(null)} />}
              {modulo === "atendimentos" && <ModuloAtendimentos atendimentos={atendimentos} animais={animais} reload={loadAll} showToast={showToast} />}
              {modulo === "reproducao" && <ModuloReproducao reproducoes={reproducoes} animais={animais} reload={loadAll} showToast={showToast} />}
              {modulo === "necropsias" && <ModuloNecropsias necropsias={necropsias} animais={animais} reload={loadAll} showToast={showToast} />}
              {modulo.startsWith("animal-detalhe:") && (
                <AnimalDetalhe sip={modulo.split(":")[1]} animais={animais} atendimentos={atendimentos} reproducoes={reproducoes} voltar={() => setModulo("animais")} onExcluirAnimal={tratarExcluirAnimal} onEditarAnimal={d => { setAnimalParaEditar(d); setModulo("animais"); }} />
              )}
            </>
          )}
        </div>
      </main>

      {toast && <div className="fixed bottom-6 right-6 bg-[#1B3A54] text-white px-4 py-2.5 rounded shadow-xl z-50 flex items-center gap-2 text-xs font-bold"><Check size={14} /> {toast}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ animais, atendimentos, necropsias, reproducoes, goTo }) {
  const ativos = animais.filter(a => a.status === "Ativo" || !a.status);
  const clinicosAtivos = atendimentos.filter(at => !at.desfecho || at.desfecho.trim() === "");
  const casaisAtivos = reproducoes.filter(r => !r.term_data_matriz && !r.term_data_reprodutor);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { mod: "animais", label: "Animais Ativos", count: ativos.length, icon: PawPrint },
          { mod: "atendimentos", label: "Intervenções Ativas", count: clinicosAtivos.length, icon: Stethoscope },
          { mod: "reproducao", label: "Colônias Ativas", count: casaisAtivos.length, icon: Heart },
          { mod: "necropsias", label: "Necropsias Concluídas", count: necropsias.length, icon: Skull }
        ].map(card => (
          <button key={card.mod} onClick={() => goTo(card.mod)} className="text-left bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-[#4A7C7C] transition-all">
            <card.icon size={16} className="text-[#4A7C7C] mb-2" />
            <div className="text-2xl font-bold text-[#1B3A54]">{card.count}</div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{card.label}</div>
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-5 shadow-sm text-left">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1"><Calendar size={14}/> Visão Consolidada por Linhagem</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-2.5">Linhagem</th>
              <th className="p-2.5 text-center">Nascidos Totais</th>
              <th className="p-2.5 text-center">Desmamados Sucesso</th>
              <th className="p-2.5 text-center">Atendimentos Médicos</th>
              <th className="p-2.5 text-center">Laudos Mortem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {LINHAGENS.map(l => {
              const reprodLinhagem = reproducoes.filter(r => animais.find(a => a.sip === r.sip)?.linhagem === l);
              const totalNasc = reprodLinhagem.reduce((acc, r) => acc + totaisNinhadas(r.ninhadas).nascidos, 0);
              const totalDesm = reprodLinhagem.reduce((acc, r) => acc + totaisNinhadas(r.ninhadas).desmamados, 0);
              return (
                <tr key={l} className="hover:bg-gray-50/50">
                  <td className="p-2.5 font-bold text-[#1B3A54]">{l}</td>
                  <td className="p-2.5 text-center text-gray-600 font-mono">{totalNasc}</td>
                  <td className="p-2.5 text-center text-emerald-700 font-bold font-mono">{totalDesm}</td>
                  <td className="p-2.5 text-center text-amber-700 font-mono">{atendimentos.filter(a => animais.find(x => x.sip === a.sip)?.linhagem === l).length}</td>
                  <td className="p-2.5 text-center text-red-700 font-mono">{necropsias.filter(n => animais.find(x => x.sip === n.sip)?.linhagem === l).length}</td>
                </tr>
              );
            })}
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Mapeamento de Especimes (SIP)</h2>
        <Btn onClick={() => { setForm({}); limparForcarEdicao(); }}><Plus size={13} /> Cadastrar Animal</Btn>
      </div>
      {form && (
        <form onSubmit={async e => {
          e.preventDefault();
          if (!form.sip?.trim()) return alert("Código SIP é obrigatório.");
          await saveRecord("animais", form);
          setForm(null); limparForcarEdicao(); showToast("Registro salvo"); reload();
        }} className="bg-white border rounded-lg p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Código SIP Identificador" required><TextInput value={form.sip || ""} onChange={e => setForm({...form, sip: e.target.value})} disabled={!!form.created_at} /></Field>
            <Field label="Espécie"><Select value={form.especie || "Rato"} onChange={e => setForm({...form, especie: e.target.value})}><option>Rato</option><option>Camundongo</option></Select></Field>
            <Field label="Linhagem"><Select value={form.linhagem || "Wistar"} onChange={e => setForm({...form, linhagem: e.target.value})}>{LINHAGENS.map(l => <option key={l}>{l}</option>)}</Select></Field>
            <Field label="Sexo Anatômico"><Select value={form.sexo || "Fêmea"} onChange={e => setForm({...form, sexo: e.target.value})}><option>Fêmea</option><option>Macho</option></Select></Field>
            <Field label="Categoria Biotécnica"><Select value={form.categoria || "Matriz"} onChange={e => setForm({...form, categoria: e.target.value})}><option>Matriz</option><option>Reprodutor</option><option>Manutenção</option><option>Experimentação</option></Select></Field>
            <Field label="Data Nascimento"><TextInput type="date" value={form.data_nascimento || ""} onChange={e => setForm({...form, data_nascimento: e.target.value})} /></Field>
            <Field label="Status Cadastral"><Select value={form.status || "Ativo"} onChange={e => setForm({...form, status: e.target.value})}><option>Ativo</option><option>Óbito</option><option>Eutanásia</option></Select></Field>
          </div>
          <Field label="Anotações Complementares"><TextArea value={form.observacoes || ""} onChange={e => setForm({...form, observacoes: e.target.value})} /></Field>
          <div className="flex gap-2"><Btn type="submit">Salvar Cadastro</Btn><Btn type="button" variant="ghost" onClick={() => { setForm(null); limparForcarEdicao(); }}>Cancelar</Btn></div>
        </form>
      )}
      <div className="grid gap-2">{animais.map(a => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => goTo(`animal-detalhe:${a.sip}`)} />)}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Módulo Atendimentos (Intervenção Clínica)
// ---------------------------------------------------------------------------
function ModuloAtendimentos({ atendimentos, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState("andamento");
  const [aberto, setAberto] = useState(null);

  const filtrados = atendimentos.filter(at => {
    const concluido = at.desfecho && at.desfecho.trim() !== "";
    return aba === "finalizados" ? concluido : !concluido;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Fichas de Intervenção Clínica</h2>
        <Btn onClick={() => setForm({
          tratamentos: [], procedimentos: [], reavaliacoes: [],
          escore_corporal: "BC3", cromo: "0"
        })}><Plus size={13} /> Nova Ficha Clínica</Btn>
      </div>

      {form && (
        <AtendimentoFormCompleto inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => {
          await saveRecord("atendimentos", d); setForm(null); showToast("Ficha gravada"); reload();
        }} />
      )}

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setAba("andamento")} className={`px-3 py-1.5 text-xs font-bold rounded ${aba === "andamento" ? "bg-[#1B3A54] text-white" : "bg-white border text-gray-500"}`}>Em Acompanhamento ({atendimentos.filter(at => !at.desfecho || at.desfecho.trim() === "").length})</button>
        <button onClick={() => setAba("finalizados")} className={`px-3 py-1.5 text-xs font-bold rounded ${aba === "finalizados" ? "bg-emerald-800 text-white" : "bg-white border text-gray-500"}`}>Desfechos Concluídos ({atendimentos.filter(at => at.desfecho && at.desfecho.trim() !== "").length})</button>
      </div>

      <div className="space-y-2">
        {filtrados.map(at => (
          <div key={at.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <button onClick={() => setAberto(aberto === at.id ? null : at.id)} className="w-full text-left flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2"><SipBadge sip={at.sip} /><span className="text-xs text-gray-400">{fmtDate(at.data)} · Responsável: {at.responsavel || "—"}</span></div>
                <p className="text-sm font-bold text-[#1B3A54] mt-1">{at.diagnostico || "Avaliação de Intercorrência"}</p>
              </div>
              <ChevronRight size={16} className={`transition-transform text-gray-400 ${aberto === at.id ? "rotate-90" : ""}`} />
            </button>

            {aberto === at.id && (
              <div className="mt-4 pt-4 border-t space-y-3 text-left">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <DetalheCampo label="Motivo do Chamado" valor={at.motivo_chamado} />
                  <DetalheCampo label="Escore ECC/BCS" valor={at.escore_corporal} />
                  <DetalheCampo label="Cromodacriorreia" valor={at.cromo ? `Grau ${at.cromo}` : "—"} />
                  <DetalheCampo label="Peso Atual" valor={at.peso ? `${at.peso}g` : "—"} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                    <span className="block font-bold uppercase text-[9px] text-gray-400 mb-1">Pele e Pelagem</span>
                    {CHECKBOXES_PELE_PELAGEM.filter(c => at[c.k]).map(c => c.label).join(", ") || "Sem alterações"}
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                    <span className="block font-bold uppercase text-[9px] text-gray-400 mb-1">Região Perineal</span>
                    {CHECKBOXES_PERINEAL.filter(c => at[c.k]).map(c => c.label).join(", ") || "Sem alterações"}
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                    <span className="block font-bold uppercase text-[9px] text-gray-400 mb-1">Estado Geral</span>
                    {CHECKBOXES_ESTADO_GERAL.filter(c => at[c.k]).map(c => c.label).join(", ") || "Sem alterações"}
                  </div>
                </div>

                <DetalheCampo label="Hipótese Diagnóstica" valor={at.diagnostico} />
                <DetalheCampo label="Conduta Adotada" valor={at.conduta_adotada} />
                <DetalheCampo label="Anotações / Descrição" valor={at.descricao_atendimento} />
                <DetalheCampo label="Desfecho / Data Fechamento" valor={at.desfecho ? `${at.desfecho} (Em ${fmtDate(at.data_desfecho)})` : null} />

                {/* Subtabelas Clínicas Blindadas Contra Travamento */}
                {Array.isArray(at.tratamentos) && at.tratamentos.length > 0 && (
                  <div className="border rounded-md overflow-hidden text-xs bg-white">
                    <div className="bg-gray-100 p-2 font-bold text-gray-600 border-b">Tratamento Instituído</div>
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50/50 border-b text-gray-400 font-bold text-[10px]"><th className="p-1.5">Data</th><th className="p-1.5">Medicamento</th><th className="p-1.5">Dose</th><th className="p-1.5">Via/Freq</th></tr></thead>
                      <tbody>{at.tratamentos.map((t, idx) => <tr key={idx} className="border-b"><td className="p-1.5">{fmtDate(t.data)}</td><td className="p-1.5">{t.med}</td><td className="p-1.5">{t.dose}</td><td className="p-1.5">{t.via}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}

                {Array.isArray(at.reavaliacoes) && at.reavaliacoes.length > 0 && (
                  <div className="border rounded-md overflow-hidden text-xs bg-white">
                    <div className="bg-gray-100 p-2 font-bold text-gray-600 border-b">Acompanhamento e Reavaliações</div>
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50/50 border-b text-gray-400 font-bold text-[10px]"><th className="p-1.5">Data</th><th className="p-1.5">Evolução Clínica</th><th className="p-1.5">Responsável</th></tr></thead>
                      <tbody>{at.reavaliacoes.map((rv, idx) => <tr key={idx} className="border-b"><td className="p-1.5">{fmtDate(rv.data)}</td><td className="p-1.5">{rv.ev}</td><td className="p-1.5">{rv.resp}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Btn variant="ghost" onClick={() => setForm(at)}><Edit3 size={12} /> Editar Ficha</Btn>
                  <Btn variant="danger" onClick={async () => { if(confirm("Remover laudo clínico definitivamente?")) { await deleteRecord("atendimentos", "id", at.id); reload(); showToast("Removido"); } }}><Trash2 size={12} /> Excluir</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AtendimentoFormCompleto({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "", motivo_chamado: "Avaliação clínica",
    escore_corporal: "BC3", cromo: "0", peso: "", diagnostico: "", conduta_adotada: "", descricao_atendimento: "",
    tratamentos: [], procedimentos: [], reavaliacoes: [], desfecho: "", data_desfecho: "", ...inicial
  });

  const [linhaTrat, setLinhaTrat] = useState({ data: "", med: "", dose: "", via: "", freq: "", duracao: "", resp: "" });
  const [linhaReav, setLinhaReav] = useState({ data: "", ev: "", param: "", cond: "manter", resp: "" });

  return (
    <div className="bg-white border rounded-lg p-5 space-y-4 text-left shadow-md">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-[#1B3A54]">Ficha de Atendimento Oficial</h3>
        <span className="text-xs text-gray-400">CB - UFRN</span>
      </div>

      <SecaoForm titulo="1. Identificação Clínica">
        <Field label="Código Matriz / SIP" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Data Intervenção"><TextInput type="date" value={f.data} onChange={e => setF({...f, data: e.target.value})} /></Field>
        <Field label="Responsável Técnico"><TextInput value={f.responsavel} onChange={e => setF({...f, responsavel: e.target.value})} /></Field>
      </SecaoForm>

      <SecaoForm titulo="2. Triagem e Escalas Físicas">
        <Field label="Motivo do Atendimento"><Select value={f.motivo_chamado} onChange={e => setF({...f, motivo_chamado: e.target.value})}><option>Avaliação clínica</option><option>Sinais de dor</option><option>Lesão / trauma</option><option>Sinais respiratórios</option><option>Emagrecimento</option><option>Sinais digestivos</option><option>Intercorrência reprodutiva</option></Select></Field>
        <Field label="Condição Corporal (BCS)"><Select value={f.escore_corporal} onChange={e => setF({...f, escore_corporal: e.target.value})}>{BCS_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</Select></Field>
        <Field label="Cromodacriorreia"><Select value={f.cromo} onChange={e => setF({...f, cromo: e.target.value})}>{CROMO_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</Select></Field>
        <Field label="Peso Corpóreo (g)"><TextInput type="number" value={f.peso} onChange={e => setF({...f, peso: e.target.value})} /></Field>
      </SecaoForm>

      <div className="space-y-3">
        <GradeCheckboxes titulo="Pele e Pelagem" lista={CHECKBOXES_PELE_PELAGEM} objetoForm={f} setObjetoForm={setF} />
        <GradeCheckboxes titulo="Região Perineal" lista={CHECKBOXES_PERINEAL} objetoForm={f} setObjetoForm={setF} />
        <GradeCheckboxes titulo="Estado Geral Orgânico" lista={CHECKBOXES_ESTADO_GERAL} objetoForm={f} setObjetoForm={setF} />
      </div>

      <div className="bg-gray-50 border rounded-lg p-3 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#4A7C7C]">3. Tabelas Dinâmicas de Tratamento e Acompanhamento</span>
        
        <div className="bg-white p-3 border rounded space-y-2">
          <span className="block text-[10px] font-bold uppercase text-gray-400">Adicionar Conduta Farmacológica</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TextInput type="date" value={linhaTrat.data} onChange={e => setLinhaTrat({...linhaTrat, data: e.target.value})} />
            <TextInput placeholder="Medicamento" value={linhaTrat.med} onChange={e => setLinhaTrat({...linhaTrat, med: e.target.value})} />
            <TextInput placeholder="Dose" value={linhaTrat.dose} onChange={e => setLinhaTrat({...linhaTrat, dose: e.target.value})} />
            <TextInput placeholder="Via / Freq" value={linhaTrat.via} onChange={e => setLinhaTrat({...linhaTrat, via: e.target.value})} />
          </div>
          <Btn type="button" variant="ghost" onClick={() => {
            if(!linhaTrat.med) return;
            const listaTrat = Array.isArray(f.tratamentos) ? f.tratamentos : [];
            setF({...f, tratamentos: [...listaTrat, linhaTrat]});
            setLinhaTrat({ data: "", med: "", dose: "", via: "", freq: "", duracao: "", resp: "" });
          }}>+ Incluir na Ficha</Btn>
        </div>

        <div className="bg-white p-3 border rounded space-y-2">
          <span className="block text-[10px] font-bold uppercase text-gray-400">Registrar Linha de Reavaliação</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <TextInput type="date" value={linhaReav.data} onChange={e => setLinhaReav({...linhaReav, data: e.target.value})} />
            <TextInput placeholder="Evolução Clínica Constatada" value={linhaReav.ev} onChange={e => setLinhaReav({...linhaReav, ev: e.target.value})} />
            <TextInput placeholder="Responsável" value={linhaReav.resp} onChange={e => setLinhaReav({...linhaReav, resp: e.target.value})} />
          </div>
          <Btn type="button" variant="ghost" onClick={() => {
            if(!linhaReav.ev) return;
            const listaReav = Array.isArray(f.reavaliacoes) ? f.reavaliacoes : [];
            setF({...f, reavaliacoes: [...listaReav, linhaReav]});
            setLinhaReav({ data: "", ev: "", param: "", cond: "manter", resp: "" });
          }}>+ Incluir Reavaliação</Btn>
        </div>
      </div>

      <SecaoForm titulo="4. Diagnósticos e Fechamento">
        <Field label="Hipótese Diagnóstica Geral"><TextArea value={f.diagnostico} onChange={e => setF({...f, diagnostico: e.target.value})} /></Field>
        <Field label="Conduta Veterinária Adotada"><TextArea value={f.conduta_adotada} onChange={e => setF({...f, conduta_adotada: e.target.value})} /></Field>
        <Field label="Anotações Complementares"><TextArea value={f.descricao_atendimento} onChange={e => setF({...f, descricao_atendimento: e.target.value})} /></Field>
      </SecaoForm>

      <SecaoForm titulo="5. Desfecho do Atendimento (Arquivamento)">
        <Field label="Opção de Desfecho Final"><Select value={f.desfecho} onChange={e => setF({...f, desfecho: e.target.value})}><option value="">Em acompanhamento...</option><option>Alta clínica</option><option>Eutanásia humanitária</option><option>Óbito natural</option><option>Retirada da reprodução</option><option>Encaminhado para necropsia</option></Select></Field>
        <Field label="Data de Fechamento do Caso"><TextInput type="date" value={f.data_desfecho} onChange={e => setF({...f, data_desfecho: e.target.value})} /></Field>
      </SecaoForm>

      <div className="flex gap-2 pt-2 border-t"><Btn type="button" onClick={() => onSalvar({ ...f, id: f.id || genId("atd") })}>Gravar Prontuário</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Voltar</Btn></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Módulo Reprodução (Prontuário das Matrizes)
// ---------------------------------------------------------------------------
function ModuloReproducao({ reproducoes, animais, reload, showToast }) {
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState("ativos");
  const [aberto, setAberto] = useState(null);

  const filtrados = reproducoes.filter(r => {
    const enc = !!r.term_data_matriz || !!r.term_data_reprodutor;
    return aba === "inativos" ? enc : !enc;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Prontuários Reprodutivos de Matrizes</h2>
        <Btn onClick={() => setForm({ ninhadas: [], monitoramentos: [], historicos_clinicos: [] })}><Plus size={13} /> Novo Acasalamento</Btn>
      </div>

      {form && (
        <ReproducaoFormCompleto inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => {
          await saveRecord("reproducao", d); setForm(null); showToast("Prontuário salvo"); reload();
        }} />
      )}

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setAba("ativos")} className={`px-3 py-1.5 text-xs font-bold rounded ${aba === "ativos" ? "bg-[#1B3A54] text-white" : "bg-white border text-gray-500"}`}>Casais em Produção Ativa ({reproducoes.filter(r => !r.term_data_matriz && !r.term_data_reprodutor).length})</button>
        <button onClick={() => setAba("inativos")} className={`px-3 py-1.5 text-xs font-bold rounded ${aba === "inativos" ? "bg-amber-800 text-white" : "bg-white border text-gray-500"}`}>Colônias Desativadas ({reproducoes.filter(r => r.term_data_matriz || r.term_data_reprodutor).length})</button>
      </div>

      <div className="space-y-2">
        {filtrados.map(r => {
          const animal = animais.find(a => a.sip === r.sip);
          const tot = totaisNinhadas(r.ninhadas);
          return (
            <div key={r.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <button onClick={() => setAberto(aberto === r.id ? null : r.id)} className="w-full text-left flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <SipBadge sip={r.sip} linhagem={animal?.linhagem} />
                    <span className="text-xs text-gray-500 font-medium">× Macho: <strong>{r.reprodutor_id || "Não Identificado"}</strong></span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{Array.isArray(r.ninhadas) ? r.ninhadas.length : 0} partos catalogados · {tot.nascidos} filhotes · {tot.desmamados} desmames</p>
                </div>
                <ChevronRight size={16} className={`transition-transform text-gray-400 ${aberto === r.id ? "rotate-90" : ""}`} />
              </button>

              {aberto === r.id && (
                <div className="mt-4 pt-4 border-t space-y-4 text-left text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded">
                    <div>
                      <span className="block font-bold text-[#4A7C7C] border-b mb-1">Genealogia Fêmea Matriz ({r.sip})</span>
                      <p>Progenitores: {r.matriz_pais || "—"} | Avós Maternos: {r.matriz_avos_m || "—"}</p>
                    </div>
                    <div>
                      <span className="block font-bold text-[#4A7C7C] border-b mb-1">Genealogia Macho Reprodutor ({r.reprodutor_id})</span>
                      <p>Progenitores: {r.rep_pais || "—"} | Avós Paternos: {r.rep_avos_p || "—"}</p>
                    </div>
                  </div>

                  {/* Tabela Reprodutiva Protegida */}
                  {Array.isArray(r.ninhadas) && r.ninhadas.length > 0 && (
                    <div className="border rounded overflow-hidden">
                      <div className="bg-gray-100 p-2 font-bold text-gray-600">Histórico Cronológico de Linhadas</div>
                      <table className="w-full text-left bg-white">
                        <thead><tr className="bg-gray-50 border-b text-gray-400 font-bold text-[10px]"><th className="p-1.5">Data Parto</th><th className="p-1.5 text-center">Nascidos</th><th className="p-1.5 text-center">Desmamados</th><th className="p-1.5">Observações</th></tr></thead>
                        <tbody>{r.ninhadas.map((n, i) => <tr key={i} className="border-b"><td className="p-1.5 font-mono">{fmtDate(n.data)}</td><td className="p-1.5 text-center text-emerald-700 font-bold">{n.n_nascidos}</td><td className="p-1.5 text-center text-blue-700 font-bold">{n.n_desmamados}</td><td className="p-1.5 text-gray-500 italic">{n.obs || "—"}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}

                  {(r.term_data_matriz || r.term_data_reprodutor) && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-amber-900">
                      <strong>Término Reprodutivo Declarado:</strong>
                      {r.term_data_matriz && <p className="mt-0.5">· Matriz encerrada em: {fmtDate(r.term_data_matriz)} | Motivo: {r.term_motivo_matriz}</p>}
                      {r.term_data_reprodutor && <p className="mt-0.5">· Reprodutor encerrado em: {fmtDate(r.term_data_reprodutor)} | Motivo: {r.term_motivo_reprodutor}</p>}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Btn variant="ghost" onClick={() => setForm(r)}><Edit3 size={12} /> Editar</Btn>
                    <Btn variant="danger" onClick={async () => { if(confirm("Excluir este prontuário reprodutivo permanente?")) { await deleteRecord("reproducao", "id", r.id); reload(); showToast("Removido"); } }}><Trash2 size={12} /> Remover Ficha</Btn>
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

function ReproducaoFormCompleto({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", reprodutor_id: "", data_acasalamento: "",
    matriz_pais: "", matriz_avos_m: "", matriz_avos_p: "",
    rep_pais: "", rep_avos_m: "", rep_avos_p: "",
    ninhadas: [], monitoramentos: [], term_data_matriz: "", term_motivo_matriz: "",
    term_data_reprodutor: "", term_motivo_reprodutor: "", ...inicial
  });

  const [linhaNinhada, setLinhaNinhada] = useState({ data: "", n_nascidos: "", n_machos: "", n_femeas: "", data_desmame: "", obs: "" });

  return (
    <div className="bg-white border rounded-lg p-5 space-y-4 text-left shadow-md">
      <h3 className="font-bold text-[#1B3A54] border-b pb-2">Prontuário de Acompanhamento Reprodutivo</h3>

      <SecaoForm titulo="1. Acasalamento Base">
        <Field label="Código Fêmea Matriz (SIP)" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.filter(a => a.sexo === "Fêmea").map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Código Macho Reprodutor"><Select value={f.reprodutor_id} onChange={e => setF({...f, reprodutor_id: e.target.value})}><option value="">Selecione…</option>{animais.filter(a => a.sexo === "Macho").map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Data do Acasalamento"><TextInput type="date" value={f.data_acasalamento} onChange={e => setF({...f, data_acasalamento: e.target.value})} /></Field>
      </SecaoForm>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded bg-gray-50/40">
        <div className="space-y-2">
          <span className="block text-xs font-bold text-gray-500 uppercase">Genealogia Rastreável da Matriz</span>
          <TextInput placeholder="Progenitores (Pais)" value={f.matriz_pais} onChange={e => setF({...f, matriz_pais: e.target.value})} />
          <TextInput placeholder="Avós Maternos" value={f.matriz_avos_m} onChange={e => setF({...f, matriz_avos_m: e.target.value})} />
        </div>
        <div className="space-y-2">
          <span className="block text-xs font-bold text-gray-500 uppercase">Genealogia Rastreável do Reprodutor</span>
          <TextInput placeholder="Progenitores (Pais)" value={f.rep_pais} onChange={e => setF({...f, rep_pais: e.target.value})} />
          <TextInput placeholder="Avós Paternos" value={f.rep_avos_p} onChange={e => setF({...f, rep_avos_p: e.target.value})} />
        </div>
      </div>

      <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#4A7C7C]">2. Histórico de Ninhadas / Partos</span>
        <div className="bg-white p-3 border rounded space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <TextInput type="date" value={linhaNinhada.data} onChange={e => setLinhaNinhada({...linhaNinhada, data: e.target.value})} />
            <TextInput type="number" placeholder="N° Nascidos" value={linhaNinhada.n_nascidos} onChange={e => setLinhaNinhada({...linhaNinhada, n_nascidos: e.target.value})} />
            <TextInput type="number" placeholder="Machos" value={linhaNinhada.n_machos} onChange={e => setLinhaNinhada({...linhaNinhada, n_machos: e.target.value})} />
            <TextInput type="number" placeholder="Fêmeas" value={linhaNinhada.n_femeas} onChange={e => setLinhaNinhada({...linhaNinhada, n_femeas: e.target.value})} />
            <TextInput placeholder="Obs / Intercorrências" value={linhaNinhada.obs} onChange={e => setLinhaNinhada({...linhaNinhada, obs: e.target.value})} />
          </div>
          <Btn type="button" variant="ghost" onClick={() => {
            if(!linhaNinhada.data) return;
            const listaNinhadas = Array.isArray(f.ninhadas) ? f.ninhadas : [];
            const desm = Number(linhaNinhada.n_machos || 0) + Number(linhaNinhada.n_femeas || 0);
            setF({...f, ninhadas: [...listaNinhadas, { ...linhaNinhada, n_desmamados: desm }]});
            setLinhaNinhada({ data: "", n_nascidos: "", n_machos: "", n_femeas: "", data_desmame: "", obs: "" });
          }}>+ Registrar Parto na Linha</Btn>
        </div>
      </div>

      <SecaoForm titulo="3. Término Reprodutivo (Inativação da Colônia)">
        <Field label="Data Descarte Matriz"><TextInput type="date" value={f.term_data_matriz} onChange={e => setF({...f, term_data_matriz: e.target.value})} /></Field>
        <Field label="Motivo Matriz"><TextInput value={f.term_motivo_matriz} onChange={e => setF({...f, term_motivo_matriz: e.target.value})} /></Field>
        <Field label="Data Descarte Reprodutor"><TextInput type="date" value={f.term_data_reprodutor} onChange={e => setF({...f, term_data_reprodutor: e.target.value})} /></Field>
        <Field label="Motivo Reprodutor"><TextInput value={f.term_motivo_reprodutor} onChange={e => setF({...f, term_motivo_reprodutor: e.target.value})} /></Field>
      </SecaoForm>

      <div className="flex gap-2 pt-2 border-t"><Btn type="button" onClick={() => onSalvar({ ...f, id: f.id || genId("rep") })}>Salvar Prontuário</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Voltar</Btn></div>
    </div>
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Laudos Anatomopatológicos de Necropsia</h2>
        <Btn onClick={() => setForm({ escore_corporal: "BC3", cromo: "0" })}><Plus size={13} /> Nova Necropsia</Btn>
      </div>

      {form && (
        <NecropsiaFormCompleto inicial={form} animais={animais} onCancelar={() => setForm(null)} onSalvar={async d => {
          await saveRecord("necropsias", d); setForm(null); showToast("Laudo arquivado"); reload();
        }} />
      )}

      <div className="space-y-2">
        {necropsias.map(ne => {
          const animal = animais.find(a => a.sip === ne.sip);
          return (
            <div key={ne.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <button onClick={() => setAberto(aberto === ne.id ? null : ne.id)} className="w-full text-left flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2"><SipBadge sip={ne.sip} linhagem={animal?.linhagem} /><span className="text-xs text-gray-400">{fmtDate(ne.data)} · Patologista: {ne.responsavel || "—"}</span></div>
                  <p className="text-sm font-bold text-gray-700 mt-1"><span className="text-gray-400 font-normal">Achado Principal:</span> {ne.diagnostico_macroscopico || "Sem observações estruturadas"}</p>
                </div>
                <ChevronRight size={16} className={`transition-transform text-gray-400 ${aberto === ne.id ? "rotate-90" : ""}`} />
              </button>

              {aberto === ne.id && (
                <div className="mt-4 pt-4 border-t space-y-3 text-left text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <DetalheCampo label="Método Eutanásia" valor={ne.metodo_eutanasia} />
                    <DetalheCampo label="Condição da Carcaça" valor={ne.condicao_carcaca} />
                    <DetalheCampo label="Grau Cromodacriorreia" valor={ne.cromo} />
                    <DetalheCampo label="Escore BCS Post-Mortem" valor={ne.escore_corporal} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4">
                    {ACHADOS_SISTEMA_NECROPSIA.map(s => (
                      <DetalheCampo key={s.k} label={s.label} valor={ne[s.k]} />
                    ))}
                  </div>

                  <DetalheCampo label="Diagnóstico Macroscópico Final" valor={ne.diagnostico_macroscopico} />
                  <DetalheCampo label="Hipótese / Diagnóstico Conclusivo" valor={ne.diagnostico_final} />

                  <div className="flex gap-2 pt-2 border-t">
                    <Btn variant="ghost" onClick={() => setForm(ne)}><Edit3 size={12} /> Editar</Btn>
                    <Btn variant="danger" onClick={async () => { if(confirm("Excluir laudo de necropsia?")) { await deleteRecord("necropsias", "id", ne.id); reload(); showToast("Laudo removido"); } }}><Trash2 size={12} /> Remover</Btn>
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

function NecropsiaFormCompleto({ inicial, animais, onSalvar, onCancelar }) {
  const [f, setF] = useState({
    sip: "", data: new Date().toISOString().slice(0, 10), responsavel: "",
    metodo_eutanasia: "Cetamina e Xilazina", condicao_carcaca: "Íntegra", motivo_necropsia: "",
    escore_corporal: "BC3", cromo: "0", ach_respiratorio: "", ach_digestorio: "", ach_urogenital: "",
    ach_cardiovascular: "", ach_nervoso: "", ach_outros: "", diagnostico_macroscopico: "", diagnostico_final: "", ...inicial
  });

  return (
    <div className="bg-white border rounded-lg p-5 space-y-4 text-left shadow-md">
      <h3 className="font-bold text-[#1B3A54] border-b pb-2">Ficha de Necropsia Estruturada</h3>

      <SecaoForm titulo="1. Metadados do Procedimento">
        <Field label="Código SIP do Animal" required><Select value={f.sip} onChange={e => setF({...f, sip: e.target.value})}><option value="">Selecione…</option>{animais.map(a => <option key={a.sip} value={a.sip}>{a.sip}</option>)}</Select></Field>
        <Field label="Data da Necropsia"><TextInput type="date" value={f.data} onChange={e => setF({...f, data: e.target.value})} /></Field>
        <Field label="Patologista Responsável"><TextInput value={f.responsavel} onChange={e => setF({...f, responsavel: e.target.value})} /></Field>
        <Field label="Método Eutanásia"><Select value={f.metodo_eutanasia} onChange={e => setF({...f, metodo_eutanasia: e.target.value})}><option>Cetamina e Xilazina</option><option>CO2</option><option>Outro</option></Select></Field>
        <Field label="Condição da Carcaça"><Select value={f.condicao_carcaca} onChange={e => setF({...f, condicao_carcaca: e.target.value})}><option>Íntegra</option><option>Autólise leve</option><option>Autólise moderada</option><option>Autólise avançada</option></Select></Field>
        <Field label="Motivo da Necropsia"><TextInput value={f.motivo_necropsia} onChange={e => setF({...f, motivo_necropsia: e.target.value})} /></Field>
      </SecaoForm>

      <SecaoForm titulo="2. Inspeção Cadavérica Externa">
        <Field label="Escore BCS Cadavérico"><Select value={f.escore_corporal} onChange={e => setF({...f, escore_corporal: e.target.value})}>{BCS_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</Select></Field>
        <Field label="Grau Cromodacriorreia"><Select value={f.cromo} onChange={e => setF({...f, cromo: e.target.value})}>{CROMO_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}</Select></Field>
      </SecaoForm>

      <div className="bg-gray-50 border rounded-lg p-3 shadow-sm">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#4A7C7C] border-b mb-2">3. Exame Interno dos Sistemas Orgânicos</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ACHADOS_SISTEMA_NECROPSIA.map(s => (
            <Field key={s.k} label={s.label}><TextArea value={f[s.k] || ""} onChange={e => setF({...f, [s.k]: e.target.value})} placeholder="Descreva as alterações encontradas..." /></Field>
          ))}
        </div>
      </div>

      <SecaoForm titulo="4. Conclusões de Laudo">
        <Field label="Achado Macroscópico Mais Importante"><TextArea value={f.diagnostico_macroscopico} onChange={e => setF({...f, diagnostico_macroscopico: e.target.value})} /></Field>
        <Field label="Diagnóstico Definitivo / Hipótese"><TextArea value={f.diagnostico_final} onChange={e => setF({...f, diagnostico_final: e.target.value})} /></Field>
      </SecaoForm>

      <div className="flex gap-2 pt-2 border-t"><Btn type="button" onClick={() => onSalvar({ ...f, id: f.id || genId("necro") })}>Arquivar Laudo</Btn><Btn type="button" variant="ghost" onClick={onCancelar}>Voltar</Btn></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perfil Consolidado (Animal Perfil)
// ---------------------------------------------------------------------------
function AnimalDetalhe({ sip, animais, atendimentos, reproducoes, voltar, onEditarAnimal, onExcluirAnimal }) {
  const animal = animais.find(a => a.sip === sip);
  if (!animal) return <p className="text-sm p-6 text-gray-400">Animal não localizado.</p>;

  const as = atendimentos.filter(a => a.sip === sip);
  const rs = reproducoes.filter(r => r.sip === sip || r.reprodutor_id === sip);

  return (
    <div className="space-y-4 text-left">
      <div className="flex justify-between items-center">
        <Btn variant="ghost" onClick={voltar} className="!px-2"><ArrowLeft size={14} /> Voltar</Btn>
        <div className="flex gap-2">
          <Btn variant="danger" onClick={() => { if(confirm(`Deseja remover o registro de ${animal.sip}?`)) onExcluirAnimal(animal.sip); }}><Trash2 size={13} /> Excluir</Btn>
          <Btn onClick={() => onEditarAnimal(animal)} className="!bg-[#4A7C7C] hover:!bg-[#3A6363]"><Edit3 size={13} /> Editar Ficha</Btn>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-3"><SipBadge sip={animal.sip} linhagem={animal.linhagem} /><span className="text-base font-bold text-[#1B3A54]">{animal.linhagem} · {animal.sexo} · {animal.especie}</span></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 text-xs text-gray-500 border-t pt-3">
          <div>Status Vitalidade: <strong className="text-gray-700">{animal.status || "Ativo"}</strong></div>
          <div>Categoria: <strong className="text-gray-700">{animal.categoria || "Manutenção"}</strong></div>
          <div>Tempo de Vida: <strong className="text-gray-700">{calcIdadeApenasMeses(animal.data_nascimento)}</strong></div>
        </div>
      </div>
    </div>
  );
}
