-- Plataforma Biotério Central UFRN — esquema do banco de dados
-- Execute este script inteiro no SQL Editor do Supabase (Project > SQL Editor > New query)

create table if not exists animais (
  sip text primary key,
  linhagem text not null,
  sexo text not null,
  data_nascimento date,
  origem text,
  status text default 'Ativo',
  observacoes text,
  criado_em timestamptz default now()
);

create table if not exists atendimentos (
  id text primary key,
  sip text references animais(sip) on delete cascade,
  data date not null,
  responsavel text,
  anamnese text,
  exame_fisico text,
  sistemas text,
  sinais_objetivos text,
  diagnostico text,
  conduta text,
  tratamento text,
  retorno text,
  desfecho text,
  criado_em timestamptz default now()
);

create table if not exists reproducao (
  id text primary key,
  sip text references animais(sip) on delete cascade,
  sip_parceiro text,
  historico_clinico text,
  ninhadas jsonb default '[]'::jsonb,
  criado_em timestamptz default now()
);

create table if not exists necropsias (
  id text primary key,
  sip text references animais(sip) on delete cascade,
  data date not null,
  responsavel text,
  bcs text,
  cromodacriorreia text,
  achados text,
  causa_provavel text,
  destino text,
  criado_em timestamptz default now()
);

-- ATENÇÃO — SEGURANÇA:
-- Por padrão, o Row Level Security (RLS) fica DESLIGADO em tabelas novas do Supabase,
-- o que significa que qualquer pessoa com a URL do site e a chave "anon" consegue
-- ler e escrever nessas tabelas. Isso é aceitável para uso interno de equipe pequena,
-- mas o link não deve ser divulgado publicamente.
--
-- Se no futuro vocês quiserem exigir login (ex: só Lara e Josy acessam), me avise
-- que eu adiciono autenticação por e-mail/senha do Supabase Auth e políticas de RLS.
