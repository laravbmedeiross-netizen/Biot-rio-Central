import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronRight, X, Save, Home, PawPrint, Stethoscope,
  Heart, Skull, AlertTriangle, Trash2, ArrowLeft, Loader2, Check, LogOut, Edit3, Calendar
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// ---------------------------------------------------------------------------
// Constantes de Domínio Oficial (CB - UFRN)
// ---------------------------------------------------------------------------

const LINHAGENS = ["Wistar", "Swiss", "C57BL/6", "BALB/c"];
const LINHAGEM_COR = { Wistar: "#8A5A3B", Swiss: "#4A7C7C", "C57BL/6": "#3E5C8A", "BALB/c": "#7C5A94" };

const BCS_OPCOES = [
  { v: "BC1", label: "BC1 — Caquético" }, { v: "BC2", label: "BC2 — Magro" },
  { v: "BC3", label: "BC3 — Ideal" }, { v: "BC4", label: "BC4 — Sobrepeso" },
  { v: "BC5", label: "BC5 — Obeso" },
];

const CROMO_OPCOES = [
  { v: "0", label: "0 — Ausente / Sem alterações" }, { v: "1", label: "1 — Leve" },
  { v: "2", label: "2 — Moderada" }, { v: "3", size: "3 — Severa" },
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
  { k: "ach_respiratorio", label: "Sistema respiratório" }, { k: "ach_digestorio", label: "Sistema digestório" },
  { k: "ach_urogenital", label: "Sistema urogenital" }, { k: "ach_cardiovascular", label: "Sistema cardiovascular" },
  { k: "ach_nervoso", label: "Sistema nervoso" }, { k: "ach_outros", label: "Outros achados" },
];

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

function genId(prefix) { return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`; }
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
    <button onClick={onClick} className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-[#4A7C7C] transition-colors text-left shadow-sm">
      <div className="flex items-center gap-3">
        <SipBadge sip={animal.sip} linhagem={animal.linhagem} />
        <span className="text-sm font-medium text-gray-600">{animal.sexo} · {animal.linhagem} · {calcIdadeApenasMeses(animal.data_nascimento)}</span>
        {animal.categoria && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{animal.categoria}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${animal.status === "Ativo" || !animal.status ? "bg-emerald-50 text-emerald-700 font-medium" : "bg-red-50 text-red-700 font-medium"}`}>{animal.status || "Ativo"}</span>
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </button>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="block mb-2 text-left">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label} {required && <span className="text-red-600">*</span>}</span>
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
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A7C7C] border-b pb-1.5 flex items-center gap-2"><span>{titulo}</span></h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{children}</div>
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

  useEffect(() => { if (session) loadAll(); }, [loadAll, session]);

  if (!import.meta.env.VITE_SUPABASE_URL) return <div className="p-10 text-center font-mono text-red-600">Configuração ausente.</div>;
  if (session === undefined) return null;
  if (!session) return <Login onLogin={setSession} />;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  async function tratarExcluirAnimal(sip) {
    try {
      await deleteRecord("animais", "sip", sip);
      showToast("Animal removido");
      setModulo("animais");
      loadAll();
    } catch { showToast("Erro ao excluir."); }
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
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="border-b border-gray-200 bg-white px-8 py-3.5 flex items-center gap-3 shadow-sm">
          <Search size={15} className="text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisa rápida..." className="flex-1 bg-transparent outline-none text-xs text-gray-700" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {buscaLower ? (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase text-gray-400">Resultados ({resultadosBusca.length})</h2>
              {resultadosBusca.map(a => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => { setBusca(""); setModulo(`animal-detalhe:${a.sip}`); }} />)}
            </div>
          ) : (
            <>
              {modulo === "animais" && <ModuloAnimais animais={animais} reload={loadAll} showToast={showToast} goTo={setModulo} forcarEdicao={animalParaEditar} limparForcarEdicao={() => setAnimalParaEditar(null)} />}
              {/* Adicione aqui os demais módulos conforme sua necessidade */}
            </>
          )}
        </div>
      </main>
      {toast && <div className="fixed bottom-6 right-6 bg-[#1B3A54] text-white px-4 py-2.5 rounded shadow-xl z-50 text-xs font-bold flex items-center gap-2"><Check size={14} /> {toast}</div>}
    </div>
  );
}

function ModuloAnimais({ animais, reload, showToast, goTo, forcarEdicao, limparForcarEdicao }) {
  const [form, setForm] = useState(null);
  useEffect(() => { if (forcarEdicao) setForm(forcarEdicao); }, [forcarEdicao]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Mapeamento de Espécimes</h2>
        <Btn onClick={() => { setForm({ status: "Ativo", especie: "Rato", linhagem: "Wistar", categoria: "Matriz" }); limparForcarEdicao(); }}><Plus size={13} /> Cadastrar Animal</Btn>
      </div>

      {form && (
        <form onSubmit={async e => {
          e.preventDefault();
          const payload = {
            ...form,
            mae_id: form.mae_id || null,
            pai_id: form.pai_id || null,
            responsavel_tecnico: form.responsavel_tecnico || null,
            ceua_protocolo: form.ceua_protocolo || null
          };
          await saveRecord("animais", payload);
          setForm(null); limparForcarEdicao(); showToast("Salvo com sucesso!"); reload();
        }} className="bg-white border rounded-lg p-5 space-y-4 shadow-sm text-left">
          <div className="grid grid-cols-4 gap-3">
            <Field label="SIP"><TextInput value={form.sip || ""} onChange={e => setForm({...form, sip: e.target.value})} /></Field>
            <Field label="Mãe ID"><TextInput value={form.mae_id || ""} onChange={e => setForm({...form, mae_id: e.target.value})} /></Field>
            <Field label="Pai ID"><TextInput value={form.pai_id || ""} onChange={e => setForm({...form, pai_id: e.target.value})} /></Field>
            <Field label="Protocolo CEUA"><TextInput value={form.ceua_protocolo || ""} onChange={e => setForm({...form, ceua_protocolo: e.target.value})} /></Field>
          </div>
          <Btn type="submit">Salvar Cadastro</Btn>
        </form>
      )}
      <div className="grid gap-2">{animais.map(a => <CardAnimalCompacto key={a.sip} animal={a} onClick={() => goTo(`animal-detalhe:${a.sip}`)} />)}</div>
    </div>
  );
}
