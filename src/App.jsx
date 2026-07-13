// (Mantenha todos os seus imports e constantes como estão no arquivo anterior)

// ---------------------------------------------------------------------------
// Módulo Animais (Ajustado para forçar a comunicação com o Supabase)
// ---------------------------------------------------------------------------
function ModuloAnimais({ animais, reload, showToast, goTo, forcarEdicao, limparForcarEdicao }) {
  const [form, setForm] = useState(null);
  const [abaAnimais, setAbaAnimais] = useState("ativos");

  useEffect(() => { 
    if (forcarEdicao) {
      setForm({
        ...forcarEdicao,
        origem: forcarEdicao.origem || "Biotério Central",
        responsavel_tecnico: forcarEdicao.responsavel_tecnico || "",
        protocolo_ceua: forcarEdicao.ceua_protocolo || "",
        mae_id: forcarEdicao.mae_id || "",
        pai_id: forcarEdicao.pai_id || ""
      }); 
    } 
  }, [forcarEdicao]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Mapeamento de Espécimes</h2>
        <Btn onClick={() => { setForm({ status: "Ativo", especie: "Rato", linhagem: "Wistar", categoria: "Matriz", origem: "Biotério Central" }); limparForcarEdicao(); }}><Plus size={13} /> Cadastrar Animal</Btn>
      </div>

      {form && (
        <form onSubmit={async e => {
          e.preventDefault();
          
          // Prepara o objeto com as colunas EXATAMENTE como estão na sua foto
          const payload = {
            sip: form.sip,
            especie: form.especie || "Rato",
            linhagem: form.linhagem || "Wistar",
            sexo: form.sexo || "Fêmea",
            categoria: form.categoria || "Matriz",
            data_nascimento: form.data_nascimento || null,
            origem: form.origem || "Biotério Central",
            status: form.status || "Ativo",
            
            // Colunas confirmadas nas suas fotos:
            mae_id: form.mae_id?.trim() || null,
            pai_id: form.pai_id?.trim() || null,
            responsavel_tecnico: form.responsavel_tecnico?.trim() || null,
            ceua_protocolo: form.protocolo_ceua?.trim() || null
          };

          try {
            // Usamos o .upsert() que é a forma mais robusta de salvar
            const { error } = await supabase.from("animais").upsert(payload);
            
            if (error) {
              alert("Erro ao salvar: " + error.message);
              return;
            }
            
            setForm(null); 
            limparForcarEdicao(); 
            showToast("Registro salvo com sucesso"); 
            reload();
          } catch (err) {
            alert("Erro de conexão com o banco.");
          }
        }} className="bg-white border rounded-lg p-5 space-y-4 shadow-sm text-left">
          
          {/* (Campos do formulário iguais aos anteriores) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Código SIP Identificador" required><TextInput value={form.sip || ""} onChange={e => setForm({...form, sip: e.target.value})} /></Field>
            <Field label="Espécie"><Select value={form.especie || "Rato"} onChange={e => setForm({...form, especie: e.target.value})}><option>Rato</option><option>Camundongo</option></Select></Field>
            <Field label="Linhagem"><Select value={form.linhagem || "Wistar"} onChange={e => setForm({...form, linhagem: e.target.value})}>{LINHAGENS.map(l => <option key={l}>{l}</option>)}</Select></Field>
            <Field label="Sexo Anatômico"><Select value={form.sexo || "Fêmea"} onChange={e => setForm({...form, sexo: e.target.value})}><option>Fêmea</option><option>Macho</option></Select></Field>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Código SIP da Mãe"><TextInput value={form.mae_id || ""} onChange={e => setForm({...form, mae_id: e.target.value})} /></Field>
            <Field label="Código SIP do Pai"><TextInput value={form.pai_id || ""} onChange={e => setForm({...form, pai_id: e.target.value})} /></Field>
            <Field label="Responsável Técnico"><TextInput value={form.responsavel_tecnico || ""} onChange={e => setForm({...form, responsavel_tecnico: e.target.value})} /></Field>
            <Field label="Protocolo CEUA"><TextInput value={form.protocolo_ceua || ""} onChange={e => setForm({...form, protocolo_ceua: e.target.value})} /></Field>
          </div>

          <div className="flex gap-2 pt-2 border-t"><Btn type="submit">Salvar Cadastro</Btn><Btn type="button" variant="ghost" onClick={() => { setForm(null); limparForcarEdicao(); }}>Cancelar</Btn></div>
        </form>
      )}
      
      {/* (Restante do componente igual) */}
    </div>
  );
}
// (Restante do arquivo permanece inalterado)
