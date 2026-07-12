# Plataforma Biotério Central · UFRN

App próprio (fora do Claude), com banco de dados real no Supabase e hospedagem gratuita na Vercel.

Contém 4 módulos: Animais, Atendimentos, Reprodução, Necropsias — todos ligados pelo código SIP.

---

## Passo 1 — Criar o banco de dados (Supabase)

1. Acesse **supabase.com** e crie uma conta gratuita (pode usar o e-mail institucional).
2. Clique em **New Project**. Escolha um nome (ex: `bioterio-ufrn`) e uma senha de banco (guarde-a, mas não vai precisar dela no app).
3. Espere o projeto terminar de criar (leva ~2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `schema.sql` (está nesta mesma pasta), copie todo o conteúdo, cole no editor e clique em **Run**.
   - Isso cria as 4 tabelas: `animais`, `atendimentos`, `reproducao`, `necropsias`.
6. Vá em **Project Settings** (ícone de engrenagem) → **API**.
   - Copie o campo **Project URL** → você vai usar como `VITE_SUPABASE_URL`.
   - Copie o campo **anon public** (chave longa) → você vai usar como `VITE_SUPABASE_ANON_KEY`.

## Passo 2 — Colocar o código no GitHub

1. Crie uma conta gratuita em **github.com**, se ainda não tiver.
2. Crie um repositório novo (ex: `bioterio-plataforma`), pode ser privado.
3. Suba todos os arquivos desta pasta para o repositório (pelo site do GitHub mesmo: **Add file → Upload files**, arraste tudo).

## Passo 3 — Publicar (Vercel)

1. Acesse **vercel.com** e crie uma conta gratuita usando login do GitHub (mais fácil).
2. Clique em **Add New → Project** e selecione o repositório que você acabou de criar.
3. Antes de clicar em Deploy, abra **Environment Variables** e adicione duas:
   - `VITE_SUPABASE_URL` → cole a URL do Passo 1
   - `VITE_SUPABASE_ANON_KEY` → cole a chave do Passo 1
4. Clique em **Deploy**. Em ~1 minuto a Vercel gera um link tipo `bioterio-plataforma.vercel.app`.
5. Pronto — esse link é fixo, funciona pra você e pra Josy, e não depende do Claude.

## Passo 4 — Testar

1. Abra o link gerado.
2. Cadastre um animal de teste em **Animais**.
3. Feche e reabra a página — se o animal continuar lá, o banco está funcionando.

---

## Segurança — leia antes de usar com dados reais

As tabelas foram criadas **sem exigir login** (mais simples de configurar). Isso significa que qualquer pessoa com o link consegue ler e alterar os dados — não é público no Google, mas não tem senha própria.

Para uso interno de vocês duas, isso costuma ser aceitável. Se quiser adicionar **login com e-mail e senha** (só Lara e Josy entram), me avise em uma próxima conversa que eu adiciono autenticação e ajusto as permissões do banco.

## Se algo der errado

- **Build falha na Vercel**: confira se as duas variáveis de ambiente foram digitadas exatamente como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **Tela mostra "Configuração pendente"**: as variáveis de ambiente não foram configuradas ou têm erro de digitação.
- **Dados não salvam**: confira se rodou o `schema.sql` inteiro no SQL Editor do Supabase, sem erros.

Qualquer dúvida no processo, volte nessa conversa (ou mande print do erro) que eu ajudo a resolver.
